import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";
import Home from "./pages/Home";
import Category from "./pages/Category";
import Checkout from "./pages/Checkout";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Profile from "./pages/Profile";
import ProductDetail from "./pages/ProductDetail";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartFooter from "./components/CartFooter";

export default function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-white font-sans text-gray-900">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/categoria/:slug" element={<Category />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/produto/:id" element={<ProductDetail />} />
              </Routes>
            </main>
            <CartFooter />
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </SettingsProvider>
  );
}
