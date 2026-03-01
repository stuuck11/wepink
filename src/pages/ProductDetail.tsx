import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ChevronLeft, ShoppingCart, Plus, Minus, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price?: number;
  image_url: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  image_url_5?: string;
  category_name: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/products`)
      .then(res => res.json())
      .then(data => {
        const found = data.find((p: any) => p.id === parseInt(id || "0"));
        setProduct(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-96 items-center justify-center">Carregando...</div>;
  if (!product) return <div className="flex h-96 items-center justify-center">Produto não encontrado.</div>;

  const images = [
    product.image_url,
    product.image_url_2,
    product.image_url_3,
    product.image_url_4,
    product.image_url_5
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600"
      >
        <ChevronLeft size={18} /> Voltar
      </button>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Image Slider */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100">
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImageIndex}
                src={images[currentImageIndex]} 
                alt={product.name} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full object-cover" 
              />
            </AnimatePresence>
            
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      currentImageIndex === i ? "w-6 bg-[#FF0080]" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    currentImageIndex === i ? "border-[#FF0080]" : "border-transparent opacity-60"
                  }`}
                >
                  <img src={img} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <span className="mb-2 text-xs font-bold uppercase tracking-widest text-[#FF0080]">
            {product.category_name}
          </span>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>
          <p className="mb-8 text-base text-gray-500 leading-relaxed">{product.description}</p>

          <div className="mb-8 flex flex-col">
            {product.old_price && (
              <span className="text-sm text-gray-400 line-through">
                R$ {product.old_price.toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-3xl font-black text-gray-900">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-4 text-gray-400 hover:text-gray-600"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center font-bold">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="p-4 text-gray-400 hover:text-gray-600"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              for(let i=0; i<quantity; i++) addToCart(product);
              navigate("/checkout");
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FF0080] py-5 text-sm font-black text-white uppercase tracking-widest shadow-lg shadow-[#FF0080]/20 hover:opacity-90"
          >
            <ShoppingCart size={20} /> Comprar Agora
          </button>

          {/* Store Rating Section */}
          <div className="mt-12 flex flex-col items-center border-t border-gray-100 pt-12 text-center">
            <p className="mb-4 max-w-[280px] text-[13px] font-medium leading-tight text-gray-600">
              Enquanto este produto aguarda avaliações, aproveite para conferir <span className="font-bold text-gray-900">a nota da loja:</span>
            </p>
            
            <h3 className="mb-6 text-xl font-black text-gray-900">Wepink</h3>
            
            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-5xl font-black text-gray-900 tracking-tighter">4.6</span>
              <span className="text-xl font-bold text-gray-400">/ 5</span>
            </div>
            
            <div className="mb-8 flex flex-col items-center gap-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`h-5 w-5 ${star <= 4 ? "text-[#F5A623] fill-[#F5A623]" : "text-[#F5A623] fill-[#F5A623] opacity-80"}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs font-bold text-gray-400">(8558)</span>
            </div>
            
            <div className="mb-10 w-full max-w-[320px] space-y-2">
              {[
                { star: 5, percent: "80%" },
                { star: 4, percent: "12%" },
                { star: 3, percent: "4%" },
                { star: 2, percent: "2%" },
                { star: 1, percent: "2%" }
              ].map((row) => (
                <div key={row.star} className="flex items-center gap-3">
                  <span className="w-4 text-[11px] font-bold text-gray-900">{row.star}★</span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-[#F5A623]" style={{ width: row.percent }}></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <p className="text-[11px] font-medium text-gray-400">
                Com base em avaliações dos últimos 6 meses.
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium text-gray-400">
                  Avaliações confiáveis do
                </p>
                <img 
                  src="https://site.trustvox.com.br/_next/image?url=https%3A%2F%2Fstorage.googleapis.com%2Fsite-trustvox%2Freclame_aqui_2_d30cc52c8c%2Freclame_aqui_2_d30cc52c8c.png&w=256&q=75" 
                  alt="Reclame Aqui" 
                  className="h-5 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
