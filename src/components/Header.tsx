import React, { useState, useEffect } from "react";
import { Menu, User, ShoppingCart, X, ChevronRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSettings } from "../context/SettingsContext";
import CartDrawer from "./CartDrawer";
import MenuDrawer from "./MenuDrawer";

export default function Header() {
  const { settings } = useSettings();
  const { cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [topBarLink, setTopBarLink] = useState<string | null>(null);
  const navigate = useNavigate();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    fetch("/api/products/top-bar")
      .then(res => res.json())
      .then(data => {
        if (data && data.id) setTopBarLink(`/produto/${data.id}`);
      })
      .catch(() => {});
  }, []);

  const renderTopBarText = () => {
    const text = settings.top_bar_text;
    const highlight = "kit we favorito!";
    if (topBarLink && text.toLowerCase().includes(highlight.toLowerCase())) {
      const index = text.toLowerCase().indexOf(highlight.toLowerCase());
      const before = text.substring(0, index);
      const match = text.substring(index, index + highlight.length);
      const after = text.substring(index + highlight.length);
      return (
        <>
          {before}
          <Link to={topBarLink} className="underline">
            {match}
          </Link>
          {after}
        </>
      );
    }
    return text;
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        {/* Top Bar */}
        {settings.top_bar_active === "1" && (
          <div className="bg-[#FF0080] py-2 text-center text-[11px] font-bold tracking-wider text-white uppercase sm:text-xs">
            {renderTopBarText()}
          </div>
        )}

        {/* Main Header */}
        <div className="flex h-14 items-center justify-between bg-white px-4 sm:h-16 sm:px-8 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-gray-800 hover:opacity-70"
              id="menu-button"
            >
              <Menu size={24} />
            </button>
          </div>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            {settings.logo_url && (
              <img 
                src={settings.logo_url} 
                alt="" 
                className="h-6 w-auto sm:h-8" 
                referrerPolicy="no-referrer"
              />
            )}
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              className="hidden p-2 text-gray-800 hover:opacity-70 sm:block"
            >
              <MapPin size={24} />
            </button>
            <button 
              onClick={() => navigate("/perfil")}
              className="p-2 text-gray-800 hover:opacity-70"
              id="user-button"
            >
              <User size={24} />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-800 hover:opacity-70"
              id="cart-button"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF0080] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isCartOpen && (
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        )}
        {isMenuOpen && (
          <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
