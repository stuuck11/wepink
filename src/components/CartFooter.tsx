import React from "react";
import { useCart } from "../context/CartContext";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";

export default function CartFooter() {
  const { cart, total } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isCheckout = location.pathname === "/checkout";
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (cartCount === 0 || isCheckout) return null;

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-[40] bg-[#FF0080] px-4 py-4 text-white shadow-[0_-4px_20px_rgba(255,0,128,0.3)] sm:px-8"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#FF0080]">
              {cartCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total do carrinho</span>
            <span className="text-lg font-black">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate("/checkout")}
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-black text-[#FF0080] uppercase tracking-widest hover:bg-gray-100 transition-colors"
        >
          IR PARA PAGAMENTO <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
