import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    cep: "",
    street: "",
    number: "",
    complement: ""
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
          // Auto-login after registration
          const loginRes = await fetch("/api/user/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, password: formData.password })
          });
          if (loginRes.ok) {
            navigate("/perfil");
          } else {
            setIsRegister(false);
            setError("Cadastro realizado com sucesso! Faça login.");
          }
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

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, cep: cleanCep }));
    
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            complement: prev.complement || data.complemento
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
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
              
              <div className="grid grid-cols-1 gap-4">
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
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Endereço de Entrega</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">CEP</label>
                    <input 
                      type="text" 
                      value={formData.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                      required={isRegister}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número</label>
                    <input 
                      type="text" 
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                      required={isRegister}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome da Rua</label>
                    <input 
                      type="text" 
                      value={formData.street}
                      onChange={e => setFormData({...formData, street: e.target.value})}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                      required={isRegister}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ponto de Referência (Opcional)</label>
                    <input 
                      type="text" 
                      value={formData.complement}
                      onChange={e => setFormData({...formData, complement: e.target.value})}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isRegister && (
            <>
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
            </>
          )}

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
