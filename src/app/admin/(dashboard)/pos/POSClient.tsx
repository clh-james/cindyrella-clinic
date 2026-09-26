/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import type { } from "@/lib/supabase/types";
import { 
  ShoppingCart, Minus, Plus, CreditCard, Banknote, ScanLine, 
  Loader2, Search, X, CheckCircle2,
  Trash2, AlertTriangle, Package as PackageIcon,
  BriefcaseMedical, User, History, ReceiptText, Printer
} from "lucide-react";
import { processPOSWalkin, processPOSRetail, getRecentTransactions } from "./actions";

export function POSClient({ 
  treatments, 
  inventory, 
  branches 
}: { 
  treatments: { id: string; name: string; category: string; session_price: number; image_url?: string }[], 
  inventory: { id: string; name: string; category: string; retail_price?: number; current_stock: number; low_stock_threshold: number; image_url?: string }[], 
  branches: { id: string; name: string }[] 
}) {
  const [mode, setMode] = useState<"walkin" | "retail">("walkin");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number; maxStock?: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "maya">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Payment Flow States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | "">("");
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Success Flow State
  const [successData, setSuccessData] = useState<{
    referenceNumber: string;
    totalPaid: number;
    paymentMethod: string;
    change: number;
    customerName: string;
  } | null>(null);

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [transactions, setTransactions] = useState<{ reference_number: string; type: string; date: Date; method: string; amount: number }[]>([]);

  // Dynamic Categories based on mode
  const categories = useMemo(() => {
    if (mode === "walkin") {
      const cats = Array.from(new Set(treatments.map(t => t.category).filter(Boolean)));
      return ["All", ...cats];
    } else {
      const cats = Array.from(new Set(inventory.map(i => i.category).filter(Boolean)));
      return ["All", ...cats];
    }
  }, [mode, treatments, inventory]);

  // Reset category if mode changes
  useEffect(() => {
    setSelectedCategory("All");
    setSearchQuery("");
  }, [mode]);

  // Filtered items
  const filteredTreatments = useMemo(() => {
    return treatments.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [treatments, searchQuery, selectedCategory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || i.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (item: { id: string; name: string; price: number; maxStock?: number }) => {
    if (mode === "walkin") {
      setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...item, quantity: 1 }];
      });
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (item.maxStock && existing.quantity >= item.maxStock) {
          // Cannot add more than stock
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as unknown as { id: string; name: string; price: number; quantity: number; maxStock?: number };
        if (item.maxStock && newQty > item.maxStock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (mode === "walkin" && (!customerName || !customerPhone || !selectedBranch)) {
      setError("Please fill in customer details and branch for walk-in.");
      return;
    }
    setError(null);
    setCashReceived(total); // Default to exact amount
    setReferenceNumber("");
    setShowPaymentModal(true);
  };

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    const { transactions } = await getRecentTransactions();
    if (transactions) {
      setTransactions(transactions);
    }
    setHistoryLoading(false);
  };

  const processPayment = async () => {
    setLoading(true);
    setError(null);

    let res;
    if (mode === "walkin") {
      res = await processPOSWalkin({
        items: cart,
        branchId: selectedBranch,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || "N/A",
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
      setLoading(false);
    } else {
      const changeAmount = paymentMethod === "cash" ? (Number(cashReceived) - total) : 0;
      setSuccessData({
        referenceNumber: res.referenceNumber || "",
        totalPaid: total,
        paymentMethod,
        change: changeAmount > 0 ? changeAmount : 0,
        customerName: mode === "walkin" ? customerName : "Walk-in Customer"
      });
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSuccessData(null);
    setSearchQuery("");
  };

  // ----------------------------------------
  // RENDER HELPERS
  // ----------------------------------------
  
  const renderSuccessModal = () => {
    if (!successData) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-green-50 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Payment Successful</h2>
            <p className="text-green-600/80 mt-1 font-medium">Transaction {successData.referenceNumber}</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-line border-dashed">
              <span className="text-ink-soft">Customer</span>
              <span className="font-medium text-ink">{successData.customerName || "Guest"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line border-dashed">
              <span className="text-ink-soft">Total Paid</span>
              <span className="font-medium text-ink text-lg">₱{successData.totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line border-dashed">
              <span className="text-ink-soft">Payment Method</span>
              <span className="font-medium text-ink capitalize">{successData.paymentMethod}</span>
            </div>
            {successData.paymentMethod === "cash" && (
              <div className="flex justify-between items-center py-2 border-b border-line border-dashed">
                <span className="text-ink-soft">Change</span>
                <span className="font-medium text-ink">₱{successData.change.toLocaleString()}</span>
              </div>
            )}
            
            <div className="pt-4 grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.open(`/admin/receipt/${successData.referenceNumber}`, '_blank')}
                className="w-full py-3 rounded-xl border border-line bg-white text-ink font-medium hover:bg-pale transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Receipt
              </button>
              <button 
                onClick={resetPOS}
                className="w-full py-3 rounded-xl bg-royal text-white font-medium hover:bg-royal-deep transition-colors"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentModal = () => {
    if (!showPaymentModal) return null;
    const change = Number(cashReceived) - total;
    const isCashSufficient = paymentMethod === "cash" ? change >= 0 : true;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-line">
            <h2 className="text-lg font-semibold text-ink">Complete Payment</h2>
            <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-full hover:bg-pale text-ink-soft">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 bg-pale/30">
            <div className="text-center mb-6">
              <p className="text-ink-soft font-medium mb-1">Total Amount Due</p>
              <p className="text-4xl font-bold font-mono text-royal">₱{total.toLocaleString()}</p>
            </div>
            
            {paymentMethod === "cash" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Cash Received (₱)</label>
                  <input 
                    type="number" 
                    value={cashReceived} 
                    onChange={e => setCashReceived(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border border-line text-xl font-mono focus:border-royal outline-none focus:ring-2 focus:ring-royal/20"
                    placeholder="Enter amount..."
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setCashReceived(total)} className="py-2 border border-line rounded-lg text-sm font-medium hover:bg-pale transition-colors text-ink">Exact</button>
                  <button onClick={() => setCashReceived(Math.ceil(total/500)*500)} className="py-2 border border-line rounded-lg text-sm font-medium hover:bg-pale transition-colors text-ink">₱{Math.ceil(total/500)*500}</button>
                  <button onClick={() => setCashReceived(Math.ceil(total/1000)*1000)} className="py-2 border border-line rounded-lg text-sm font-medium hover:bg-pale transition-colors text-ink">₱{Math.ceil(total/1000)*1000}</button>
                  <button onClick={() => setCashReceived(Number(cashReceived) + 1000)} className="py-2 border border-line rounded-lg text-sm font-medium hover:bg-pale transition-colors text-ink">+1k</button>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-line mt-4">
                  <span className="font-medium text-ink-soft">Change</span>
                  <span className={`text-xl font-mono font-bold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ₱{change < 0 ? '0' : change.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            
            {(paymentMethod === "card" || paymentMethod === "maya") && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Reference / Approval Number</label>
                  <input 
                    type="text" 
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    className="w-full p-4 rounded-xl border border-line focus:border-royal outline-none focus:ring-2 focus:ring-royal/20"
                    placeholder="Enter reference number..."
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-line bg-white">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertTriangle size={16}/>{error}</div>}
            <button 
              onClick={processPayment} 
              disabled={loading || !isCashSufficient}
              className="w-full py-4 rounded-xl bg-royal text-white font-semibold hover:bg-royal-deep transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              CONFIRM PAYMENT
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Responsive Cart State
  const [showMobileCart, setShowMobileCart] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-[#f4f7f9] -mx-4 -my-6 sm:-mx-6 sm:-my-8 md:-mx-10 md:-my-10 relative">
      
      {/* HEADER TOP BAR */}
      <div className="h-16 bg-white border-b border-line px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h1 className="font-serif text-lg sm:text-xl font-semibold text-ink flex items-center gap-2">
            Point of Sale
          </h1>
          <p className="hidden sm:block text-xs text-ink-soft">Create and manage transactions</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={handleOpenHistory}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-line rounded-lg text-sm font-medium text-ink-soft hover:text-royal hover:border-royal hover:bg-pale transition-colors shadow-sm"
          >
            <History size={16} />
            <span className="hidden sm:inline">History</span>
          </button>
          
          <div className="flex flex-col items-end border-l border-line pl-2 sm:pl-4">
            <div className="text-xs sm:text-sm font-medium text-ink-soft flex items-center gap-2">
              <span className="hidden sm:inline">Branch:</span>
              <select 
                value={selectedBranch} 
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-pale border border-line rounded px-1 sm:px-2 py-1 text-xs font-semibold text-ink outline-none"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="hidden sm:block text-xs text-ink-soft/70">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT/CENTER: SERVICES BROWSER */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7f9]">
          
          {/* Mode Selector */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 shrink-0">
            <div className="flex p-1 bg-white border border-line rounded-xl w-full max-w-sm mx-auto shadow-sm">
              <button 
                onClick={() => { setMode("walkin"); setSelectedCategory("All"); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${mode === "walkin" ? "bg-royal text-white shadow-md" : "text-ink-soft hover:bg-pale"}`}
              >
                Walk-in
              </button>
              <button 
                onClick={() => { setMode("retail"); setSelectedCategory("All"); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${mode === "retail" ? "bg-royal text-white shadow-md" : "text-ink-soft hover:bg-pale"}`}
              >
                Retail Sales
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="px-4 sm:px-6 pb-2 sm:pb-4 shrink-0 space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-ink-soft" size={16} />
              <input 
                type="text" 
                placeholder="Search services, products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-11 pr-10 py-3 sm:py-3.5 bg-white border border-line rounded-2xl text-xs sm:text-sm outline-none focus:border-royal focus:ring-4 focus:ring-royal/10 shadow-sm transition-all placeholder:text-ink-soft/60"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1 rounded-full hover:bg-pale"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Horizontal Categories */}
            <div className="flex overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border
                    ${selectedCategory === cat 
                      ? 'bg-royal text-white border-royal shadow-md' 
                      : 'bg-white text-ink-soft border-line hover:border-royal/30 hover:bg-pale'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 lg:pb-6 min-h-0">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              
              {mode === "walkin" && filteredTreatments.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => addToCart({ id: t.id, name: t.name, price: t.session_price })}
                  className="group flex flex-col bg-white border border-line rounded-xl sm:rounded-2xl overflow-hidden hover:border-royal hover:shadow-lg transition-all text-left relative"
                >
                  <div className="h-20 sm:h-28 bg-gradient-to-br from-pale to-white flex items-center justify-center relative overflow-hidden">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <BriefcaseMedical className="text-royal/20 group-hover:text-royal/40 transition-colors" size={32} />
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <span className="text-[10px] sm:text-xs font-semibold text-royal mb-0.5 sm:mb-1 uppercase tracking-wider line-clamp-1">{t.category}</span>
                    <span className="font-semibold text-ink text-xs sm:text-base line-clamp-2 leading-snug">{t.name}</span>
                    <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-between">
                      <span className="font-mono font-bold text-ink text-xs sm:text-base">₱{t.session_price.toLocaleString()}</span>
                      <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pale flex items-center justify-center text-royal group-hover:bg-royal group-hover:text-white transition-colors">
                        <Plus size={14} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {mode === "retail" && filteredInventory.map(i => {
                const isOutOfStock = i.current_stock <= 0;
                const isLowStock = i.current_stock <= i.low_stock_threshold;
                
                return (
                  <button 
                    key={i.id} 
                    onClick={() => !isOutOfStock && addToCart({ id: i.id, name: i.name, price: i.retail_price || 0, maxStock: i.current_stock })}
                    disabled={isOutOfStock}
                    className={`group flex flex-col bg-white border rounded-xl sm:rounded-2xl overflow-hidden text-left relative transition-all
                      ${isOutOfStock ? 'border-line/50 opacity-60 cursor-not-allowed' : 'border-line hover:border-royal hover:shadow-lg'}
                    `}
                  >
                    <div className="h-20 sm:h-28 bg-gradient-to-br from-pale to-white flex items-center justify-center relative overflow-hidden">
                      {i.image_url ? (
                        <img src={i.image_url} alt={i.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <PackageIcon className={`${isOutOfStock ? 'text-ink-soft/20' : 'text-royal/20 group-hover:text-royal/40'} transition-colors`} size={32} />
                      )}
                      {isLowStock && !isOutOfStock && (
                        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-amber-100 text-amber-800 text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded uppercase z-10">Low Stock</div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-red-100 text-red-800 text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded uppercase z-10">Sold Out</div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <span className="text-[10px] sm:text-xs font-semibold text-royal mb-0.5 sm:mb-1 uppercase tracking-wider line-clamp-1">{i.category}</span>
                      <span className="font-semibold text-ink text-xs sm:text-base line-clamp-2 leading-snug">{i.name}</span>
                      
                      <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-between">
                        <span className="font-mono font-bold text-ink text-xs sm:text-base">₱{(i.retail_price||0).toLocaleString()}</span>
                        {!isOutOfStock && (
                          <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pale flex items-center justify-center text-royal group-hover:bg-royal group-hover:text-white transition-colors">
                            <Plus size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {((mode === "walkin" && filteredTreatments.length === 0) || (mode === "retail" && filteredInventory.length === 0)) && (
                <div className="col-span-full py-10 sm:py-20 flex flex-col items-center justify-center text-ink-soft text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Search size={24} className="text-ink-soft/50" />
                  </div>
                  <p className="font-medium text-ink">No items found</p>
                  <p className="text-xs sm:text-sm mt-1">Try adjusting your search or category filter.</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* MOBILE STICKY CART BUTTON */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-line shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 pb-safe">
          <button 
            onClick={() => setShowMobileCart(true)}
            className="w-full h-14 rounded-xl bg-royal text-white font-semibold flex items-center justify-between px-6 shadow-md"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span>{cart.reduce((s,i) => s + i.quantity, 0)} items</span>
            </div>
            <span className="font-mono font-bold">₱{total.toLocaleString()}</span>
          </button>
        </div>

        {/* RIGHT PANEL: CURRENT ORDER (Desktop side panel, Mobile bottom sheet/drawer) */}
        <div className={`
          fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden
          ${showMobileCart ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `} onClick={() => setShowMobileCart(false)}></div>
        
        <div className={`
          fixed lg:static inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[420px] 
          bg-white lg:border-l border-line shadow-2xl lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] 
          flex flex-col shrink-0 transition-transform duration-300 ease-in-out
          ${showMobileCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          
          {/* Order Header */}
          <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-white shrink-0 pt-safe lg:pt-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-1.5 -ml-1.5 text-ink-soft hover:bg-pale rounded-full">
                <X size={20} />
              </button>
              <h2 className="font-serif font-semibold text-lg text-ink flex items-center gap-2">
                <ShoppingCart size={20} className="text-royal hidden lg:block" />
                Current Order
              </h2>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1">
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          {/* Customer Selection */}
          {mode === "walkin" && (
            <div className="p-4 sm:p-5 border-b border-line bg-pale/30 shrink-0">
              <div className="flex items-center gap-2 mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-ink">
                <User size={16} className="text-royal" />
                Customer Info
              </div>
              <div className="space-y-2 sm:space-y-3">
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  className="w-full rounded-xl border border-line px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all shadow-sm bg-white" 
                />
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)} 
                  className="w-full rounded-xl border border-line px-3 sm:px-4 py-2 sm:py-2.5 text-sm outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all shadow-sm bg-white" 
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-ink-soft text-center opacity-70">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 stroke-[1.5]" />
                <p className="font-medium text-ink text-base sm:text-lg">Empty Cart</p>
                <p className="text-xs sm:text-sm mt-1 max-w-[200px]">Select a service or product to start a new transaction.</p>
              </div>
            ) : (
              <ul className="space-y-2 sm:space-y-3 pb-4">
                {cart.map(item => (
                  <li key={item.id} className="bg-white border border-line rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-2 sm:gap-3 group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="pr-3 sm:pr-4">
                        <p className="font-medium text-sm sm:text-base text-ink line-clamp-2 leading-snug">{item.name}</p>
                        <p className="text-[10px] sm:text-xs text-ink-soft mt-1 font-mono">₱{item.price.toLocaleString()} each</p>
                      </div>
                      <span className="font-mono font-bold text-sm sm:text-base text-ink whitespace-nowrap">₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      {/* Quantity Control */}
                      <div className="flex items-center gap-2 sm:gap-3 bg-pale rounded-lg p-1 border border-line/50">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)} 
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-white shadow-sm flex items-center justify-center text-ink hover:text-red-600 transition-colors"
                        >
                          <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span className="font-mono font-medium text-xs sm:text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)} 
                          disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-white shadow-sm flex items-center justify-center text-ink hover:text-royal transition-colors disabled:opacity-50 disabled:hover:text-ink"
                        >
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-[10px] sm:text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payment & Summary Area */}
          <div className="bg-white border-t border-line shrink-0 pb-safe lg:pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            
            {/* Summary */}
            <div className="p-4 sm:p-5 border-b border-line border-dashed space-y-1 sm:space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-mono text-ink">₱{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-ink-soft">Discount</span>
                <span className="font-mono text-ink">₱0</span>
              </div>
              <div className="flex justify-between items-end pt-1 sm:pt-2">
                <span className="font-medium text-ink text-base sm:text-lg">Total</span>
                <span className="text-xl sm:text-3xl font-bold font-mono text-royal">₱{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2 sm:mb-3">Payment Method</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
                <button 
                  onClick={() => setPaymentMethod("cash")} 
                  className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all ${paymentMethod === "cash" ? "border-royal bg-royal/5 text-royal" : "border-line text-ink-soft hover:border-royal/30 hover:bg-pale"}`}
                >
                  <Banknote size={20} className={paymentMethod === "cash" ? "text-royal" : ""} /> 
                  <span className="text-[10px] sm:text-xs font-semibold">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod("card")} 
                  className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all ${paymentMethod === "card" ? "border-royal bg-royal/5 text-royal" : "border-line text-ink-soft hover:border-royal/30 hover:bg-pale"}`}
                >
                  <CreditCard size={20} className={paymentMethod === "card" ? "text-royal" : ""} /> 
                  <span className="text-[10px] sm:text-xs font-semibold">Card</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod("maya")} 
                  className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all ${paymentMethod === "maya" ? "border-royal bg-royal/5 text-royal" : "border-line text-ink-soft hover:border-royal/30 hover:bg-pale"}`}
                >
                  <ScanLine size={20} className={paymentMethod === "maya" ? "text-royal" : ""} /> 
                  <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">Maya/GCash</span>
                </button>
              </div>

              {error && <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 text-red-600 text-[10px] sm:text-sm rounded-lg flex items-center gap-2"><AlertTriangle size={14}/>{error}</div>}

              {/* Huge Action Button */}
              <button 
                onClick={handleOpenPayment} 
                disabled={cart.length === 0}
                className="w-full h-12 sm:h-16 flex justify-center items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-royal text-base sm:text-lg font-semibold text-white transition-all hover:bg-royal-deep hover:shadow-xl hover:shadow-royal/20 active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed"
              >
                CHARGE ₱{total.toLocaleString()}
              </button>
            </div>

          </div>
        </div>

      </div>

      {renderPaymentModal()}
      {renderSuccessModal()}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-line shrink-0 bg-white">
              <h2 className="font-serif text-xl font-semibold text-ink flex items-center gap-2">
                <ReceiptText className="text-royal" size={24} />
                Recent Transactions
              </h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 -mr-2 text-ink-soft hover:text-ink hover:bg-pale rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-[#f4f7f9] flex-1 min-h-[300px]">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-soft">
                  <Loader2 className="animate-spin mb-4 text-royal" size={32} />
                  <p className="text-sm">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-soft bg-white rounded-xl border border-line">
                  <ReceiptText className="mx-auto mb-3 opacity-20" size={48} />
                  <p className="text-sm">No recent transactions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.reference_number} className="bg-white border border-line rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-mono text-sm font-semibold text-ink bg-pale px-2 py-0.5 rounded border border-line">
                            {t.reference_number}
                          </span>
                          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                            t.type === 'Retail Sale' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {t.type}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-ink-soft flex items-center gap-2">
                          <span>
                            {t.date.toLocaleString('en-US', { 
                              month: 'short', day: 'numeric', 
                              hour: 'numeric', minute: '2-digit' 
                            })}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-line"></span>
                          <span className="capitalize">{t.method.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-mono font-bold text-lg text-ink bg-pale px-3 py-1 rounded-lg">
                          ₱{t.amount.toLocaleString()}
                        </div>
                        <button
                          onClick={() => window.open(`/admin/receipt/${t.reference_number}`, '_blank')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-line rounded-lg text-ink hover:text-royal hover:border-royal hover:bg-pale transition-colors"
                        >
                          <Printer size={14} />
                          Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
