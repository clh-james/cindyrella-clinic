/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { upsertTreatment, deleteTreatment } from "./actions";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export function ServicesClient({ initialTreatments }: { initialTreatments: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [treatments] = useState(initialTreatments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openModal = (t: any = null) => {
    setEditingTreatment(t);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTreatment(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await upsertTreatment(formData);
      if (res.error) {
        setError(res.error);
      } else {
        closeModal();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    startTransition(async () => {
      await deleteTreatment(id);
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Services & Pricing</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">View and manage your clinic and spa treatments.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-royal text-white rounded-lg font-medium text-sm hover:bg-royal/90 transition-colors"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* MOBILE VIEW (CARDS) */}
      <div className="mt-6 grid gap-4 lg:hidden">
        {treatments.map((t) => (
          <div key={t.id} className="rounded-xl border border-line bg-white p-4 shadow-sm flex flex-col gap-3 relative">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button onClick={() => openModal(t)} className="p-1.5 text-ink-soft hover:text-royal hover:bg-royal/10 rounded-md transition-colors"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
            </div>
            
            <div className="flex justify-between items-start gap-2 pr-16">
              <div>
                <h3 className="font-semibold text-ink leading-tight text-base">{t.name}</h3>
                <p className="text-xs text-ink-soft capitalize mt-0.5">{t.category}</p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${t.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 border-t border-line border-dashed pt-3 mt-1">
              <div>
                <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Session Price</p>
                <p className="font-mono font-bold text-royal">{peso(t.session_price)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Duration</p>
                <p className="font-medium text-ink text-sm">{t.duration_minutes ? `${t.duration_minutes} min` : '-'}</p>
              </div>
            </div>
            
            {(t.five_plus_one_price || t.ten_plus_two_price) && (
              <div className="grid grid-cols-2 gap-3 bg-pale/50 p-2.5 rounded-lg border border-line/50">
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">5 + 1 Price</p>
                  <p className="font-mono text-sm text-ink">{t.five_plus_one_price ? peso(t.five_plus_one_price) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">10 + 2 Price</p>
                  <p className="font-mono text-sm text-ink">{t.ten_plus_two_price ? peso(t.ten_plus_two_price) : '-'}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {treatments.length === 0 && (
          <div className="py-10 text-center text-sm text-ink-soft border border-line rounded-xl bg-white">
            No services found.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="mt-6 hidden lg:block overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink border-b border-line">
              <th className="px-5 py-3 font-medium">Service Name</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Session Price</th>
              <th className="px-5 py-3 font-medium">5 + 1 Price</th>
              <th className="px-5 py-3 font-medium">10 + 2 Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {treatments.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-pale/50 transition-colors">
                <td className="px-5 py-4 font-medium text-ink">{t.name}</td>
                <td className="px-5 py-4 text-ink-soft">{t.category}</td>
                <td className="px-5 py-4 text-ink-soft">{t.duration_minutes ? `${t.duration_minutes} min` : '-'}</td>
                <td className="px-5 py-4 text-ink font-mono">{peso(t.session_price)}</td>
                <td className="px-5 py-4 text-ink-soft font-mono">{t.five_plus_one_price ? peso(t.five_plus_one_price) : '-'}</td>
                <td className="px-5 py-4 text-ink-soft font-mono">{t.ten_plus_two_price ? peso(t.ten_plus_two_price) : '-'}</td>
                <td className="px-5 py-4 text-ink-soft">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wider font-bold border ${t.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openModal(t)} className="p-1.5 text-ink-soft hover:text-royal hover:bg-royal/10 rounded-md transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-line bg-pale">
              <h2 className="font-bold text-ink text-lg">{editingTreatment ? "Edit Service" : "Add Service"}</h2>
              <button onClick={closeModal} className="p-1.5 text-ink-soft hover:text-ink hover:bg-line/50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              
              {editingTreatment && <input type="hidden" name="id" value={editingTreatment.id} />}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">Service Name *</label>
                  <input required name="name" defaultValue={editingTreatment?.name} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="e.g. Total Glow Drip" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">Category *</label>
                  <input required name="category" defaultValue={editingTreatment?.category} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="e.g. IV Therapy" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">Duration (Mins)</label>
                  <input type="number" name="duration_minutes" defaultValue={editingTreatment?.duration_minutes} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="e.g. 45" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">Session Price (₱) *</label>
                  <input required type="number" step="0.01" name="session_price" defaultValue={editingTreatment?.session_price} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="0.00" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">Sort Order</label>
                  <input type="number" name="sort_order" defaultValue={editingTreatment?.sort_order || 0} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">5+1 Package (₱)</label>
                  <input type="number" step="0.01" name="five_plus_one_price" defaultValue={editingTreatment?.five_plus_one_price} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="0.00" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">10+2 Package (₱)</label>
                  <input type="number" step="0.01" name="ten_plus_two_price" defaultValue={editingTreatment?.ten_plus_two_price} className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-royal" placeholder="0.00" />
                </div>

                <div className="col-span-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="hidden" name="is_active" value="false" />
                    <input type="checkbox" name="is_active" value="true" defaultChecked={editingTreatment ? editingTreatment.is_active : true} className="w-4 h-4 text-royal border-line rounded focus:ring-royal" />
                    <span className="text-sm font-medium text-ink">Service is Active and bookable</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-line mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-pale hover:bg-line/50 text-ink font-medium text-sm rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-royal hover:bg-royal/90 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50">
                  {isPending ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
