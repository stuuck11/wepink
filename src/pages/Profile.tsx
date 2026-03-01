import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Mail, LogOut, Package } from "lucide-react";

interface UserData {
  id: number;
  email: string;
  name: string;
  address: string;
}

export default function Profile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/user/me")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Não autenticado");
      })
      .then(setUser)
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("/api/user/logout", { method: "POST" });
    navigate("/login");
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] leading-none">minha conta</h1>
        <p className="mt-2 text-sm text-gray-500">Bem-vindo(a) de volta, {user.name.split(" ")[0]}!</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl border p-8 shadow-sm bg-white">
          <div className="flex items-center gap-6 mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FF0080] text-white">
              <User size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-1 text-[#FF0080]" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail</p>
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-1 text-[#FF0080]" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço de Entrega</p>
                <p className="text-sm font-medium text-gray-700">{user.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button className="flex items-center justify-between rounded-xl border p-6 hover:border-[#FF0080] transition-colors group">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-gray-400 group-hover:text-[#FF0080]" />
              <span className="text-sm font-bold uppercase tracking-widest text-gray-700">Meus Pedidos</span>
            </div>
            <span className="text-xs font-bold text-[#FF0080]">0</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl border p-6 hover:bg-red-50 hover:border-red-200 transition-colors group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-700 group-hover:text-red-600">Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
