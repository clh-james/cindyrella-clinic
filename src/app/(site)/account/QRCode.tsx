"use client";

import { QRCodeSVG } from 'qrcode.react';

export function AppointmentQRCode({ referenceNumber }: { referenceNumber: string }) {
  // Using window.location.origin wouldn't work easily on SSR, 
  // so we build the URL dynamically on the client, or just encode the relative path.
  // Actually, an absolute URL is better for QR codes scanned by a separate phone.
  // We'll pass the full URL or just assume the domain. Let's just use the current domain.
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cindyrella.com';
  const url = `${origin}/admin/checkin/${referenceNumber}`;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-line">
      <QRCodeSVG value={url} size={120} />
      <span className="mt-2 text-xs font-medium text-ink-soft">Scan at clinic to check-in</span>
    </div>
  );
}
