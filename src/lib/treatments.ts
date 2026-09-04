export type Treatment = {
  slug: string;
  name: string;
  badge?: string;
  session: number;
  fivePlusOne: number;
  tenPlusTwo: number;
  primary: string;
  secondary: string;
  bestFor: string;
  duration: string;
};

export const treatments: Treatment[] = [
  {
    slug: "luxury-glow",
    name: "Luxury Glow",
    badge: "Best Choice",
    session: 2999,
    fivePlusOne: 14995,
    tenPlusTwo: 29990,
    primary: "Pampers, nourishes, and rejuvenates the skin.",
    secondary: "Skin brightening, silky and all-over glow.",
    bestFor: "Clients wanting an indulgent, high-end beauty treatment.",
    duration: "45–60 min",
  },
  {
    slug: "total-glow-drip",
    name: "Total Glow Drip",
    badge: "Recommended",
    session: 2499,
    fivePlusOne: 12495,
    tenPlusTwo: 24990,
    primary: "Beauty and wellness in one infusion.",
    secondary: "Brightening and deep revitalization, head to toe.",
    bestFor: "Full-body wellness paired with visible beauty results.",
    duration: "45 min",
  },
  {
    slug: "glow-boost",
    name: "Glow Boost",
    session: 1999,
    fivePlusOne: 9950,
    tenPlusTwo: 19990,
    primary: "Glow from within with hydration and nutrients.",
    secondary: "Skin brightening for a dewy glow.",
    bestFor: "Anyone feeling dull or in need of an instant skin refresh.",
    duration: "30 min",
  },
  {
    slug: "radiance-plus",
    name: "Radiance Plus",
    session: 1999,
    fivePlusOne: 9950,
    tenPlusTwo: 19990,
    primary: "A silky infusion for glowing, even-toned skin.",
    secondary: "Skin lightening for a luminous glow.",
    bestFor: "Uneven skin tone, discoloration, or dullness.",
    duration: "30 min",
  },
  {
    slug: "recovery-drip",
    name: "Recovery Drip",
    badge: "Best Value",
    session: 2699,
    fivePlusOne: 13495,
    tenPlusTwo: 26990,
    primary: "Hydration, electrolytes, and restored energy.",
    secondary: "Brightening for a rested, camera-ready glow.",
    bestFor: "Post-party, jet lag, dehydration, and post-workout recovery.",
    duration: "40 min",
  },
  {
    slug: "clear-skin-boost",
    name: "Clear Skin Boost",
    badge: "Top Seller",
    session: 1499,
    fivePlusOne: 7495,
    tenPlusTwo: 14990,
    primary: "A blend that soothes irritation and clears blemishes.",
    secondary: "Lightening for a smooth, radiant complexion.",
    bestFor: "Breakouts, redness, or uneven skin.",
    duration: "30 min",
  },
  {
    slug: "active-glow",
    name: "Active Glow",
    session: 1999,
    fivePlusOne: 9950,
    tenPlusTwo: 9950,
    primary: "Stamina support for active, busy lifestyles.",
    secondary: "Brightening for a vibrant, healthy glow all day.",
    bestFor: "Anyone always on the move and exposed to the sun.",
    duration: "30 min",
  },
];

export const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH")}`;
