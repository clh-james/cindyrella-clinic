"use client";

import { useState } from "react";
import { RippleButton } from "@/components/RippleButton";
import { Check } from "lucide-react";
import { Treatment } from "@/lib/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

const DATES = ["Today", "Tomorrow", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = ["10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM"];

export function BookingForm({ treatments }: { treatments: Treatment[] }) {
  const [step, setStep] = useState(1);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-sm relative overflow-hidden">
      {/* Progress Bar */}
      <div className="flex mb-8 items-center justify-between">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-royal' : 'bg-pale'} transition-colors duration-500`} />
        <div className="w-4" />
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-royal' : 'bg-pale'} transition-colors duration-500`} />
        <div className="w-4" />
        <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-royal' : 'bg-pale'} transition-colors duration-500`} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col"
          >
            <h2 className="text-xl font-semibold text-ink mb-6">1. Select a Treatment</h2>
            <div className="grid gap-4 sm:grid-cols-2 max-h-[60vh] overflow-y-auto no-scrollbar pb-4 pr-2 -mr-2">
              {treatments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTreatment(t.id)}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all ${
                    selectedTreatment === t.id 
                      ? "border-royal bg-royal/5" 
                      : "border-line bg-white hover:border-royal/50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full mb-2">
                    <span className="font-semibold text-ink font-serif text-lg">{t.name}</span>
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTreatment === t.id ? "border-royal bg-royal text-white" : "border-line"
                    }`}>
                      {selectedTreatment === t.id && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-sm text-ink-soft line-clamp-2 mb-3 h-10">{t.primary_desc}</span>
                  <span className="font-semibold text-ink mt-auto">₱{t.session_price.toLocaleString()}</span>
                </button>
              ))}
            </div>
            
            <RippleButton
              onClick={() => setStep(2)}
              className={`mt-8 w-full rounded-full py-4 text-center font-semibold text-white transition-all ${
                selectedTreatment ? "bg-royal hover:bg-royal-deep shadow-lg" : "bg-ink-soft/30 cursor-not-allowed"
              }`}
            >
              Continue
            </RippleButton>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col"
          >
            <h2 className="text-xl font-semibold text-ink mb-6">2. Pick a Date & Time</h2>
            
            <p className="text-sm font-medium text-ink-soft mb-3">Available Dates</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {DATES.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-[48px] rounded-xl border-2 font-medium text-sm transition-all ${
                    selectedDate === date 
                      ? "border-royal bg-royal text-white shadow-md" 
                      : "border-line bg-white text-ink hover:border-royal/50"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-ink-soft mb-3">Available Times</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`min-h-[48px] rounded-xl border-2 font-medium text-sm transition-all ${
                    selectedTime === time 
                      ? "border-royal bg-royal text-white shadow-md" 
                      : "border-line bg-white text-ink hover:border-royal/50"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            
            <div className="flex gap-4 mt-auto">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-full border-2 border-line font-medium text-ink hover:bg-pale transition-colors">
                Back
              </button>
              <RippleButton
                onClick={() => setStep(3)}
                className={`flex-1 rounded-full py-4 text-center font-semibold text-white transition-all ${
                  selectedDate && selectedTime ? "bg-royal hover:bg-royal-deep shadow-lg" : "bg-ink-soft/30 cursor-not-allowed"
                }`}
              >
                Continue
              </RippleButton>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col"
          >
            <h2 className="text-xl font-semibold text-ink mb-6">3. Your Details</h2>
            
            <div className="flex flex-col gap-5 mb-10">
              <div>
                <label className="block text-sm font-medium text-ink mb-2 pl-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Jane Doe" 
                  className="w-full min-h-[56px] rounded-2xl border-2 border-line bg-pale/50 px-5 outline-none transition-colors focus:border-royal focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2 pl-1">Mobile Number</label>
                <input 
                  type="tel" 
                  placeholder="0917 123 4567" 
                  className="w-full min-h-[56px] rounded-2xl border-2 border-line bg-pale/50 px-5 outline-none transition-colors focus:border-royal focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2 pl-1">Any medical notes? (Optional)</label>
                <textarea 
                  placeholder="Allergies, conditions, etc." 
                  rows={3}
                  className="w-full rounded-2xl border-2 border-line bg-pale/50 px-5 py-4 outline-none transition-colors focus:border-royal focus:bg-white resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-auto">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-full border-2 border-line font-medium text-ink hover:bg-pale transition-colors">
                Back
              </button>
              <RippleButton
                onClick={() => alert("Booking request sent!")}
                className="flex-1 bg-royal hover:bg-royal-deep shadow-lg rounded-full py-4 text-center font-semibold text-white transition-all"
              >
                Confirm Booking
              </RippleButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
