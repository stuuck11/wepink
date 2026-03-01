import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

interface CarouselItem {
  id: number;
  image_url: string;
  link_url: string;
}

export default function Carousel() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/carousel")
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) setItems(data);
        else {
          // Default placeholder
          setItems([
            { id: 1, image_url: "https://picsum.photos/seed/wepink1/1920/1080", link_url: "/categoria/kits" },
            { id: 2, image_url: "https://picsum.photos/seed/wepink2/1920/1080", link_url: "/categoria/perfumaria" }
          ]);
        }
      });
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [items]);

  const next = () => setCurrentIndex(prev => (prev + 1) % items.length);
  const prev = () => setCurrentIndex(prev => (prev - 1 + items.length) % items.length);

  const handleBannerClick = (link: string) => {
    if (link && link !== "#") {
      navigate(link);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="relative h-[60vh] w-full overflow-hidden sm:h-[80vh] touch-pan-y">
      <motion.div
        className="flex h-full w-full cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          const swipeThreshold = 100;
          if (info.offset.x > swipeThreshold) prev();
          else if (info.offset.x < -swipeThreshold) next();
        }}
        animate={{ x: `-${currentIndex * 100}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {items.map((item) => (
          <div 
            key={item.id} 
            className="h-full w-full flex-shrink-0"
            onClick={() => handleBannerClick(item.link_url)}
          >
            <img
              src={item.image_url}
              alt="Banner"
              className="h-full w-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </motion.div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === currentIndex ? "bg-[#FF0080]" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
