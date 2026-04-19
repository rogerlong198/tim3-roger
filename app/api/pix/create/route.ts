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

    const webhookToken = await getSecret("PAGOU_WEBHOOK_SECRET");
    const postbackUrl = getWebhookUrl(req, webhookToken);

    // Customer "genérico" — recarga anônima, usamos só o telefone
    const pagouTx = await createPagouTransaction({
      amountCents,
      customer: {
        name: "Cliente Recarga TIM",
        email: `recarga+${phoneDigits}@tim.recarga`,
        phone: phoneDigits,
        document: {
          // Recarga anônima: a Pagou exige CPF válido, então geramos um
          // passando no dígito verificador (o cliente não precisa informar).
          // Para coletar CPF real no futuro, substitua por um campo do form.
          type: "cpf",
          number: generateValidCpf(),
        },
      },
      items: [
        {
          title: `Recarga TIM R$ ${body.valor.toFixed(2).replace(".", ",")}`,
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
          externalRef: `recarga-${phoneDigits}`,
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
