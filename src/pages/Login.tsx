import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    address: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/user/register" : "/api/user/login";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (isRegister) {
          setIsRegister(false);
          setError("Cadastro realizado com sucesso! Faça login.");
        } else {
          navigate("/perfil");
        }
      } else {
        setError(data.error || "Ocorreu um erro.");
      }
    } catch (err) {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border p-8 shadow-xl bg-white">
        <div className="text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] leading-none">
            {isRegister ? "criar conta" : "minha conta"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isRegister ? "Preencha os dados abaixo para se cadastrar" : "Entre com seu e-mail e senha"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 rounded-lg text-sm font-bold text-center ${error.includes("sucesso") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {error}
            </div>
          )}

          {isRegister && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                  required={isRegister}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço Completo</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Senha</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Processando..." : (isRegister ? "Cadastrar" : "Entrar")}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#FF0080] transition-colors"
          >
            {isRegister ? "Já tenho conta? Fazer Login" : "Não tem conta? Cadastre-se"}
          </button>
        </div>
      </div>
    </div>
  );
}
