import React, { useState, useEffect } from "react";
import Carousel from "../components/Carousel";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price?: number;
  image_url: string;
}

export default function Home() {
  const [queridinhos, setQueridinhos] = useState<Product[]>([]);
  const [destaque, setDestaque] = useState<Product | null>(null);
  const [maisVendidos, setMaisVendidos] = useState<Product[]>([]);
  const [socialImages, setSocialImages] = useState<string[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    fetch("/api/products?type=queridinho").then(res => res.json()).then(setQueridinhos);
    fetch("/api/products?type=destaque").then(res => res.json()).then(data => setDestaque(data[0] || null));
    fetch("/api/products?type=mais_vendido").then(res => res.json()).then(setMaisVendidos);
    
    // Mock social images
    setSocialImages(Array.from({ length: 10 }, (_, i) => `https://picsum.photos/seed/social${i}/400/400`));
  }, []);

  return (
    <div className="flex flex-col gap-12 pb-20">
      <Carousel />

      {/* Queridinhos */}
      <section className="px-4 sm:px-8">
        <div className="mb-8 flex flex-col items-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] text-center max-w-[280px] leading-none">
            queridinhos da wepink
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar sm:gap-6">
          {queridinhos.length > 0 ? queridinhos.map(product => (
            <div key={product.id} className="min-w-[240px] max-w-[240px] sm:min-w-[280px]">
              <ProductCard product={product} />
            </div>
          )) : (
            <p className="w-full text-center text-gray-400">Nenhum produto em destaque.</p>
          )}
        </div>
      </section>

      {/* Destaque do Mês */}
      {destaque && (
        <section className="flex flex-col">
          <div className="relative aspect-square w-full sm:aspect-video">
            <img src={destaque.image_url} alt="Destaque" className="h-full w-full object-cover" />
          </div>
          <div className="bg-[#FF0080] p-8 text-white sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest opacity-80">#destaque do mês</span>
              <h2 className="mb-4 font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight leading-none">{destaque.name}</h2>
              <p className="mb-6 text-sm opacity-90 sm:text-base">{destaque.description}</p>
              <div className="mb-8 text-2xl font-black">
                R$ {destaque.price.toFixed(2).replace(".", ",")}
              </div>
              <button 
                onClick={() => addToCart(destaque)}
                className="inline-block rounded-lg border-2 border-white px-12 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-[#FF0080]"
              >
                eu quero!
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Mais Vendidos */}
      <section className="px-4 sm:px-8">
        <div className="mb-10 flex flex-col items-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-[#FF0080] text-center max-w-[280px] leading-none">
            os mais vendidos
          </h2>
        </div>
        <div className="flex flex-col gap-8 sm:mx-auto sm:max-w-md">
          {maisVendidos.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-[#FF0080] px-6 py-16 text-white sm:px-12 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-8 text-xl font-bold leading-tight sm:text-2xl">
            receba dicas e novidades exclusivas! <br /> cadastre-se aqui 💖 👇
          </h2>
          <form className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Nome *" 
              className="rounded-full border-none bg-white px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white" 
              required
            />
            <input 
              type="tel" 
              placeholder="(11) 91111-1111 *" 
              className="rounded-full border-none bg-white px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white" 
              required
            />
            <input 
              type="email" 
              placeholder="Email *" 
              className="rounded-full border-none bg-white px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white" 
              required
            />
            <button className="mt-2 rounded-full border-2 border-white py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-[#FF0080]">
              Enviar
            </button>
          </form>
        </div>
      </section>

      {/* Social Feed */}
      <section className="px-4 sm:px-8">
        <div className="mb-10 flex flex-col items-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold lowercase tracking-tight text-[#FF0080] text-center leading-none">
            siga @wepink.br
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {socialImages.map((img, i) => (
            <div key={i} className="min-w-[120px] max-w-[120px] overflow-hidden rounded-lg sm:min-w-[180px]">
              <img src={img} alt={`Social ${i}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
