import { NextResponse } from "next/server";
import {
  buildCopyPasteMock,
  getPixMockStore,
  randomId,
  type PixRecord,
} from "@/lib/pix-store-memory";
import {
  createPagouTransaction,
  extractPixCode,
  extractPixQrUrl,
} from "@/lib/pagou";
import { getSecret } from "@/lib/secrets";
import { generateValidCpf } from "@/lib/cpf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  phone: string;
  valor: number;
  description: string;
}

function isValidBody(body: unknown): body is CreateBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.phone === "string" &&
    b.phone.replace(/\D/g, "").length === 11 &&
    typeof b.valor === "number" &&
    b.valor >= 5 &&
    b.valor <= 500 &&
    typeof b.description === "string"
  );
}

function maskPhoneForDisplay(digits: string): string {
  if (digits.length !== 11) return digits;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const FIRST_NAMES = [
  "Ana", "André", "Beatriz", "Bruno", "Camila", "Carla", "Carlos", "César",
  "Daniel", "Daniela", "Diego", "Eduardo", "Elaine", "Fábio", "Felipe",
  "Fernanda", "Gabriel", "Gabriela", "Gustavo", "Henrique", "Igor", "Isabela",
  "João", "Juliana", "Kelvin", "Larissa", "Leonardo", "Letícia", "Lucas",
  "Marcos", "Mariana", "Matheus", "Natália", "Paula", "Pedro", "Rafael",
  "Rafaela", "Renato", "Ricardo", "Roberta", "Rodrigo", "Sabrina", "Sérgio",
  "Thiago", "Vanessa", "Victor", "Vinicius", "Yasmin", "Amanda", "Alexandre",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho",
  "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha",
  "Dias", "Nascimento", "Araújo", "Moreira", "Cavalcanti", "Monteiro",
  "Cardoso", "Reis", "Castro", "Pinto", "Teixeira", "Correia", "Nunes",
  "Moura", "Mendes", "Freitas", "Campos", "Batista", "Guimarães",
];

const EMAIL_DOMAINS = ["gmail.com", "icloud.com"];

function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIdentity(): { name: string; email: string } {
  const first = pick(FIRST_NAMES);
  const last1 = pick(LAST_NAMES);
  const useTwoLast = Math.random() < 0.4;
  const last2 = useTwoLast ? pick(LAST_NAMES.filter((l) => l !== last1)) : null;
  const name = last2 ? `${first} ${last1} ${last2}` : `${first} ${last1}`;

  const firstSlug = removeAccents(first).toLowerCase();
  const lastSlug = removeAccents(last1).toLowerCase();
  const sepRoll = Math.random();
  const separator = sepRoll < 0.4 ? "" : sepRoll < 0.8 ? "." : "_";
  const suffix = Math.random() < 0.65 ? String(Math.floor(Math.random() * 1000)) : "";
  const domain = pick(EMAIL_DOMAINS);
  const email = `${firstSlug}${separator}${lastSlug}${suffix}@${domain}`;

  return { name, email };
}

/**
 * Retorna a URL pública do webhook OU `undefined` se estivermos em dev
 * local. CloudFront WAF da Pagou bloqueia qualquer `postbackUrl` apontando
 * para `localhost` / `127.0.0.1` / IP privado (SSRF protection), então em
 * dev a gente confia só no polling pra atualizar o status.
 */
function getWebhookUrl(req: Request, token: string): string | undefined {
  const forced = process.env.PIX_WEBHOOK_BASE_URL;
  if (forced) return `${forced.replace(/\/+$/, "")}/api/pix/webhook?t=${token}`;
  const origin = new URL(req.url).origin;
  if (/localhost|127\.|10\.|192\.168\.|::1/i.test(origin)) {
    return undefined;
  }
  return `${origin}/api/pix/webhook?t=${token}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Payload inválido. Necessário: phone (11 dígitos), valor (5-500) e description." },
      { status: 400 }
    );
  }

  const provider = (process.env.PIX_PROVIDER ?? "pagou").toLowerCase();

  // ========== MOCK ==========
  if (provider === "mock") {
    const id = randomId();
    const createdAt = Date.now();
    const expiresAt = new Date(createdAt + 10 * 60 * 1000).toISOString();
    const base: Omit<PixRecord, "copyPaste" | "qrCode"> = {
      id,
      phone: body.phone,
      valor: body.valor,
      description: body.description,
      createdAt,
      expiresAt,
    };
    const copyPaste = buildCopyPasteMock(base);
    const record: PixRecord = { ...base, copyPaste, qrCode: copyPaste };
    getPixMockStore().set(id, record);
    return NextResponse.json({
      pixId: id,
      qrCode: copyPaste,
      copyPaste,
      expiresAt,
    });
  }

  // ========== PAGOU + SUPABASE ==========
  try {
    const amountCents = Math.round(body.valor * 100);
    const phoneDigits = body.phone.replace(/\D/g, "");
    const phoneMasked = maskPhoneForDisplay(phoneDigits);
    const expiresAtDate = new Date(Date.now() + 10 * 60 * 1000);

    const webhookToken = await getSecret("PAGOU_WEBHOOK_SECRET").catch(() => undefined);
    const postbackUrl = webhookToken ? getWebhookUrl(req, webhookToken) : undefined;

    const mockIdentity = generateIdentity();
    const pagouTx = await createPagouTransaction({
      amountCents,
      customer: {
        name: mockIdentity.name,
        email: mockIdentity.email,
        phone: phoneDigits,
        document: {
          type: "cpf",
          number: generateValidCpf(),
        },
      },
      items: [
        {
          title: "Promoção Escolhida",
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
          externalRef: `ref-${phoneDigits}`,
        },
      ],
      postbackUrl,
      expiresAt: expiresAtDate,
      externalRef: phoneDigits,
    });

    const qrCode = extractPixCode(pagouTx);
    const qrCodeUrl = extractPixQrUrl(pagouTx);
    if (!qrCode) {
      throw new Error("Pagou retornou transação sem copia-e-cola PIX.");
    }

    // Armazena em memória usando o pagou_id como chave local (id interno)
    const internalId = String(pagouTx.id);
    const { getPixMockStore } = await import("@/lib/pix-store-memory");
    getPixMockStore().set(internalId, {
      id: internalId,
      phone: phoneDigits,
      valor: body.valor,
      description: body.description,
      createdAt: Date.now(),
      expiresAt: expiresAtDate.toISOString(),
      copyPaste: qrCode,
      qrCode,
      // marcador pra o status route saber que é pagou real
      pagouId: String(pagouTx.id),
    } as any);

    return NextResponse.json({
      pixId: internalId,
      qrCode,
      copyPaste: qrCode,
      expiresAt: expiresAtDate.toISOString(),
    });
  } catch (err) {
    console.error("[api/pix/create]", err);
    return NextResponse.json(
      {
        error: "Falha ao gerar cobrança PIX",
        detail: err instanceof Error ? err.message : "erro desconhecido",
      },
      { status: 502 }
    );
  }
}
