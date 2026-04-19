"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative bg-tim-blue-primary overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-tim-blue-light opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-tim-blue-light opacity-20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-6 py-20 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="md:pl-[8%]"
          >
            <span className="inline-block text-[13px] font-semibold uppercase tracking-widest2 text-white/75">
              Recarga TIM
            </span>
            <h1 className="mt-6 max-w-[560px] text-white font-black leading-[1.05]" style={{ fontSize: "clamp(40px, 5.5vw, 68px)" }}>
              Conheça os benefícios dos canais de recarga TIM
            </h1>
            <div className="mt-10">
              <button
                type="button"
                onClick={() => router.push("/recarga")}
                className="group inline-flex items-center gap-2 rounded-full border-2 border-white px-10 py-4 text-base font-bold text-white transition-all duration-200 hover:bg-white hover:text-tim-blue-primary hover:shadow-xl"
              >
                Recarregar meu TIM
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="flex justify-center md:justify-end"
          >
            <div className="relative w-full max-w-[500px]">
              <div className="animate-float">
                <Image
                  src="/mulher-real.png"
                  alt="Mulher segurando celular comemorando recarga"
                  width={500}
                  height={583}
                  priority
                  className="h-auto w-full"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
