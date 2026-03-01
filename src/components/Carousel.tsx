import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselItem {
  id: number;
  image_url: string;
  link_url: string;
}

export default function Carousel() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/api/carousel")
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) setItems(data);
        else {
          // Default placeholder
          setItems([
            { id: 1, image_url: "https://picsum.photos/seed/wepink1/1920/1080", link_url: "#" },
            { id: 2, image_url: "https://picsum.photos/seed/wepink2/1920/1080", link_url: "#" }
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

  if (items.length === 0) return null;

  return (
    <div className="relative h-[60vh] w-full overflow-hidden sm:h-[80vh]">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={items[currentIndex].image_url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 50) prev();
            else if (info.offset.x < -50) next();
          }}
          className="h-full w-full object-cover cursor-grab active:cursor-grabbing"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <button onClick={prev} className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/40">
          <ChevronLeft size={24} />
        </button>
        <button onClick={next} className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/40">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === currentIndex ? "w-6 bg-[#FF0080]" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
