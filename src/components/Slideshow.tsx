"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const images = [
  "/aryana-1.png",
  "/aryana-2.png",
  "/aryana-3.png"
];

export function Slideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      if (isMuted) {
        // Attempt to play if it was paused/blocked
        audioRef.current.play().catch(console.error);
      }
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full h-full group">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/music.mp3"
        autoPlay
        loop
        muted={isMuted}
      />

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

      {/* Audio Controls */}
      <div className="absolute bottom-4 left-4 z-10">
        <button
          onClick={toggleMute}
          className="bg-black/20 hover:bg-black/40 text-white rounded-full p-3 backdrop-blur-sm transition-colors"
          aria-label={isMuted ? "Unmute music" : "Mute music"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

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
