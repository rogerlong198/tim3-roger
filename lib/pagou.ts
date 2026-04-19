import "server-only";
import dns from "node:dns";
import https from "node:https";
import { URL } from "node:url";
import { spawn } from "node:child_process";
import { getSecret } from "./secrets";

// Força Node a preferir IPv4 na resolução DNS.
// Sem isso, em ambientes com dual-stack (Windows, alguns Linux), o fetch
// tenta IPv6 primeiro e dá ConnectTimeoutError para APIs que só servem
// IPv4 — como a Pagou/CloudFront.
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
  /* noop */
}

/**
 * Cliente HTTP simples baseado em `node:https`.
 * Evitamos `fetch` porque o Next.js dev server intercepta/patcheia o fetch
 * global e isso adiciona headers que a WAF da CloudFront (na frente da
 * API da Pagou) rejeita com 403. `https.request` é o caminho baixo-nível
 * sem mexidas.
 */
interface HttpRequestInit {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}
interface HttpResponse {
  status: number;
  text: string;
}

/**
 * Usa `https.request` nativo quando possível, mas cai pra `curl` via
 * child_process se detectar problemas (CloudFront WAF da Pagou bloqueia
 * requests originados do fetch patcheado do Next.js dev server — 403).
 */
function httpRequest(urlString: string, init: HttpRequestInit): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = init.body;
    const finalHeaders: Record<string, string> = {
      Host: url.hostname,
      Connection: "close",
      "User-Agent": "curl/8.0.1",
      ...(init.headers ?? {}),
      ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
    };
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: init.method,
        headers: finalHeaders,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      }
    );
    req.setTimeout(15000, () => {
      req.destroy(new Error("HTTP request timeout"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Fallback usando curl via child_process. Usado quando o caminho
 * nativo (https.request/fetch) é bloqueado por WAF. Requer `curl` no PATH
 * (presente no Windows 10+ e em qualquer Linux/macOS).
 */
function curlRequest(urlString: string, init: HttpRequestInit): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const args = [
      "-sS", // silent mas mostra erros
      "-4", // IPv4 apenas
      "--max-time",
      "15",
      "-X",
      init.method,
      "-o",
      "-",
      "-w",
      "\n__CURL_STATUS__:%{http_code}",
    ];
    for (const [k, v] of Object.entries(init.headers ?? {})) {
      args.push("-H", `${k}: ${v}`);
    }
    if (init.body) {
      args.push("--data-raw", init.body);
    }
    args.push(urlString);

    const proc = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => stdout.push(c));
    proc.stderr.on("data", (c: Buffer) => stderr.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        const errStr = Buffer.concat(stderr).toString();
        return reject(new Error(`curl exitou ${code}: ${errStr.slice(0, 200)}`));
      }
      const raw = Buffer.concat(stdout).toString("utf-8");
      const m = raw.match(/\n__CURL_STATUS__:(\d+)$/);
      const status = m ? parseInt(m[1], 10) : 0;
      const text = m ? raw.slice(0, raw.length - m[0].length) : raw;
      resolve({ status, text });
    });
  });
}

/**
 * Tenta primeiro https.request nativo. Se pegar 403 (provável WAF)
 * tenta via curl.
 */
async function smartRequest(urlString: string, init: HttpRequestInit): Promise<HttpResponse> {
  try {
    const resp = await httpRequest(urlString, init);
    if (resp.status !== 403) return resp;
    console.warn("[pagou] HTTP 403 no caminho nativo — fallback para curl");
  } catch (err) {
    console.warn("[pagou] erro no caminho nativo:", err instanceof Error ? err.message : err);
  }
  return curlRequest(urlString, init);
}

// ============================================================
// Tipos baseados nos docs:
// https://pagouai.readme.io/reference/objeto-transaction
// ============================================================

export type PagouStatus =
  | "processing"
  | "authorized"
  | "paid"
  | "refunded"
  | "waiting_payment"
  | "refused"
  | "chargedback"
  | "canceled"
  | "in_protest"
  | "partially_paid";

export interface PagouCustomerDocument {
  type: "cpf" | "cnpj";
  number: string;
}

