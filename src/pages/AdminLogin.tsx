import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        navigate("/admin");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Credenciais de administrador inválidas.");
      }
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border p-8 shadow-xl bg-white">
        <div className="text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-gray-900 leading-none">Painel Administrativo</h1>
          <p className="mt-2 text-sm text-gray-500">Acesso restrito para administradores</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="text-center text-sm font-bold text-red-500">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-400 uppercase">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-4 text-sm focus:border-gray-900 focus:outline-none" 
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-400 uppercase">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-4 text-sm focus:border-gray-900 focus:outline-none" 
              required
            />
          </div>
          <button 
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Acessar Painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
