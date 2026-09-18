'use client';

import { useState } from 'react';
import { ServiceCard } from "@/components/ServiceCard";
import { Treatment } from "@/lib/supabase/types";

type GroupedTreatments = {
  name: string;
  items: Treatment[];
};

export default function TreatmentsClient({ groupedTreatments }: { groupedTreatments: GroupedTreatments[] }) {
  const [activeCategory, setActiveCategory] = useState(groupedTreatments[0]?.name || '');

  const activeGroup = groupedTreatments.find(g => g.name === activeCategory);

  return (
    <div className="mt-8 sm:mt-12">
      {/* Sticky Tab Bar */}
      <div className="sticky top-[64px] sm:top-[72px] z-20 -mx-6 mb-12 overflow-x-auto bg-white/95 px-6 py-4 backdrop-blur-md border-b border-line shadow-sm">
        <div className="flex space-x-3 w-max mx-auto max-w-full">
          {groupedTreatments.map((group) => (
            <button
              key={group.name}
              onClick={() => setActiveCategory(group.name)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                activeCategory === group.name
                  ? 'bg-royal text-white shadow-md ring-1 ring-royal'
                  : 'bg-pale text-ink hover:bg-pale/80 hover:text-royal'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Category Content */}
      {activeGroup && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="font-serif text-3xl font-semibold text-ink border-b border-line pb-4 mb-8">
            {activeGroup.name}
          </h2>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeGroup.items.map((t) => (
              <ServiceCard key={t.id} service={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
