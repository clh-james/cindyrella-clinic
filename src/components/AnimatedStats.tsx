"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const ease = 1 - Math.pow(1 - percentage, 4);
      setCount(Math.floor(end * ease));
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

export function AnimatedStats() {
  const sessions = useCounter(5000);
  const rating = useCounter(49); 
  const treatments = useCounter(7);
  const satisfaction = useCounter(98);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-line">
        <div className="flex flex-col items-center text-center">
          <span className="text-4xl font-serif font-bold text-royal">{sessions}+</span>
          <span className="text-sm font-medium text-ink-soft mt-2">Successful IV Sessions</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="flex text-gold">
               {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
                ))}
            </div>
            <span className="text-4xl font-serif font-bold text-royal">{(rating / 10).toFixed(1)}</span>
          </div>
          <span className="text-sm font-medium text-ink-soft mt-2">Rating</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-4xl font-serif font-bold text-royal">{treatments}</span>
          <span className="text-sm font-medium text-ink-soft mt-2">Premium IV Treatments</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-4xl font-serif font-bold text-royal">{satisfaction}%</span>
          <span className="text-sm font-medium text-ink-soft mt-2">Customer Satisfaction</span>
        </div>
      </div>
    </section>
  );
}
