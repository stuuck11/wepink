import React from "react";
import { X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { motion } from "motion/react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, total, subtotal, discounts } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
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
        className="relative h-full w-[85%] bg-white shadow-2xl sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#FF0080]" />
              <h2 className="text-lg font-bold text-gray-900">seu carrinho</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <ShoppingCart size={64} className="text-gray-200" />
                <p className="text-gray-500">seu carrinho está vazio.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="h-24 w-24 rounded-lg object-cover" 
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-bold text-[#FF0080]">
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </span>
                          {item.old_price && (
                            <span className="text-xs text-gray-400 line-through">
                              R$ {item.old_price.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-gray-200">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-gray-500 hover:text-[#FF0080]"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-gray-500 hover:text-[#FF0080]"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="border-t p-6 space-y-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>descontos</span>
                  <span className="text-red-500">-R$ {discounts.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-[#FF0080]">
                  <span>total</span>
                  <span>R$ {total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCheckout}
                  className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  finalizar compra
                </button>
                <button 
                  onClick={onClose}
                  className="w-full text-sm font-medium text-gray-500 underline hover:text-gray-900"
                >
                  continuar comprando
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
