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
      className="group h-full flex flex-col rounded-3xl border border-line bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(30,58,138,0.15)] hover:border-royal overflow-hidden"
    >
      {/* Image Area */}
      <div className="relative aspect-video w-full overflow-hidden bg-pale">
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-soft/30 font-medium">
            <span className="text-sm">Image coming soon</span>
          </div>
        )}
        
        {/* Subtle gradient overlay at the bottom of the image */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      </div>

      <div className="flex flex-col justify-between p-8 flex-1">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl font-semibold text-ink">
              {service.name}
            </h3>
            {service.badge && (
              <span className="whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold uppercase tracking-wider">
                {service.badge}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-ink">
              {peso(service.session_price)}
            </span>
          </div>

          <ul className="space-y-3 mt-2">
            {(service.best_for ? service.best_for.split(',') : (service.primary_desc ? [service.primary_desc] : [])).slice(0, 3).map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Check size={18} className="mt-0.5 shrink-0 text-gold" />
                <span className="text-sm text-ink-soft leading-snug">{feature.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-8 pt-6 border-t border-line">
          <div className="w-full rounded-full bg-royal px-6 py-3.5 text-center text-sm font-medium text-white transition-colors group-hover:bg-royal-deep">
            Book Now
          </div>
        </div>
      </div>
    </Link>
  );
}
