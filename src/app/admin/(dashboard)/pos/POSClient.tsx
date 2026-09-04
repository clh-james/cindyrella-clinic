"use client";

import { useState } from "react";
import type { Treatment, InventoryItem, Branch } from "@/lib/supabase/types";
import { ShoppingCart, Minus, CreditCard, Banknote, ScanLine, Loader2 } from "lucide-react";
import { processPOSWalkin, processPOSRetail } from "./actions";

export function POSClient({ 
  treatments, 
  inventory, 
  branches 
}: { 
  treatments: Treatment[], 
  inventory: InventoryItem[], 
  branches: Branch[] 
}) {
  const [mode, setMode] = useState<"walkin" | "retail">("walkin");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "maya">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (item: { id: string; name: string; price: number }) => {
    if (mode === "walkin" && cart.length > 0) {
      // Walkin only allows one treatment for simplicity in MVP
      setCart([{ ...item, quantity: 1 }]);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (mode === "walkin" && (!customerName || !customerPhone || !selectedBranch)) {
      setError("Please fill in customer details and branch for walk-in.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let res;
    if (mode === "walkin") {
      res = await processPOSWalkin({
        treatmentId: cart[0].id,
        branchId: selectedBranch,
        customerName,
        customerPhone,
        paymentMethod,
        amountDue: total
      });
    } else {
      res = await processPOSRetail({
        items: cart,
        paymentMethod,
        amountDue: total
      });
    }

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Transaction completed successfully!");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    }
    setLoading(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col md:flex-row gap-6">
      {/* Main Panel - Products/Treatments */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-line overflow-hidden shadow-sm">
        <div className="flex border-b border-line">
          <button 
            onClick={() => { setMode("walkin"); setCart([]); setError(null); setSuccess(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === "walkin" ? "bg-pale text-royal border-b-2 border-royal" : "text-ink-soft hover:bg-pale/50"}`}
          >
            Walk-in Treatments
          </button>
          <button 
            onClick={() => { setMode("retail"); setCart([]); setError(null); setSuccess(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === "retail" ? "bg-pale text-royal border-b-2 border-royal" : "text-ink-soft hover:bg-pale/50"}`}
          >
            Retail Sales
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mode === "walkin" ? (
            treatments.map(t => (
              <button 
                key={t.id} 
                onClick={() => addToCart({ id: t.id, name: t.name, price: t.session_price })}
                className="flex flex-col items-start p-4 border border-line rounded-xl hover:border-royal hover:bg-pale/50 text-left transition-colors"
              >
                <span className="font-medium text-ink">{t.name}</span>
                <span className="text-royal font-mono font-medium mt-2">₱{t.session_price}</span>
              </button>
            ))
          ) : (
            inventory.map(i => (
              <button 
                key={i.id} 
                onClick={() => addToCart({ id: i.id, name: i.name, price: i.retail_price || 0 })}
                disabled={i.current_stock <= 0}
                className="flex flex-col items-start p-4 border border-line rounded-xl hover:border-royal hover:bg-pale/50 text-left transition-colors disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent"
              >
                <span className="font-medium text-ink">{i.name}</span>
                <div className="flex justify-between w-full mt-2 items-center">
                  <span className="text-royal font-mono font-medium">₱{i.retail_price}</span>
                  <span className="text-xs text-ink-soft">Stock: {i.current_stock}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-96 flex flex-col bg-white rounded-2xl border border-line overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line bg-pale flex items-center gap-2">
          <ShoppingCart size={18} className="text-royal" />
          <h2 className="font-medium text-ink">Current Order</h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-ink-soft text-sm">
              Cart is empty
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map(item => (
                <li key={item.id} className="flex items-center justify-between p-3 bg-white border border-line rounded-xl shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-ink line-clamp-1">{item.name}</p>
                    <p className="text-xs text-ink-soft mt-1">₱{item.price} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-sm">₱{item.price * item.quantity}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-md">
                      <Minus size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-line space-y-4">
          {mode === "walkin" && (
            <div className="space-y-3">
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal bg-white">
                <option value="" disabled>Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
              <input type="text" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="font-medium text-ink-soft">Total</span>
            <span className="text-2xl font-bold font-mono text-ink">₱{total}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setPaymentMethod("cash")} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === "cash" ? "border-royal bg-royal/10 text-royal" : "border-line text-ink-soft hover:bg-pale"}`}>
              <Banknote size={18} /> Cash
            </button>
            <button onClick={() => setPaymentMethod("card")} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === "card" ? "border-royal bg-royal/10 text-royal" : "border-line text-ink-soft hover:bg-pale"}`}>
              <CreditCard size={18} /> Card
            </button>
            <button onClick={() => setPaymentMethod("maya")} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === "maya" ? "border-royal bg-royal/10 text-royal" : "border-line text-ink-soft hover:bg-pale"}`}>
              <ScanLine size={18} /> Maya/GCash
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || loading}
            className="w-full flex justify-center items-center gap-2 rounded-xl bg-royal py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Charge ₱{total}
          </button>
        </div>
      </div>
    </div>
  );
}
