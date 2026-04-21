"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TOPBAR_LINKS = [
  { label: "Para você", href: "/" },
  { label: "Para empresas", href: "#empresas" },
  { label: "Para operadoras", href: "#operadoras" },
  { label: "Quero aderir", href: "#aderir" },
];

const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Recarga", href: "/recarga" },
  { label: "Sobre a TIM", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveNav = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Top bar (32px) — escondida no mobile */}
      <div className="hidden md:block bg-tim-blue-topbar">
        <div className="mx-auto h-8 max-w-[1280px] px-6">
          <nav className="flex h-full items-center">
            <ul className="flex items-center gap-0 pl-[22%] max-md:pl-2">
              {TOPBAR_LINKS.map((link, idx) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative inline-flex items-center px-3 text-[13px] text-white transition-opacity hover:opacity-80",
                      idx === 0 && "font-bold after:absolute after:bottom-[-6px] after:left-3 after:right-3 after:h-[2px] after:bg-white"
                    )}
                    style={{ fontWeight: idx === 0 ? 700 : 500 }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Header principal (60px mobile / 70px desktop) */}
      <div className="bg-tim-blue-primary">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 md:h-[70px] md:px-6">
          <Link href="/" aria-label="Ir para início" className="flex items-center gap-2">
            {/* Mobile: icon + TIM | Desktop: logo completo */}
            <span className="flex items-center md:hidden">
              <Image
                src="/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png"
                alt="TIM"
                width={134}
                height={60}
                priority
                className="h-[60px] w-auto"
              />
            </span>
            <Image
              src="/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png"
              alt="TIM"
              width={168}
              height={67}
              priority
              className="hidden md:block h-[67px] w-auto"
            />
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              aria-label="Minha conta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <User size={22} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              className="inline-flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-white transition-colors hover:bg-white/10"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} strokeWidth={2.2} /> : <Menu size={22} strokeWidth={2.2} />}
              <span className="text-[11px] font-medium leading-none">Menu</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-tim-blue-primary">
            <div className="mx-auto max-w-[1280px] px-6 py-4">
              <ul className="flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-lg px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10",
                        isActiveNav(link.href) && "bg-white/10"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