export interface PagouCustomer {
  name: string;
  email: string;
  phone?: string;
  document: PagouCustomerDocument;
}

export interface PagouItem {
  title: string;
  unitPrice: number; // em centavos
  quantity: number;
  tangible: boolean;
  externalRef?: string;
}

export interface CreateTransactionInput {
  amountCents: number;
  customer: PagouCustomer;
  items: PagouItem[];
  postbackUrl?: string;
  expiresAt?: Date;
  externalRef?: string;
}

export interface PagouPixObject {
  qrCode?: string; // copia-e-cola
  qrCodeUrl?: string; // URL da imagem do QR
  expirationDate?: string;
}

export interface PagouTransaction {
  id: string | number;
  status: PagouStatus;
  amount: number | string;
  paymentMethod?: string;
  pix?: PagouPixObject;
  postbackUrl?: string;
  secureId?: string;
  secureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

// ============================================================
// Helpers
// ============================================================

async function buildAuthHeader(): Promise<string> {
  const secret = await getSecret("PAGOU_SECRET_KEY");
  const token = Buffer.from(`${secret}:x`).toString("base64");
  return `Basic ${token}`;
}

async function apiBase(): Promise<string> {
  try {
    return await getSecret("PAGOU_API_URL");
  } catch {
    return "https://api.conta.pagou.ai/v1";
  }
}

// ============================================================
// Requests
// ============================================================

export async function createPagouTransaction(
  input: CreateTransactionInput
): Promise<PagouTransaction> {
  const [auth, base] = await Promise.all([buildAuthHeader(), apiBase()]);

  const body = {
    amount: input.amountCents,
    paymentMethod: "pix" as const,
    customer: input.customer,
    items: input.items,
    postbackUrl: input.postbackUrl,
    externalRef: input.externalRef,
    pix: input.expiresAt
      ? { expiresAt: input.expiresAt.toISOString() }
      : undefined,
  };

  const resp = await smartRequest(`${base}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  let data: unknown;
  try {
    data = resp.text ? JSON.parse(resp.text) : {};
  } catch {
    data = { raw: resp.text };
  }

  if (resp.status < 200 || resp.status >= 300) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `Pagou retornou HTTP ${resp.status}`;
    console.error("[pagou] POST /transactions failed:", resp.status, JSON.stringify(data, null, 2));
    throw new Error(`${msg} (HTTP ${resp.status})`);
  }

  return data as PagouTransaction;
}

export async function getPagouTransaction(
  id: string | number
): Promise<PagouTransaction> {
  const [auth, base] = await Promise.all([buildAuthHeader(), apiBase()]);
  const resp = await smartRequest(`${base}/transactions/${id}`, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
  });

  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(
      `Pagou GET /transactions/${id} falhou: ${resp.status} ${resp.text.slice(0, 200)}`
    );
  }

  return JSON.parse(resp.text) as PagouTransaction;
}

export function normalizeStatus(
  raw: string | undefined
): "pending" | "paid" | "expired" {
  const v = (raw ?? "").toLowerCase();
  if (v === "paid" || v === "authorized" || v === "partially_paid") return "paid";
  if (v === "refused" || v === "canceled" || v === "chargedback" || v === "refunded")
    return "expired";
  return "pending";
}

/**
 * Extrai o copia-cola PIX de um retorno da Pagou.
 * A API varia um pouco os nomes entre versões, então tentamos vários.
 */
export function extractPixCode(tx: PagouTransaction): string | null {
  const pix = tx.pix as Record<string, unknown> | undefined;
  if (!pix) return null;

  const candidates = [
    pix.qrcode, // Pagou usa minúsculo no retorno real
    pix.qrCode,
    pix.qr_code,
    pix.copyPaste,
    pix.copy_paste,
    pix.emv,
    pix.payload,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 20) return c;
  }
  return null;
}

export function extractPixQrUrl(tx: PagouTransaction): string | null {
  const pix = tx.pix as Record<string, unknown> | undefined;
  if (!pix) return null;
  const candidates = [pix.qrCodeUrl, pix.qr_code_url, pix.qrUrl];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}
