"use client";

import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";

export function MobileBottomBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-line px-4 py-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex items-center gap-3">
      <Link 
        href="tel:+639000000000"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pale text-ink transition-colors active:bg-line"
        aria-label="Call Us"
      >
        <Phone size={20} />
      </Link>
      
      <Link 
        href="https://m.me/cindyrellaclinic"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pale text-ink transition-colors active:bg-line"
        aria-label="Message on Messenger"
      >
        <MessageCircle size={20} />
      </Link>

      <Link 
        href="/booking"
        className="flex h-12 flex-1 items-center justify-center rounded-full bg-royal text-sm font-semibold text-white transition-colors active:bg-royal-deep shadow-sm"
      >
        Book Now
      </Link>
    </div>
  );
}
