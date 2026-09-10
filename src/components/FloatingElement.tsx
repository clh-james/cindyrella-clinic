"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function FloatingElement({ children, className = "", delay = 0 }: { children: ReactNode, className?: string, delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -15, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
