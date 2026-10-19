"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { UsedItemsModal } from "./UsedItemsModal";

interface AppointmentUsedItemsButtonProps {
  appointmentId: string;
  referenceNumber: string;
  treatmentName: string;
  clientName: string;
  status: string;
  allItems?: { id: string; name: string; unit: string; current_stock: number }[];
}

export function AppointmentUsedItemsButton({
  appointmentId,
  referenceNumber,
  treatmentName,
  clientName,
  status,
  allItems = [],
}: AppointmentUsedItemsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  const isCompleted = currentStatus === "completed";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isCompleted
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-line bg-paper text-ink hover:bg-pale hover:border-royal"
        }`}
        title="View & manage consumables used for this treatment"
      >
        <Package size={13} className={isCompleted ? "text-emerald-600" : "text-royal"} />
        <span>Used Items</span>
        {isCompleted && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        )}
      </button>

      <UsedItemsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        appointmentId={appointmentId}
        referenceNumber={referenceNumber}
        treatmentName={treatmentName}
        clientName={clientName}
        status={currentStatus}
        allItems={allItems}
        onStatusChange={(newStatus) => setCurrentStatus(newStatus)}
      />
    </>
  );
}
