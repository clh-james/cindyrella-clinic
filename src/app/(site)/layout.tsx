import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 md:pb-0">
      <NavBar />
      {children}
      <Footer />
      <MobileBottomBar />
    </div>
  );
}
