import React from "react";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function FloatingAdminButton() {
  return (
    <Link 
      to="/admin-login" 
      className="fixed bottom-24 right-6 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg hover:scale-110 transition-transform sm:bottom-8 sm:right-8"
      title="Acesso Administrador"
    >
      <ShieldCheck size={24} />
    </Link>
  );
}
