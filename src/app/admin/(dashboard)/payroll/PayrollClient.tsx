"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  Sparkles,
  Play,
  FileText,
  History,
  FileSpreadsheet,
  Settings,
  Plus,
} from "lucide-react";
import {
  PayrollRun,
  PayrollItem,
  EmployeeCompensation,
  AttendanceRecord,
  CommissionRecord,
  ThirteenthMonthRecord,
  BranchInfo,
  StaffBasic,
} from "./types";
import { PayrollDashboardTab } from "./PayrollDashboardTab";
import { SalarySetupTab } from "./SalarySetupTab";
import { AttendanceTab } from "./AttendanceTab";
import { CommissionsTab } from "./CommissionsTab";
import { ProcessingTab } from "./ProcessingTab";
import { PayslipsTab } from "./PayslipsTab";
import { HistoryTab } from "./HistoryTab";
import { ReportsTab } from "./ReportsTab";
import { SettingsTab } from "./SettingsTab";

// Modals
import { SalaryConfigModal } from "@/components/admin/payroll/SalaryConfigModal";
import { AttendanceLogModal } from "@/components/admin/payroll/AttendanceLogModal";
import { CommissionClaimModal } from "@/components/admin/payroll/CommissionClaimModal";
import { PayrollRunModal } from "@/components/admin/payroll/PayrollRunModal";
import { PayslipPrintView } from "@/components/admin/payroll/PayslipPrintView";
import { useRouter } from "next/navigation";

interface PayrollClientProps {
  initialRuns: PayrollRun[];
  initialCompensations: EmployeeCompensation[];
  initialAttendance: AttendanceRecord[];
  initialCommissions: CommissionRecord[];
  initialThirteenthMonth: ThirteenthMonthRecord[];
  branches: BranchInfo[];
  staffList: StaffBasic[];
  currentStaff: {
    id: string;
    fullName: string;
    role: string;
    branchId?: string | null;
  };
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canCalculate: boolean;
    canApprove: boolean;
    canRelease: boolean;
    canManageSettings: boolean;
    canExportReports: boolean;
    canViewAllBranches: boolean;
  };
}

