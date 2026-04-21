import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TIM Recarga — Recarregue seu celular com PIX em até 30 minutos",
  description:
    "Recarregue seu celular TIM com PIX de forma rápida e segura. Bônus semanal de até 50GB. Crédito em até 30 minutos para qualquer DDD.",
  keywords: ["recarga tim", "recarregar tim", "recarga celular", "pix tim", "bônus tim"],
  icons: {
    icon: [{ url: "/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png", type: "image/png" }],
    apple: "/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png",
  },
  openGraph: {
    title: "TIM Recarga — PIX em até 30 minutos",
    description: "Recarregue seu celular TIM com PIX e ganhe GB extras. Sem cadastro.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0029FF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17766226464"
          strategy="afterInteractive"
        />
        <Script id="google-ads-base" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17766226464');
          `}
        </Script>
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          strategy="afterInteractive"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
        />
        <Script id="utmify-pixel-google" strategy="afterInteractive">
          {`
            window.googlePixelId = "69e6c9e0e27a5e27ed403026";
            var a = document.createElement("script");
            a.setAttribute("async", "");
            a.setAttribute("defer", "");
            a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel-google.js");
            document.head.appendChild(a);
          `}
        </Script>
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
