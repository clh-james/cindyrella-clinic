import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle, Clock, User, BriefcaseMedical, MapPin } from "lucide-react";
import { CheckinButton } from "./CheckinButton";

export default async function CheckinPage({ params }: { params: { reference: string } }) {
  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, customers(*), treatments(*), branches(*)")
    .eq("reference_number", params.reference)
    .single();

  if (!appointment) {
    notFound();
  }

  const customer = appointment.customers as any;
  const treatment = appointment.treatments as any;
  const branch = appointment.branches as any;

  return (
    <div className="mx-auto max-w-lg mt-8">
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="bg-pale p-6 text-center border-b border-line">
          <h1 className="font-serif text-2xl font-semibold text-ink">Check-in</h1>
          <p className="text-ink-soft text-sm mt-1">Ref: {appointment.reference_number}</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <User className="h-5 w-5 text-royal shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">{customer.first_name} {customer.last_name}</p>
              <p className="text-sm text-ink-soft">{customer.phone} • {customer.email}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <BriefcaseMedical className="h-5 w-5 text-royal shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">{treatment.name}</p>
              <p className="text-sm text-ink-soft">{treatment.duration_minutes} minutes</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-royal shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">{new Date(appointment.appointment_date).toLocaleDateString()}</p>
              <p className="text-sm text-ink-soft">{appointment.appointment_time}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <MapPin className="h-5 w-5 text-royal shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">{branch.name}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-line">
            <p className="text-sm font-medium text-ink mb-2">Status</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium capitalize border border-line ${
              appointment.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-pale text-ink-soft'
            }`}>
              {appointment.status === 'checked_in' && <CheckCircle size={14} />}
              {appointment.status.replace("_", " ")}
            </span>
          </div>
        </div>
        
        <div className="p-6 bg-pale/50 border-t border-line">
          {appointment.status === 'pending' || appointment.status === 'confirmed' ? (
            <CheckinButton appointmentId={appointment.id} />
          ) : (
            <p className="text-center text-sm font-medium text-ink-soft">
              This appointment cannot be checked in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
