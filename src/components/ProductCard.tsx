import React from "react";
import { ShoppingCart, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    old_price?: number;
    image_url: string;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  return (
    <div className="group flex flex-col gap-3">
      <Link to={`/produto/${product.id}`} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
      </Link>
      
      <div className="flex flex-1 flex-col gap-1">
        <Link to={`/produto/${product.id}`} className="hover:text-[#FF0080] transition-colors">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
        </Link>
        <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
        
        <div className="mt-2 flex flex-col">
          {product.old_price && (
            <span className="text-xs text-gray-400 line-through">
              R$ {product.old_price.toFixed(2).replace(".", ",")}
            </span>
          )}
          <span className="text-lg font-black text-gray-900">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => addToCart(product)}
          className="flex-1 rounded-lg bg-[#FF0080] py-3 text-[10px] font-black text-white uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Comprar
        </button>
        <button 
          onClick={() => addToCart(product)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#FF0080] text-[#FF0080] hover:bg-[#FF0080] hover:text-white transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
