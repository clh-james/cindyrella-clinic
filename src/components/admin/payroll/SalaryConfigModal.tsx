"use client";

import { useState } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import {
  EmployeeCompensation,
  StaffBasic,
  BranchInfo,
  AllowanceItem,
  EmploymentStatus,
  EmploymentType,
  SalaryType,
  PayrollFrequency,
} from "@/app/admin/(dashboard)/payroll/types";
import { saveEmployeeCompensation } from "@/app/admin/(dashboard)/payroll/actions";
import toast from "react-hot-toast";

interface SalaryConfigModalProps {
  compensation: EmployeeCompensation | null;
  staffList: StaffBasic[];
  branches: BranchInfo[];
  onClose: () => void;
  onSaved: () => void;
}

export function SalaryConfigModal({
  compensation,
  staffList,
  branches,
  onClose,
  onSaved,
}: SalaryConfigModalProps) {
  const [employeeId, setEmployeeId] = useState(compensation?.employee_id || staffList[0]?.id || "");
  const [branchId, setBranchId] = useState(compensation?.branch_id || branches[0]?.id || "");
  const [position, setPosition] = useState(compensation?.position || "Aesthetician");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(compensation?.employment_status || "active");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(compensation?.employment_type || "regular");
  const [salaryType, setSalaryType] = useState<SalaryType>(compensation?.salary_type || "monthly");
  const [basicSalary, setBasicSalary] = useState(compensation?.basic_salary?.toString() || "20000");
  const [dailyRate, setDailyRate] = useState(compensation?.daily_rate?.toString() || "769.23");
  const [hourlyRate, setHourlyRate] = useState(compensation?.hourly_rate?.toString() || "96.15");
  const [payrollFrequency, setPayrollFrequency] = useState<PayrollFrequency>(compensation?.payroll_frequency || "semi_monthly");
  const [effectiveDate, setEffectiveDate] = useState(
    compensation?.effective_date || new Date().toISOString().slice(0, 10)
  );
  
  // Allowances
  const [allowances, setAllowances] = useState<AllowanceItem[]>(
    compensation?.allowances || [
      { id: "1", name: "Rice Subsidy", amount: 1500, is_taxable: false, is_de_minimis: true },
      { id: "2", name: "Transportation", amount: 1000, is_taxable: false, is_de_minimis: true },
    ]
  );

  // Eligibility & Statutory
  const [commissionEligible, setCommissionEligible] = useState(compensation?.commission_eligible ?? true);
  const [overtimeEligible, setOvertimeEligible] = useState(compensation?.overtime_eligible ?? true);
  const [sssEnabled, setSssEnabled] = useState(compensation?.sss_enabled ?? true);
  const [philhealthEnabled, setPhilhealthEnabled] = useState(compensation?.philhealth_enabled ?? true);
  const [pagibigEnabled, setPagibigEnabled] = useState(compensation?.pagibig_enabled ?? true);
  const [pagibigCustomAmount, setPagibigCustomAmount] = useState(
    compensation?.pagibig_custom_amount?.toString() || "200"
  );
  const [taxExempt, setTaxExempt] = useState(compensation?.tax_exempt ?? false);
  const [isMinimumWageEarner, setIsMinimumWageEarner] = useState(compensation?.is_minimum_wage_earner ?? false);

  // Bank info
  const [bankName, setBankName] = useState(compensation?.bank_name || "BDO");
  const [bankAccountNumber, setBankAccountNumber] = useState(compensation?.bank_account_number || "");
  const [bankAccountName, setBankAccountName] = useState(compensation?.bank_account_name || "");
  const [notes, setNotes] = useState(compensation?.notes || "");

  const [loading, setLoading] = useState(false);

  // Auto calculate daily and hourly when basic salary changes
  const handleBasicSalaryChange = (val: string) => {
    setBasicSalary(val);
    const num = parseFloat(val) || 0;
    if (salaryType === "monthly" && num > 0) {
      const computedDaily = Math.round((num / 26) * 100) / 100;
      const computedHourly = Math.round((computedDaily / 8) * 100) / 100;
      setDailyRate(computedDaily.toString());
      setHourlyRate(computedHourly.toString());
    }
  };

  const handleAddAllowance = () => {
    setAllowances([
      ...allowances,
      {
        id: Date.now().toString(),
        name: "New Allowance",
        amount: 500,
        is_taxable: false,
        is_de_minimis: true,
      },
    ]);
  };

  const handleRemoveAllowance = (id: string) => {
    setAllowances(allowances.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await saveEmployeeCompensation({
        id: compensation?.id,
        employee_id: employeeId,
        branch_id: branchId,
        position,
        employment_status: employmentStatus,
        employment_type: employmentType,
        salary_type: salaryType,
        basic_salary: parseFloat(basicSalary) || 0,
        daily_rate: parseFloat(dailyRate) || 0,
        hourly_rate: parseFloat(hourlyRate) || 0,
        payroll_frequency: payrollFrequency,
        effective_date: effectiveDate,
        allowances,
        commission_eligible: commissionEligible,
        overtime_eligible: overtimeEligible,
        sss_enabled: sssEnabled,
        philhealth_enabled: philhealthEnabled,
        pagibig_enabled: pagibigEnabled,
        pagibig_custom_amount: parseFloat(pagibigCustomAmount) || 200,
        tax_exempt: taxExempt,
        is_minimum_wage_earner: isMinimumWageEarner,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
        notes,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save configuration");
      } else {
        toast.success("Employee salary setup updated successfully!");
        onSaved();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save compensation";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-ink">
              {compensation ? "Edit Employee Compensation" : "New Employee Salary Setup"}
            </h2>
            <p className="text-xs text-ink-soft">
              Configure base wages, allowance package, and statutory contribution rules
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Employee & Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!!compensation}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.roles?.name || "Staff"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Clinical Position</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Senior Aesthetic Nurse"
                required
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              />
            </div>
          </div>

          {/* Classification & Pay Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                <option value="regular">Regular</option>
                <option value="probationary">Probationary</option>
                <option value="part_time">Part-Time</option>
                <option value="contractual">Contractual</option>
                <option value="commission_based">Commission-Based</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Salary Type</label>
              <select
                value={salaryType}
                onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                <option value="monthly">Monthly Salaried</option>
                <option value="daily">Daily Paid</option>
                <option value="hourly">Hourly Paid</option>
                <option value="commission_based">Pure Commission</option>
                <option value="mixed">Mixed (Base + Comm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Payroll Frequency</label>
              <select
                value={payrollFrequency}
                onChange={(e) => setPayrollFrequency(e.target.value as PayrollFrequency)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                <option value="semi_monthly">Semi-Monthly (1st & 2nd Cutoff)</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-pale/30 border border-line p-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Basic Salary (₱ / month)</label>
              <input
                type="number"
                step="0.01"
                value={basicSalary}
                onChange={(e) => handleBasicSalaryChange(e.target.value)}
                placeholder="20000.00"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-mono font-semibold text-ink focus:border-royal focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Daily Rate (₱ / day)</label>
              <input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="769.23"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-mono font-semibold text-ink focus:border-royal focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Hourly Rate (₱ / hr)</label>
              <input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="96.15"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-mono font-semibold text-ink focus:border-royal focus:outline-hidden"
              />
            </div>
          </div>

          {/* Allowances Package */}
          <div className="rounded-2xl border border-line p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">Allowances & Subsidies</h4>
                <p className="text-[11px] text-ink-soft">De minimis non-taxable and special taxable allowances</p>
              </div>
              <button
                type="button"
                onClick={handleAddAllowance}
                className="flex items-center gap-1 rounded-xl bg-royal/10 px-3 py-1.5 text-xs font-semibold text-royal hover:bg-royal/20"
              >
                <Plus size={14} /> Add Allowance
              </button>
            </div>

            <div className="space-y-2">
              {allowances.map((al, idx) => (
                <div key={al.id || idx} className="flex items-center gap-3 rounded-xl bg-pale/40 p-2.5 border border-line text-xs">
                  <input
                    type="text"
                    value={al.name}
                    onChange={(e) => {
                      const updated = [...allowances];
                      updated[idx].name = e.target.value;
                      setAllowances(updated);
                    }}
                    placeholder="Allowance Name"
                    className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-ink-soft">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      value={al.amount}
                      onChange={(e) => {
                        const updated = [...allowances];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setAllowances(updated);
                      }}
                      className="w-24 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-mono font-semibold text-ink"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-soft cursor-pointer">
                    <input
                      type="checkbox"
                      checked={al.is_taxable}
                      onChange={(e) => {
                        const updated = [...allowances];
                        updated[idx].is_taxable = e.target.checked;
                        setAllowances(updated);
                      }}
                      className="rounded border-line text-royal"
                    />
                    Taxable
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllowance(al.id)}
                    className="p-1.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Settings & Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-pale/20 border border-line p-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={sssEnabled}
                onChange={(e) => setSssEnabled(e.target.checked)}
                className="rounded border-line text-royal"
              />
              SSS Contribution
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={philhealthEnabled}
                onChange={(e) => setPhilhealthEnabled(e.target.checked)}
                className="rounded border-line text-royal"
              />
              PhilHealth (5%)
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={pagibigEnabled}
                onChange={(e) => setPagibigEnabled(e.target.checked)}
                className="rounded border-line text-royal"
              />
              Pag-IBIG / HDMF
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={overtimeEligible}
                onChange={(e) => setOvertimeEligible(e.target.checked)}
                className="rounded border-line text-royal"
              />
              OT Eligible
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={commissionEligible}
                onChange={(e) => setCommissionEligible(e.target.checked)}
                className="rounded border-line text-royal"
              />
              Commission Eligible
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={isMinimumWageEarner}
                onChange={(e) => setIsMinimumWageEarner(e.target.checked)}
                className="rounded border-line text-royal"
              />
              Min. Wage Earner (MWE)
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
              <input
                type="checkbox"
                checked={taxExempt}
                onChange={(e) => setTaxExempt(e.target.checked)}
                className="rounded border-line text-royal"
              />
              Tax Exempt
            </label>
          </div>

          {/* Bank / Disbursal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-line pt-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Disbursement Bank / Channel</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BDO / BPI / Maya / Cash"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Account Number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="xxxx-xxxx-xxxx"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono font-medium text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Account Holder Name</label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Official Account Name"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink"
              />
            </div>
          </div>

          {/* Effective Date, Pag-IBIG Custom Amount & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-line pt-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Pag-IBIG Custom EE (₱)</label>
              <input
                type="number"
                step="50"
                value={pagibigCustomAmount}
                onChange={(e) => setPagibigCustomAmount(e.target.value)}
                placeholder="200"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono font-medium text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Compensation Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contractual terms, de minimis details"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-pale"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 disabled:opacity-50"
            >
              <Save size={15} />
              {loading ? "Saving..." : "Save Compensation Setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