export function PayrollClient({
  initialRuns,
  initialCompensations,
  initialAttendance,
  initialCommissions,
  initialThirteenthMonth,
  branches,
  staffList,
  currentStaff,
  permissions,
}: PayrollClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(initialRuns[0] || null);

  // Modals
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedCompToEdit, setSelectedCompToEdit] = useState<EmployeeCompensation | null>(null);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null);

  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);

  // Payslip Print Preview
  const [payslipItemToPrint, setPayslipItemToPrint] = useState<PayrollItem | null>(null);
  const [payslipRunContext, setPayslipRunContext] = useState<PayrollRun | null>(null);

  // Refresh helper
  const handleRefresh = () => {
    router.refresh();
  };

  // Tab definitions
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "salary_setup", label: "Employee Salary Setup", icon: Users, count: initialCompensations.length },
    { id: "attendance", label: "Attendance & Overtime", icon: Clock },
    { id: "commissions", label: "Commissions", icon: Sparkles, count: initialCommissions.length },
    { id: "processing", label: "Payroll Processing", icon: Play },
    { id: "payslips", label: "Payslips", icon: FileText },
    { id: "history", label: "Payroll History", icon: History, count: initialRuns.length },
    { id: "reports", label: "Payroll Reports", icon: FileSpreadsheet },
    { id: "settings", label: "Payroll Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              Clinic Payroll Management
            </h1>
            <span className="rounded-full bg-royal/10 px-2.5 py-0.5 text-xs font-bold text-royal">
              Enterprise
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Compliant Philippine payroll calculations, treatment commissions, attendance logs, and statutory remittances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canCreate && (
            <button
              onClick={() => setIsNewRunModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
            >
              <Plus size={14} /> New Payroll Run
            </button>
          )}
        </div>
      </div>

      {/* 9 Tab Navigation Buttons */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max rounded-2xl border border-line bg-white p-1.5 shadow-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-royal text-white shadow-xs"
                    : "text-ink-soft hover:bg-pale/70 hover:text-ink"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-pale text-ink-soft"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "dashboard" && (
          <PayrollDashboardTab
            runs={initialRuns}
            compensations={initialCompensations}
            attendance={initialAttendance}
            branches={branches}
            canViewAllBranches={permissions.canViewAllBranches}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
            onSelectRun={(run) => {
              setSelectedRun(run);
              setActiveTab("processing");
            }}
            onNewRun={() => setIsNewRunModalOpen(true)}
          />
        )}

        {activeTab === "salary_setup" && (
          <SalarySetupTab
            compensations={initialCompensations}
            staffList={staffList}
            branches={branches}
            canManageSettings={permissions.canManageSettings}
            onEditCompensation={(comp) => {
              setSelectedCompToEdit(comp);
              setIsSalaryModalOpen(true);
            }}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceTab
            attendance={initialAttendance}
            branches={branches}
            staffList={staffList}
            onOpenLogModal={(rec) => {
              setSelectedAttendanceRecord(rec || null);
              setIsAttendanceModalOpen(true);
            }}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "commissions" && (
          <CommissionsTab
            commissions={initialCommissions}
            branches={branches}
            staffList={staffList}
            onOpenCommissionModal={() => setIsCommissionModalOpen(true)}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "processing" && (
          <ProcessingTab
            activeRun={selectedRun}
            runs={initialRuns}
            compensations={initialCompensations}
            attendance={initialAttendance}
            commissions={initialCommissions}
            branches={branches}
            currentStaffId={currentStaff.id}
            isSuperAdmin={currentStaff.role === "super_admin"}
            onSelectRun={(run) => setSelectedRun(run)}
            onViewPayslip={(item) => {
              setPayslipItemToPrint(item);
              setPayslipRunContext(selectedRun);
            }}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "payslips" && (
          <PayslipsTab
            runs={initialRuns}
            branches={branches}
            currentStaffId={currentStaff.id}
            isSuperAdmin={currentStaff.role === "super_admin"}
            onViewPayslip={(item, run) => {
              setPayslipItemToPrint(item);
              setPayslipRunContext(run || null);
            }}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            runs={initialRuns}
            branches={branches}
            onSelectRun={(run) => {
              setSelectedRun(run);
              setActiveTab("processing");
            }}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            runs={initialRuns}
            commissions={initialCommissions}
            attendance={initialAttendance}
            thirteenthMonth={initialThirteenthMonth}
            branches={branches}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab canManageSettings={permissions.canManageSettings} />
        )}
      </div>

      {/* Modals */}
      {isSalaryModalOpen && (
        <SalaryConfigModal
          compensation={selectedCompToEdit}
          staffList={staffList}
          branches={branches}
          onClose={() => {
            setIsSalaryModalOpen(false);
            setSelectedCompToEdit(null);
          }}
          onSaved={() => {
            setIsSalaryModalOpen(false);
            setSelectedCompToEdit(null);
            handleRefresh();
          }}
        />
      )}

      {isAttendanceModalOpen && (
        <AttendanceLogModal
          record={selectedAttendanceRecord}
          staffList={staffList}
          branches={branches}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setSelectedAttendanceRecord(null);
          }}
          onSaved={() => {
            setIsAttendanceModalOpen(false);
            setSelectedAttendanceRecord(null);
            handleRefresh();
          }}
        />
      )}

      {isCommissionModalOpen && (
        <CommissionClaimModal
          staffList={staffList}
          branches={branches}
          onClose={() => setIsCommissionModalOpen(false)}
          onSaved={() => {
            setIsCommissionModalOpen(false);
            handleRefresh();
          }}
        />
      )}

      {isNewRunModalOpen && (
        <PayrollRunModal
          branches={branches}
          canViewAllBranches={permissions.canViewAllBranches}
          onClose={() => setIsNewRunModalOpen(false)}
          onCreated={(run) => {
            setIsNewRunModalOpen(false);
            setSelectedRun(run);
            setActiveTab("processing");
            handleRefresh();
          }}
        />
      )}

      {/* Payslip Print Modal */}
      {payslipItemToPrint && (
        <PayslipPrintView
          item={payslipItemToPrint}
          run={payslipRunContext}
          onClose={() => {
            setPayslipItemToPrint(null);
            setPayslipRunContext(null);
          }}
        />
      )}
    </div>
  );
}
