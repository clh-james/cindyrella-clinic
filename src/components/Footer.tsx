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
              <Image src="/logo.png" alt="Cindyrella Logo" width={128} height={128} className="rounded-full" />
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
            <div className="mt-4 flex gap-5 text-sm">
              <a href="https://www.facebook.com/share/1Hzz25f2eV/" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" aria-label="Facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.03998C6.5 2.03998 2 6.52998 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.84998C10.44 7.33998 11.93 5.95998 14.22 5.95998C15.31 5.95998 16.45 6.14998 16.45 6.14998V8.61998H15.19C13.95 8.61998 13.56 9.38998 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.52998 17.5 2.03998 12 2.03998Z" fill="#1877F2"/>
                </svg>
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="5" fill="url(#ig-grad)"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="white" strokeWidth="2" fill="none"/>
                  <rect x="4" y="4" width="16" height="16" rx="4" stroke="white" strokeWidth="2" fill="none"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                  <defs>
                    <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FCAF45"/>
                      <stop offset="0.5" stopColor="#F56040"/>
                      <stop offset="1" stopColor="#833AB4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@cindyrellabyaryana" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" aria-label="TikTok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="5" fill="black"/>
                  <g transform="scale(0.6) translate(8, 8)">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.5 5.54-3.82 7.15-2.34 1.63-5.46 2.04-8.08 1.1-2.52-.89-4.57-2.91-5.36-5.45-.78-2.48-.48-5.33 1.05-7.55 1.5-2.15 3.96-3.46 6.54-3.64v4.06c-1.63.13-3.15 1.25-3.85 2.72-.69 1.48-.54 3.25.43 4.56.96 1.3 2.68 1.96 4.3 1.64 1.66-.32 2.94-1.74 3.12-3.41.13-2.19.06-4.38.07-6.58V.02z" fill="#25F4EE" transform="translate(-1.5, -0.5)"/>
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.5 5.54-3.82 7.15-2.34 1.63-5.46 2.04-8.08 1.1-2.52-.89-4.57-2.91-5.36-5.45-.78-2.48-.48-5.33 1.05-7.55 1.5-2.15 3.96-3.46 6.54-3.64v4.06c-1.63.13-3.15 1.25-3.85 2.72-.69 1.48-.54 3.25.43 4.56.96 1.3 2.68 1.96 4.3 1.64 1.66-.32 2.94-1.74 3.12-3.41.13-2.19.06-4.38.07-6.58V.02z" fill="#FE2C55" transform="translate(1.5, 0.5)"/>
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.5 5.54-3.82 7.15-2.34 1.63-5.46 2.04-8.08 1.1-2.52-.89-4.57-2.91-5.36-5.45-.78-2.48-.48-5.33 1.05-7.55 1.5-2.15 3.96-3.46 6.54-3.64v4.06c-1.63.13-3.15 1.25-3.85 2.72-.69 1.48-.54 3.25.43 4.56.96 1.3 2.68 1.96 4.3 1.64 1.66-.32 2.94-1.74 3.12-3.41.13-2.19.06-4.38.07-6.58V.02z" fill="white"/>
                  </g>
                </svg>
              </a>
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
