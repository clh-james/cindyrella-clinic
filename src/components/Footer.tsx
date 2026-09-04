import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-line bg-pale">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Cindyrella Logo" width={64} height={64} className="rounded-full" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Licensed nurse-administered IV drip therapy for hydration,
              recovery, and skin health, delivered with medical-grade care.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Explore</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li><Link href="/treatments" className="hover:text-royal">Treatments</Link></li>
              <li><Link href="/gallery" className="hover:text-royal">Gallery</Link></li>
              <li><Link href="/reviews" className="hover:text-royal">Reviews</Link></li>
              <li><Link href="/about" className="hover:text-royal">About us</Link></li>
              <li><Link href="/faq" className="hover:text-royal">FAQ</Link></li>
              <li><Link href="/privacy" className="hover:text-royal">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-royal">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Hours</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li>Daily: 10:00 AM – 10:00 PM</li>
            </ul>
            <div className="mt-4 flex gap-4 text-sm">
              <a href="https://www.facebook.com/share/1Hzz25f2eV/" target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-royal">Facebook</a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-royal">Instagram</a>
              <a href="https://www.tiktok.com/@cindyrellabyaryana" target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-royal">TikTok</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 shrink-0" />
                cindyrelladripdavao26@gmail.com
              </li>
              <li className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 shrink-0" />
                09302245668
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                Unit 15&16, 2nd Floor, Coronet Property Holdings Corp Bldg 3, Quimpo Blvd., Davao City
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-soft md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Cindyrella Medical Group. All rights reserved.</p>
          <p>Results vary from person to person. Consult a physician before treatment.</p>
        </div>
      </div>
    </footer>
  );
}
