import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cindyrella Medical Group — IV Drip Therapy",
  description:
    "Nurse-administered IV drip therapy in a premium medical spa setting. Hydration, recovery, and skin glow, backed by licensed healthcare professionals.",
  openGraph: {
    title: "Cindyrella Medical Group — IV Drip Therapy",
    description:
      "Nurse-administered IV drip therapy for wellness, hydration, and skin glow.",
    type: "website",
  },
};

import { AIAssistant } from "@/components/AIAssistant";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <AIAssistant />
      </body>
    </html>
  );
}
