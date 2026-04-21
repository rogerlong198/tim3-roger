import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#0a1437] text-white">
      <div className="mx-auto max-w-[1280px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" aria-label="Início">
              <Image
                src="/imgi_1_size_960_16_9_tim-logotipo8-removebg-preview.png"
                alt="TIM Recarga"
                width={160}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-[260px] text-sm text-white/70 leading-6">
              Recarregue seu celular TIM com segurança e rapidez usando PIX. Crédito em até 30 minutos.
            </p>
          </div>

          <FooterCol
            title="Para você"
            links={[
              { label: "Planos TIM Pré", href: "#" },
              { label: "Bônus semanal", href: "#" },
              { label: "App Meu TIM", href: "#" },
              { label: "TIM Vivas", href: "#" },
            ]}
          />

          <FooterCol
            title="Ajuda"
            links={[
              { label: "Central de atendimento", href: "#" },
              { label: "Como recarregar", href: "#" },
              { label: "Política de privacidade", href: "#" },
              { label: "Termos de uso", href: "#" },
            ]}
          />

          <FooterCol
            title="Institucional"
            links={[
              { label: "Sobre a TIM", href: "#" },
              { label: "Para operadoras", href: "#" },
              { label: "Imprensa", href: "#" },
              { label: "Trabalhe conosco", href: "#" },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-white/60 leading-relaxed">
            © TIM S/A. Todos os direitos reservados. CNPJ: 02.421.421/0001-11 - Insc. Municipal: 0261388-3 - Insc. Estadual: 86.092.08-5
            <br />
            Av Joao Cabral de Mello Neto, 850 - Bl 01 - Salas 501 a 1208. Barra da Tijuca - Rio de Janeiro - RJ - CEP: 22775-057
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="mb-4 text-[13px] font-bold uppercase tracking-widest2 text-white">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
