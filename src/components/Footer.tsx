import React from "react";
import { Instagram, Facebook, Youtube, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Footer() {
  const { settings } = useSettings();

  const footerLinks = [
    { label: "sobre nós", to: "/sobre" },
    { label: "central de ajuda", to: "/ajuda" },
    { label: "solicitação de troca", to: "/troca" },
    { label: "solicitação de devolução", to: "/devolucao" },
    { label: "canais de atendimento", to: "/atendimento" },
    { label: "regulamentos", to: "/regulamentos" },
    { label: "trabalhe conosco", to: "/trabalhe-conosco" },
    { label: "cadê meu pedido", to: "/rastreio" },
    { label: "franquias", to: "/franquias" },
    { label: "nossas lojas", to: "/lojas" },
    { label: "TAC", to: "/tac" },
    { label: "SAVI", to: "/savi" }
  ];

  return (
    <footer className="bg-[#FF0080] px-6 py-12 text-white sm:px-12 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <Link to="/home">
            <img 
              src={settings.logo_url} 
              alt="Logo" 
              className="mb-8 h-10 w-auto brightness-0 invert" 
              referrerPolicy="no-referrer"
            />
          </Link>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {footerLinks.map((link, i) => (
              <Link 
                key={i} 
                to={link.to} 
                className="flex items-center gap-2 text-sm font-medium hover:opacity-70"
              >
                {link.label} <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-8 border-t border-white/20 pt-12 sm:flex-row">
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-70"><Instagram size={28} /></a>
            <a href="#" className="hover:opacity-70"><Facebook size={28} /></a>
            <a href="#" className="hover:opacity-70"><Youtube size={28} /></a>
          </div>
          <div className="text-center text-[10px] opacity-70 sm:text-right">
            <p>© 2026 Wepink. Todos os direitos reservados.</p>
            <p>CNPJ: 00.000.000/0000-00 | Endereço: Rua Exemplo, 123 - São Paulo/SP</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
