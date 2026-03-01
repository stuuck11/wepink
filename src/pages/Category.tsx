import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  banner_url?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price?: number;
  image_url: string;
}

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setProducts([]);
    setHasMore(true);

    // Fetch category info
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => {
        const cat = data.find((c: any) => c.slug === slug);
        setCategory(cat || null);
      });

    // Fetch initial products
    fetch(`/api/products?category=${slug}&limit=${LIMIT}&offset=0`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setHasMore(data.length === LIMIT);
        setLoading(false);
      });
  }, [slug]);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const newOffset = offset + LIMIT;
    
    fetch(`/api/products?category=${slug}&limit=${LIMIT}&offset=${newOffset}`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setProducts(prev => [...prev, ...data]);
          setOffset(newOffset);
          setHasMore(data.length === LIMIT);
        } else {
          setHasMore(false);
        }
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!category) return <div className="flex h-screen items-center justify-center">Categoria não encontrada.</div>;

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Banner */}
      <div className="relative h-[200px] w-full overflow-hidden sm:h-[350px]">
        <img 
          src={category.banner_url || "https://picsum.photos/seed/catbanner/1248/350"} 
          alt={category.name} 
          className="h-full w-full object-cover" 
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <h1 className="text-4xl font-black text-white uppercase tracking-widest sm:text-6xl">{category.name}</h1>
        </div>
      </div>

      {/* Products List */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 sm:px-8">
        {products.length > 0 ? (
          <>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
            
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border-2 border-[#FF0080] px-12 py-4 text-sm font-bold uppercase tracking-widest text-[#FF0080] transition-all hover:bg-[#FF0080] hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? "Carregando..." : "Mostrar Mais"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="py-20 text-center text-gray-400">Nenhum produto encontrado nesta categoria.</p>
        )}
      </div>
    </div>
  );
}
