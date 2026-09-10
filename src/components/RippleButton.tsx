"use client";

import React, { useState, MouseEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface RippleButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function RippleButton({ href, onClick, children, className = "" }: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
    if (onClick) onClick();
  };

  const content = (
    <>
      <span className="relative z-10 flex items-center justify-center w-full h-full">{children}</span>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onAnimationComplete={() => {
              setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
            }}
            className="absolute rounded-full bg-white/30"
            style={{
              left: ripple.x - 20,
              top: ripple.y - 20,
              width: 40,
              height: 40,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );

  const baseClass = `relative overflow-hidden ${className}`;

  if (href) {
    return (
      <Link href={href} onClick={handleClick as React.MouseEventHandler<HTMLAnchorElement>} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>} className={baseClass}>
      {content}
    </button>
  );
}
