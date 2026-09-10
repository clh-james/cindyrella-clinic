"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const images = [
  "/aryana-1.png",
  "/aryana-2.png",
  "/aryana-3.png"
];

export function Slideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Image
            src={images[currentIndex]}
            alt="Ms. Aryana Lopez"
            fill
            className="object-cover"
            priority={currentIndex === 0}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={prevSlide}
          className="bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
          aria-label="Previous image"
        >
          <ChevronUp size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
          aria-label="Next image"
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
}
