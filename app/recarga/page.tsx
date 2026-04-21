"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import BonusAlertCard from "@/components/BonusAlertCard";
import PromoSideCard from "@/components/PromoSideCard";
import { useRechargeStore } from "@/lib/store";
import {
  isMobilePhone,
  maskPhone,
  onlyDigits,
  validateMobilePhoneWithReason,
} from "@/lib/phone-mask";

export default function RecargaStep1() {
  const router = useRouter();
  const { phoneFormatted, setPhone } = useRechargeStore();

  const [phone, setLocalPhone] = useState<string>(phoneFormatted ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const valid = isMobilePhone(phone);

  function handleChange(next: string) {
    setLocalPhone(next);
    if (error) setError(undefined);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const masked = maskPhone(phone);
    const { valid: ok, reason } = validateMobilePhoneWithReason(masked);
    if (!ok) {
      setError(reason ?? "Número inválido.");
      return;
    }
    setSubmitting(true);
    setPhone(masked, onlyDigits(masked));
    router.push("/recarga/valores");
  }

  return (
    <div className="bg-tim-blue-primary">
      <div className="mx-auto max-w-[1280px] px-5 pt-5 pb-12 md:px-8 md:pt-10 md:pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr_1.05fr] lg:gap-8">
          {/* ========== COLUNA ESQUERDA ========== */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="order-1 lg:order-1"
          >
            <h2 className="text-[22px] sm:text-[28px] lg:text-[34px] font-black uppercase leading-[1.05] text-white">
              Recarregando
              <br />
              aqui, você tem
              <br />
              <span className="text-tim-yellow">Bônus de Internet</span>
            </h2>

            <div className="mt-5 space-y-3">
              <BonusAlertCard
                valor="20"
                bonusGb={3}
                descricao="+ WHATSAPP ILIMITADO"
              />
              <BonusAlertCard
                valor="39,90"
                bonusGb={5}
                descricao="+ WHATSAPP + INSTAGRAM ILIMITADO"
                maisVendido
              />
            </div>

            <p className="mt-3 text-[11px] leading-[1.35] text-white/60">
              Bônus de +3GB em recargas de R$ 20, de +5GB em recargas a partir de R$ 39,90.
            </p>
          </motion.aside>

          {/* ========== COLUNA CENTRAL — FORM ========== */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="order-2 lg:order-2 -mt-1 lg:mt-0"
          >
            <form onSubmit={handleSubmit} noValidate className="w-full">
              <label
                htmlFor="phone"
                className="mb-1.5 block text-[13px] font-medium text-white"
              >
                Número TIM
              </label>
              <PhoneInput
                id="phone"
                name="phone"
                value={phone}
                onChange={handleChange}
                error={error}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "phone-error" : undefined}
                autoFocus
              />

              <button
                type="submit"
                disabled={submitting || !valid}
                className={
                  "mt-4 w-full rounded-xl px-8 py-[15px] text-[16px] font-bold transition-all duration-200 " +
                  (valid && !submitting
                    ? "bg-tim-yellow text-tim-blue-primary shadow-btn-yellow hover:bg-tim-yellow-dark hover:-translate-y-0.5"
                    : "bg-white/25 text-white/80 cursor-not-allowed")
                }
              >
                {submitting ? "Continuando..." : "Recarregar"}
              </button>
            </form>

            <div className="mt-5 flex justify-center">
              <Image
                src="/imgi_2_tim-pre-xip-promo-Ck4FnecT.png"
                alt="Promoção TIM Pré XIP 5G"
                width={480}
                height={260}
                className="h-auto w-full max-w-[420px] rounded-2xl"
              />
            </div>

            <div className="mt-6 flex flex-col items-center">
              <p className="inline-flex items-center gap-1.5 text-[13px] md:text-[14px] font-medium text-white">
                Preencha seus dados com{" "}
                <span className="font-bold">segurança</span>
                <Lock size={12} className="text-tim-yellow" strokeWidth={2.6} />
              </p>
              <p className="mt-0.5 text-[12px] md:text-[13px] text-white/80 text-center">
                Com a TIM seus dados estão totalmente{" "}
                <span className="font-bold text-white">protegidos</span>
              </p>
            </div>

            <p className="mt-5 text-center text-[11px] leading-[1.5] text-white/60">
              Aceitamos qualquer celular TIM (ou de outras operadoras). Crédito via PIX em até 30 minutos.
            </p>
          </motion.div>

          {/* ========== COLUNA DIREITA ========== */}
          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="order-3 hidden lg:block"
          >
            <PromoSideCard
              titulo="TIM PRÉ"
              chip="XIP 5G"
              copy="Recarregue no app Meu TIM e tenha WhatsApp o mês inteiro! Nas recargas a partir de R$30, você ainda recebe PIX de R$3 na conta!"
            />

            <div className="mt-6">
              <PromoSideCard
                titulo="TIM PRÉ"
                chip="XIP 5G"
                copy="Recarregue no app Meu TIM e tenha WhatsApp o mês inteiro! Nas recargas a partir de R$30, você ainda recebe PIX de R$3 na conta!"
              />
            </div>

            <div className="mt-4 flex justify-center">
              <Image
                src="/imgi_2_tim-pre-xip-promo-Ck4FnecT.png"
                alt="Duas clientes TIM comemorando recarga com WhatsApp liberado"
                width={320}
                height={336}
                className="h-auto w-full max-w-[320px] rounded-2xl"
                priority
              />
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
