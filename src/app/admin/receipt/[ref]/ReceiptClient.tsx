"use client";

import { useEffect } from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export function ReceiptClient({ type, data }: { type: "appointment" | "retail"; data: any }) {
  useEffect(() => {
    // Optionally trigger print automatically
    // window.print();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const branch = data.branches;
  const customer = data.customers;
  const staff = data.staff;

  const receiptNo = data.reference_number;
  const dateStr = new Date(data.created_at || data.appointment_date + "T" + data.appointment_time).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });

  const totalAmount = type === "appointment" ? data.amount_due : data.total_amount;
  const paymentMethod = data.payment_method || "cash";

  // Build items array
  let items = [];
  if (type === "appointment") {
    items.push({
      name: data.treatments?.name || "Service",
      qty: 1,
      price: data.amount_due,
      amount: data.amount_due
    });
  } else {
    items = data.items.map((i: any) => ({
      name: i.item?.name || "Product",
      qty: i.quantity,
      price: i.price_per_unit,
      amount: i.quantity * i.price_per_unit
    }));
  }

  // Currently we don't track multiple payments or exact cash received in the db schema easily.
  // We'll display what we can based on requirements.
  
  // Create a verification URL for the QR code
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${receiptNo}` : '';

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      
      {/* SCREEN ONLY CONTROLS */}
      <div className="print:hidden bg-white border-b border-line p-4 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <Link href="/admin/pos" className="flex items-center gap-2 text-ink-soft hover:text-royal transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Back to POS
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-royal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-royal-deep transition-colors shadow-sm"
          >
            <Printer size={16} />
            Print Receipt
          </button>
          <button 
            onClick={() => window.alert("PDF download requires a server-side PDF generator like Puppeteer or an API. Printing as PDF is supported via browser dialog.")}
            className="flex items-center gap-2 bg-white border border-line text-ink px-4 py-2 rounded-lg text-sm font-medium hover:bg-pale transition-colors"
          >
            <Download size={16} />
            Save PDF
          </button>
        </div>
      </div>

      {/* RECEIPT PREVIEW WRAPPER */}
      <div className="flex-1 flex items-center justify-center p-8 print:p-0 print:block">
        
        {/* RECEIPT PAPER */}
        <div className="bg-white w-[80mm] max-w-full mx-auto p-4 sm:p-6 print:p-0 shadow-2xl print:shadow-none text-black font-mono text-sm leading-tight">
          
          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-1 tracking-wider">CINDYRELLA DRIP</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">Aesthetic & Wellness</p>
            
            <div className="mt-4 text-xs space-y-0.5">
              <p className="font-bold">{branch?.name || "Main Branch"}</p>
              {branch?.address && <p>{branch.address}</p>}
              <p>{branch?.phone || "09302245668"}</p>
            </div>
          </div>

          <div className="border-t border-black border-dashed my-4"></div>

          {/* META INFO */}
          <div className="text-xs space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Transaction:</span>
              <span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{dateStr}</span>
            </div>
            {type === "appointment" && data.id && (
              <div className="flex justify-between">
                <span>Appointment:</span>
                <span>{receiptNo}</span>
              </div>
            )}
            <div className="flex justify-between mt-2">
              <span>Customer:</span>
              <span className="font-medium text-right max-w-[120px] truncate capitalize">
                {customer ? `${customer.first_name} ${customer.last_name}`.trim() : "Walk-in Customer"}
              </span>
            </div>
            {staff && (
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="truncate">{staff.full_name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-black border-dashed my-4"></div>

          {/* ITEMS */}
          <div className="text-xs mb-4">
            <div className="flex justify-between font-bold mb-2 pb-1 border-b border-black">
              <span className="w-1/2">ITEM</span>
              <span className="w-1/4 text-center">QTY</span>
              <span className="w-1/4 text-right">AMT</span>
            </div>
            
            <div className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex flex-col">
                  <span className="font-semibold break-words pr-2">{item.name}</span>
                  <div className="flex justify-between mt-0.5 text-black/80">
                    <span className="w-1/2 pl-2">@ ₱{item.price.toLocaleString()}</span>
                    <span className="w-1/4 text-center">{item.qty}</span>
                    <span className="w-1/4 text-right font-medium text-black">₱{item.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-black border-dashed my-4"></div>

          {/* SUMMARY */}
          <div className="text-xs space-y-1.5 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>₱0</span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-black">
              <span>TOTAL:</span>
              <span>₱{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* PAYMENT */}
          <div className="text-xs space-y-1 mb-6 p-2 bg-neutral-100 print:bg-transparent print:border print:border-black rounded">
            <p className="font-bold mb-1">PAYMENT DETAILS</p>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="uppercase">{paymentMethod.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>₱{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-[10px] mt-1 pt-1 border-t border-black/20 print:border-black/50">
              <span>STATUS:</span>
              <span>PAID</span>
            </div>
          </div>

          {/* QR CODE & VERIFICATION */}
          <div className="flex flex-col items-center justify-center my-6 space-y-2">
            <QRCodeSVG value={verificationUrl} size={64} level="L" includeMargin={false} />
            <span className="text-[9px] text-center max-w-[200px] mt-2">
              Scan to verify receipt authenticity
            </span>
          </div>

          <div className="border-t border-black my-4"></div>

          {/* FOOTER */}
          <div className="text-center text-[10px] space-y-1.5">
            <p className="font-bold">Thank you for choosing<br/>CINDYRELLA AESTHETIC & WELLNESS</p>
            <p className="mt-2">We appreciate your trust and support.</p>
            <p>Please keep this receipt for your records.</p>
            <div className="mt-3 pt-3 border-t border-black/30 print:border-black/50 space-y-1">
              <p>Refunds are subject to clinic policy.</p>
              <p>Services depend on availability.</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
