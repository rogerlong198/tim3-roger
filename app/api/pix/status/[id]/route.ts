import { NextResponse } from "next/server";
import { getPixMockStore } from "@/lib/pix-store-memory";
import { getPagouTransaction, normalizeStatus } from "@/lib/pagou";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAID_AFTER_MS = 180_000;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const provider = (process.env.PIX_PROVIDER ?? "pagou").toLowerCase();

  // ========== MOCK ==========
  if (provider === "mock") {
    const store = getPixMockStore();
    const record = store.get(id);
    if (!record) return NextResponse.json({ status: "expired" });
    const now = Date.now();
    if (now > new Date(record.expiresAt).getTime()) {
      return NextResponse.json({ status: "expired" });
    }
    const paidAfter = Number(process.env.PIX_MOCK_PAID_AFTER_MS) || DEFAULT_PAID_AFTER_MS;
    if (record.paidAt || now - record.createdAt >= paidAfter) {
      record.paidAt ??= now;
      return NextResponse.json({ status: "paid" });
    }
    return NextResponse.json({ status: "pending" });
  }

  // ========== PAGOU + MEMORY STORE ==========
  const store = getPixMockStore();
  const record = store.get(id) as
    | { pagouId?: string; expiresAt: string; paidAt?: number }
    | undefined;

  const pagouId = record?.pagouId ?? id;
  const alreadyPaid = Boolean(record?.paidAt);

  if (alreadyPaid) {
    return NextResponse.json({ status: "paid" });
  }

  // 3) Consulta a Pagou
  try {
    const tx = await getPagouTransaction(pagouId);
    const normalized = normalizeStatus(tx.status);

    if (normalized === "paid") {
      if (record) record.paidAt = Date.now();
      return NextResponse.json({ status: "paid" });
    }

    if (normalized === "expired") {
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json({ status: "pending" });
  } catch (err) {
    console.error("[api/pix/status] erro Pagou:", err);
    return NextResponse.json({ status: "pending" });
  }
}
