import React, { useState, useEffect } from "react";
import { X, Search, ChevronRight, User, RefreshCw, MapPin, Package, Gift, Sparkles, FlaskConical, Heart, Smile, Droplets, Flower2 } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("kits")) return Gift;
  if (n.includes("bath") || n.includes("splash") || n.includes("cream") || n.includes("oil") || n.includes("roll-on")) return Sparkles;
  if (n.includes("perfumaria")) return FlaskConical;
  if (n.includes("skincare")) return Heart;
  if (n.includes("make")) return Smile;
  if (n.includes("hair")) return Droplets;
  if (n.includes("bem-estar")) return Flower2;
  return Sparkles;
};

export default function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    if (search.trim()) {
      setSearching(true);
      const timer = setTimeout(() => {
        fetch(`/api/products?search=${search}&limit=10`)
          .then(res => res.json())
          .then(data => {
            setProducts(data);
            setSearching(false);
          })
          .catch(() => setSearching(false));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProducts([]);
      setSearching(false);
    }
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative h-full w-[95%] bg-white shadow-2xl sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#FF0080] p-4">
            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto brightness-0 invert" />
            <button onClick={onClose} className="p-2 text-white hover:opacity-70">
              <X size={24} />
            </button>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-4 gap-2 bg-[#FF0080] px-4 pb-6 pt-2">
            {[
              { icon: User, label: "Minha conta", to: "/perfil" },
              { icon: RefreshCw, label: "Trocar e devolver", to: "/trocas" },
              { icon: Package, label: "Rastreio", to: "/rastreio" },
              { icon: MapPin, label: "Nossas lojas", to: "/lojas" }
            ].map((item, i) => (
              <Link 
                key={i} 
                to={item.to} 
                onClick={onClose}
                className="flex flex-col items-center gap-1 text-center text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30">
                  <item.icon size={18} />
                </div>
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="p-4">
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder="digite aqui o que procura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:border-[#FF0080] focus:outline-none"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </form>
          </div>

          {/* Categories / Search Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="mb-4 flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {search.trim() ? "produtos encontrados" : "categorias"}
              </span>
              {!search.trim() && (
                <Link to="/produtos" onClick={onClose} className="text-xs text-gray-500 underline">Ver todos os produtos</Link>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {search.trim() ? (
                searching ? (
                  <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Buscando produtos...</div>
                ) : products.length > 0 ? (
                  products.map(product => (
                    <Link 
                      key={product.id} 
                      to={`/produto/${product.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 py-4 text-gray-800 hover:text-[#FF0080]"
                    >
                      <img src={product.image_url} className="h-12 w-12 rounded-lg object-cover border border-gray-100" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold line-clamp-1">{product.name}</span>
                        <span className="text-xs text-[#FF0080] font-black">R$ {product.price.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-gray-300" />
                    </Link>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400">Nenhum produto encontrado.</div>
                )
              ) : (
                categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.name);
                  return (
                    <Link 
                      key={cat.id} 
                      to={`/categoria/${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between py-4 text-gray-800 hover:text-[#FF0080]"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className="text-[#FF0080]" />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
