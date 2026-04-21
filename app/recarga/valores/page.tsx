"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import BonusCard from "@/components/BonusCard";
import ValorCard from "@/components/ValorCard";
import { useRechargeStore } from "@/lib/store";
import { VALORES_RECARGA, VALOR_PADRAO } from "@/lib/valores";
import { createPixClient } from "@/lib/pix-api";
import { formatBrl } from "@/lib/phone-mask";

export default function RecargaStep2() {
  const router = useRouter();
  const { phone, phoneFormatted, valor, bonus, setValor, setPixData } = useRechargeStore();

  const [selected, setSelected] = useState<{ valor: number; bonus: string }>({
    valor: valor || VALOR_PADRAO.valor,
    bonus: bonus || VALOR_PADRAO.bonus,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) router.replace("/recarga");
  }, [phone, router]);

  useEffect(() => {
    setValor(selected.valor, selected.bonus);
  }, [selected, setValor]);

  const bonusValor = useMemo(
    () => VALORES_RECARGA.find((v) => v.destaque)?.valor ?? 49.9,
    []
  );

  async function handleRecarregar() {
    if (!phone) {
      router.push("/recarga");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await createPixClient({
        phone,
        valor: selected.valor,
        description: `Recarga TIM - ${formatBrl(selected.valor)} - ${phoneFormatted}`,
      });
      setPixData(data);
      router.push("/pagamento");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar PIX";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-60px)] bg-tim-blue-primary md:min-h-[calc(100vh-102px)]">
      <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-4 sm:px-6 md:pt-8 md:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <h2 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-white">
            Fazer uma recarga TIM
          </h2>

          {/* Grid topo — número + bonus semanal */}
          <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-2 md:gap-6">
            {/* Número */}
            <div>
              <label className="mb-1.5 block text-[12px] md:text-[13px] font-medium text-white/90">
                Número TIM que receberá a recarga
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-transparent bg-white px-5 py-3.5 shadow-sm sm:px-6">
                <div className="flex-1">
                  <p className="mb-0.5 text-xs font-bold text-tim-blue-primary/70 sm:text-sm">
                    Meu número TIM
                  </p>
                  <p className="mb-0.5 text-xl font-black tracking-tight text-tim-blue-primary sm:text-2xl">
                    {phoneFormatted || "(00) 00000-0000"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/recarga")}
                  className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border-none bg-tim-blue-primary/10 px-4 py-2 text-sm font-bold text-tim-blue-primary transition-colors hover:bg-tim-blue-primary/20"
                >
                  Alterar
                </button>
              </div>
            </div>

            {/* Bônus semanal */}
            <div>
              <span className="mb-1.5 block text-[12px] md:text-[13px] font-medium text-white/90">
                Valor da recarga
              </span>
              <BonusCard valor={bonusValor} />
            </div>
          </div>

          {/* Método de pagamento */}
          <div className="mt-5 md:mt-7">
            <p className="mb-2 text-[12px] md:text-[13px] font-medium text-white/90">
              Método de pagamento
            </p>
            <button
              type="button"
              className="group relative mb-3 flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 py-2 text-left ring-4 ring-emerald-500 transition-all sm:mb-4 sm:py-3"
            >
              <div className="flex flex-shrink-0 items-center gap-2 pl-1 sm:gap-3">
                <div className="flex h-[2.5rem] w-[2.5rem] shrink-0 items-center justify-center rounded-[14px] border border-zinc-200/60 bg-[#F4F4F5] shadow-sm sm:h-[2.75rem] sm:w-[2.75rem]">
                  <svg
                    className="h-6 w-6 text-[#32BCAD]"
                    viewBox="0 0 512 512"
                    fill="currentColor"
                  >
                    <path d="M382.56 349.37c-16.89 0-32.78-6.58-44.74-18.53l-71.9-71.9a15.06 15.06 0 0 0-20.57 0l-72.29 72.29c-11.96 11.96-27.85 18.54-44.74 18.54h-11.44l91.43 91.43c24.65 24.65 64.61 24.65 89.26 0l91.82-91.82h-6.83z" />
                    <path d="M128.32 162.24c16.89 0 32.78 6.58 44.74 18.54l72.29 72.29a14.56 14.56 0 0 0 20.57 0l71.9-71.9c11.96-11.96 27.85-18.54 44.74-18.54h6.83l-91.82-91.82c-24.65-24.65-64.61-24.65-89.26 0l-91.43 91.43h11.44z" />
                    <path d="M440.87 208.57l-46.26-46.26c-1.65 1.1-3.47 1.86-5.43 1.86h-6.83c-12.63 0-24.51 4.92-33.44 13.85l-71.9 71.9c-7.95 7.95-18.4 11.92-28.85 11.92s-20.9-3.97-28.85-11.92l-72.29-72.29c-8.93-8.93-20.81-13.85-33.44-13.85h-11.44c-1.96 0-3.78-.76-5.43-1.86l-46.65 46.65c-24.65 24.65-24.65 64.61 0 89.26l46.65 46.65c1.65-1.1 3.47-1.86 5.43-1.86h11.44c12.63 0 24.51-4.92 33.44-13.85l72.29-72.29c15.9-15.9 41.8-15.9 57.7 0l71.9 71.9c8.93 8.93 20.81 13.85 33.44 13.85h6.83c1.96 0 3.78.76 5.43 1.86l46.26-46.26c24.65-24.65 24.65-64.61 0-89.26z" />
                  </svg>
                </div>
                <span className="text-[20px] font-extrabold text-tim-blue-primary sm:text-[22px]">
                  Pix
                </span>
              </div>
              <div className="flex h-[3.5rem] w-full max-w-[190px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-tim-blue-primary/20 bg-tim-blue-primary/5 px-2 py-1.5 shadow-sm sm:h-[4rem] sm:max-w-[220px] sm:gap-2 sm:px-3 sm:py-2">
                <div className="flex flex-shrink-0 items-center justify-center rounded border border-zinc-200/80 bg-white px-1 py-0.5 shadow-sm shadow-zinc-200/50 sm:px-1.5">
                  <span className="text-[12px] font-black tracking-tighter text-black sm:text-[13px]">
                    C6
                  </span>
                  <span className="ml-[1px] text-[12px] font-light tracking-[0.05em] text-black sm:text-[13px]">
                    BANK
                  </span>
                </div>
                <p className="text-[10px] font-bold leading-tight text-blue-900 sm:text-[10.5px]">
                  <span className="text-[#FF0000]">🎁</span> Ganhe +500MB grátis pagando com C6 Bank
                </p>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            </button>
          </div>

          {/* Grid 3x3 de valores — 3 cols até no mobile (match Image #4) */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3 md:mt-7 md:gap-4">
            {VALORES_RECARGA.map((v) => {
              const isSelected =
                selected.valor === v.valor && selected.bonus === v.bonus;
              return (
                <ValorCard
                  key={v.valor}
                  valor={v.valor}
                  bonus={v.bonus}
                  destaque={v.destaque}
                  selected={isSelected}
                  onClick={() => setSelected({ valor: v.valor, bonus: v.bonus })}
                />
              );
            })}
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-lg bg-red-100 p-3.5 text-sm text-red-900">
              {error}
            </div>
          )}

          <div className="mt-6 md:mt-8">
            <button
              type="button"
              onClick={handleRecarregar}
              disabled={submitting}
              className="w-full rounded-xl bg-tim-yellow px-6 py-[14px] text-[15px] font-bold text-[#0B0F19] shadow-btn-yellow transition-all duration-200 hover:bg-tim-yellow-dark hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 md:ml-auto md:w-auto md:min-w-[260px] md:text-[16px]"
            >
              {submitting ? "Gerando PIX..." : `Recarregar`}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
