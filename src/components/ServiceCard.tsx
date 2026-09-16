import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { Treatment } from "@/lib/supabase/types";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export function ServiceCard({ service }: { service: Treatment }) {
  const imageAlt = `${service.name} IV drip treatment`;
  
  return (
    <Link
      href="/treatments"
      className="group h-full flex flex-col rounded-2xl bg-[#18120F] shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* Image Area */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#18120F]">
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 font-medium">
            <span className="text-sm">Image coming soon</span>
          </div>
        )}
        
        {/* Subtle gradient overlay at the bottom of the image to blend into the card */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#18120F] to-transparent pointer-events-none" />
      </div>

      <div className="flex flex-col justify-between p-5 pt-1 flex-1 bg-[#18120F] z-10 relative">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-lg font-semibold text-white leading-tight">
              {service.name}
            </h3>
            {service.badge && (
              <span className="whitespace-nowrap rounded-full bg-[#d4af82] px-2.5 py-0.5 text-[10px] font-bold text-[#332211] uppercase tracking-wider shadow-sm mt-0.5">
                {service.badge}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#d4af82]">
              {peso(service.session_price)}
            </span>
          </div>

          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
            {(service.best_for ? service.best_for.split(',') : (service.primary_desc ? [service.primary_desc] : [])).slice(0, 4).map((feature: string, i: number) => (
              <li key={i} className="flex items-center gap-1.5">
                <Check size={14} className="shrink-0 text-[#d4af82]" />
                <span className="text-xs text-white/90 leading-snug">{feature.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-5">
          <div className="w-full rounded-full bg-royal px-4 py-2.5 text-center text-sm font-medium text-white transition-colors group-hover:bg-royal-deep">
            Book Now
          </div>
        </div>
      </div>
    </Link>
  );
}
