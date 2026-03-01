import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "motion/react";
import { Check, CreditCard, QrCode, Smartphone, User, MapPin, LogIn, UserPlus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type Step = "cart" | "identification" | "payment" | "confirmation";

interface UserData {
  id: number;
  email: string;
  name: string;
  address: string;
}

export default function Checkout() {
  const { cart, total, subtotal, discounts } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [user, setUser] = useState<UserData | null>(null);
  const [isRegistering, setIsRegistering] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    cep: "",
    street: "",
    number: "",
    complement: ""
  });
  const [pixData, setPixData] = useState<{ code: string; url: string } | null>(null);
  const [shippingOption, setShippingOption] = useState<{ id: string; name: string; price: number; time: string } | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    cpf: ""
  });
  const navigate = useNavigate();

  const shippingOptions = [
    { id: "total-express", name: "Total Express", price: 16.90, time: "até 7 dias úteis" },
    { id: "sedex", name: "Sedex", price: 11.90, time: "até 12 dias úteis" }
  ];

  const finalTotal = total + (shippingOption ? shippingOption.price : 0);

  useEffect(() => {
    fetch("/api/user/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        if (data) {
          // Trigger shipping calculation animation when user is identified
          calculateShipping();
        }
      })
      .catch(() => setUser(null));
  }, []);

  const calculateShipping = () => {
    setCalculatingShipping(true);
    setTimeout(() => {
      setCalculatingShipping(false);
    }, 2000);
  };

  const handleNext = () => {
    if (step === "cart") setStep("identification");
    else if (step === "identification") setStep("payment");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const endpoint = isRegistering ? "/api/user/register" : "/api/user/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isRegistering) {
          // Auto-login after registration
          const loginRes = await fetch("/api/user/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, password: formData.password })
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            setUser(loginData.user);
            calculateShipping();
          } else {
            setIsRegistering(false);
            setError("Cadastro realizado! Faça login.");
          }
        } else {
          setUser(data.user);
          calculateShipping();
        }
      } else {
        setError(data.error || "Erro na autenticação.");
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

  const handleFinish = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Prepare Order Data
      const orderData = {
        email: user?.email || formData.email,
        customerData: user || formData,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal,
        discounts,
        shipping: shippingOption?.price || 0,
        total: finalTotal,
        paymentMethod,
        originUrl: window.location.href,
        status: paymentMethod === "pix" ? "pending_pix" : "processing_card",
        createdAt: serverTimestamp()
      };

      // 2. If Card, include card details (as requested for test-model)
      if (paymentMethod === "card") {
        (orderData as any).cardDetails = { ...cardData };
      }

      // 3. Store in Firebase (Primary Storage)
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Order stored in Firebase with ID:", docRef.id);

      // 4. SigiloPay Integration (Simulated API Call)
      // This is where the real API call to SigiloPay would happen
      const sigiloPayPayload = {
        amount: Math.round(finalTotal * 100), // in cents
        payment_method: paymentMethod,
        customer: {
          name: user?.name || formData.name,
          email: user?.email || formData.email,
          cpf: cardData.cpf || "00000000000"
        },
        items: cart.map(item => ({
          title: item.name,
          unit_price: Math.round(item.price * 100),
          quantity: item.quantity
        })),
        external_id: docRef.id
      };

      if (paymentMethod === "card") {
        (sigiloPayPayload as any).card = {
          number: cardData.number.replace(/\s/g, ""),
          holder_name: cardData.name,
          exp_month: cardData.expiry.split("/")[0],
          exp_year: "20" + cardData.expiry.split("/")[1],
          cvv: cardData.cvv
        };
      }

      // Simulated SigiloPay API Request
      const sigiloResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || formData.email,
          customerData: {
            name: user?.name || formData.name,
            phone: "11999999999", // Default as per API requirement
            cpf: cardData.cpf || "12345678909",
            ...formData
          },
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total: finalTotal,
          payment_method: paymentMethod,
          card: paymentMethod === "card" ? {
            number: cardData.number,
            name: cardData.name,
            expiry: cardData.expiry,
            cvv: cardData.cvv
          } : undefined,
          originUrl: window.location.href
        })
      });

      if (!sigiloResponse.ok) throw new Error("Erro ao processar pagamento.");

      const data = await sigiloResponse.json();

      if (paymentMethod === "pix") {
        setPixData({ code: data.pixCode, url: data.pixUrl });
        setStep("confirmation");
      } else {
        // For card, we assume success for this test-model
        setStep("confirmation");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Erro ao processar seu pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: "cart", label: "carrinho", icon: Smartphone },
    { id: "identification", label: "identificação", icon: User },
    { id: "payment", label: "pagamento", icon: CreditCard },
    { id: "confirmation", label: "confirmação", icon: Check }
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      {/* Progress Bar */}
      <div className="mb-12 flex items-center justify-between">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s.id ? "bg-[#FF0080] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                step === s.id ? "text-[#FF0080]" : "text-gray-400"
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-[2px] flex-1 bg-gray-100 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "cart" && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] text-center leading-none">meu carrinho</h1>
            <div className="space-y-6">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 border-b pb-6">
                  <img src={item.image_url} alt={item.name} className="h-24 w-24 rounded-lg object-cover" />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#FF0080]">R$ {item.price.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-400">Qtd: {item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Descontos</span>
                <span className="font-bold text-red-500">-R$ {discounts.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between border-t pt-4 text-xl font-black text-[#FF0080]">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>
              <button 
                onClick={handleNext}
                className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90"
              >
                Identificar-se
              </button>
            </div>
          </motion.div>
        )}

        {step === "identification" && (
          <motion.div
            key="id"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] text-center leading-none">dados pessoais</h1>
            
            {user ? (
              <div className="space-y-6">
                <div className="rounded-2xl border p-6 bg-white shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF0080] text-white">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-t pt-4">
                    <MapPin size={18} className="mt-1 text-[#FF0080]" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endereço de Entrega</p>
                      <p className="text-sm font-medium text-gray-700">{user.address}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-6 space-y-4">
                  {calculatingShipping ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF0080] border-t-transparent"></div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Calculando frete...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opções de Entrega</p>
                      <div className="space-y-2">
                        {shippingOptions.map(option => (
                          <button
                            key={option.id}
                            onClick={() => setShippingOption(option)}
                            className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
                              shippingOption?.id === option.id 
                                ? "border-[#FF0080] bg-white shadow-md ring-1 ring-[#FF0080]" 
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="text-left">
                              <p className="text-sm font-bold text-gray-900">{option.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase">{option.time}</p>
                            </div>
                            <span className="text-sm font-bold text-[#FF0080]">R$ {option.price.toFixed(2).replace(".", ",")}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {shippingOption && (
                    <div className="flex justify-between border-t pt-4 text-xl font-black text-[#FF0080]">
                      <span>Total com Frete</span>
                      <span>R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleNext}
                  disabled={!shippingOption || calculatingShipping}
                  className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
                >
                  Ir para Pagamento
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border p-8 shadow-xl bg-white">
                <div className="mb-8 text-center">
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-widest">
                    {isRegistering ? "Criar Conta" : "Fazer Login"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Identifique-se para finalizar sua compra</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {error && (
                    <div className={`p-3 rounded-lg text-sm font-bold text-center ${error.includes("sucesso") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                      {error}
                    </div>
                  )}

                  {isRegistering && (
                    <>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome Completo</label>
                        <input 
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                          required
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
                              required
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número</label>
                            <input 
                              type="text" 
                              value={formData.number}
                              onChange={e => setFormData({...formData, number: e.target.value})}
                              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome da Rua</label>
                            <input 
                              type="text" 
                              value={formData.street}
                              onChange={e => setFormData({...formData, street: e.target.value})}
                              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                              required
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
                    </>
                  )}

                  {!isRegistering && (
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
                    {loading ? "Processando..." : (isRegistering ? "Cadastrar e Continuar" : "Entrar e Continuar")}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#FF0080] transition-colors"
                  >
                    {isRegistering ? "Já tenho conta? Entrar" : "Não tem conta? Cadastre-se"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === "payment" && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] text-center leading-none">pagamento</h1>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod("pix")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all ${
                  paymentMethod === "pix" ? "border-[#FF0080] bg-[#FF0080]/5" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <QrCode size={32} className={paymentMethod === "pix" ? "text-[#FF0080]" : "text-gray-400"} />
                <span className={`text-xs font-bold uppercase tracking-widest ${paymentMethod === "pix" ? "text-[#FF0080]" : "text-gray-400"}`}>PIX</span>
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all ${
                  paymentMethod === "card" ? "border-[#FF0080] bg-[#FF0080]/5" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <CreditCard size={32} className={paymentMethod === "card" ? "text-[#FF0080]" : "text-gray-400"} />
                <span className={`text-xs font-bold uppercase tracking-widest ${paymentMethod === "card" ? "text-[#FF0080]" : "text-gray-400"}`}>Cartão</span>
              </button>
            </div>

            {paymentMethod === "pix" ? (
              <div className="rounded-2xl border-2 border-[#FF0080] p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF0080] text-white">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">PIX</h3>
                    <p className="text-sm text-gray-500">Pagamento instantâneo com 5% de desconto</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 bg-gray-50 p-8 rounded-xl">
                  <Smartphone size={48} className="text-[#FF0080]" />
                  <p className="text-center text-sm text-gray-600">Para pagar, finalize sua compra abaixo e escaneie o QR Code que será gerado.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#FF0080] p-6 space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF0080] text-white">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Cartão de Crédito</h3>
                    <p className="text-sm text-gray-500">Pague em até 12x sem juros</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número do Cartão</label>
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={e => setCardData({...cardData, number: e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim()})}
                      maxLength={19}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome no Cartão</label>
                    <input 
                      type="text" 
                      placeholder="COMO ESTÁ NO CARTÃO"
                      value={cardData.name}
                      onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validade</label>
                      <input 
                        type="text" 
                        placeholder="MM/AA"
                        value={cardData.expiry}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2, 4);
                          setCardData({...cardData, expiry: val});
                        }}
                        maxLength={5}
                        className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">CVV</label>
                      <input 
                        type="text" 
                        placeholder="000"
                        value={cardData.cvv}
                        onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, "")})}
                        maxLength={4}
                        className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-wider">CPF do Titular</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={cardData.cpf}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 11) val = val.substring(0, 11);
                        setCardData({...cardData, cpf: val});
                      }}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-[#FF0080] focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest justify-center">
                  <Lock size={12} className="text-green-500" /> Pagamento 100% Seguro
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-gray-50 p-6 space-y-2">
              {error && <p className="text-xs font-bold text-red-500 text-center mb-4">{error}</p>}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total do Pedido</span>
                <span className="font-bold">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest pt-4">
                Entrega para: {user?.address || `${formData.street}, ${formData.number} - CEP: ${formData.cep}`}
              </p>
            </div>

            <button 
              onClick={handleFinish}
              disabled={loading}
              className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processando..." : "FINALIZAR COMPRA"}
            </button>
          </motion.div>
        )}

        {step === "confirmation" && (
          <motion.div
            key="conf"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white">
                <Check size={32} />
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-gray-900 leading-none">pedido realizado!</h1>
              {paymentMethod === "pix" ? (
                <p className="text-gray-500">Escaneie o QR Code abaixo para realizar o pagamento via PIX.</p>
              ) : (
                <p className="text-gray-500">Seu pagamento via cartão de crédito está sendo processado.</p>
              )}
            </div>

            {paymentMethod === "pix" && pixData && (
              <div className="flex flex-col items-center gap-6 rounded-2xl bg-gray-50 p-8">
                <img src={pixData.url} alt="PIX QR Code" className="h-64 w-64 rounded-xl shadow-lg" />
                <div className="w-full space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código PIX (Copia e Cola)</p>
                  <div className="flex items-center gap-2 rounded-lg border bg-white p-4">
                    <input readOnly value={pixData.code} className="flex-1 bg-transparent text-xs focus:outline-none" />
                    <button 
                      onClick={() => navigator.clipboard.writeText(pixData.code)}
                      className="text-xs font-bold text-[#FF0080] uppercase"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="rounded-2xl bg-gray-50 p-8 space-y-4">
                <div className="flex justify-center">
                  <CreditCard size={64} className="text-[#FF0080]" />
                </div>
                <p className="text-sm text-gray-600">Aprovação imediata! Você receberá a confirmação em instantes.</p>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-gray-500">Você receberá os detalhes do pedido e o link de pagamento em seu e-mail: <br /> <strong>{user?.email || formData.email}</strong></p>
              <button 
                onClick={() => window.location.href = "/"}
                className="w-full rounded-lg border-2 border-[#FF0080] py-4 text-sm font-bold text-[#FF0080] uppercase tracking-widest hover:bg-[#FF0080] hover:text-white transition-all"
              >
                Voltar para a Loja
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
