/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { fetchAppointmentsForExport } from "./exportActions";
import * as ExcelJS from "exceljs";
import toast from "react-hot-toast";

export function ExportAppointmentsCSV({ appointments }: { appointments?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("");

  const handleExport = async (format: "csv" | "excel") => {
    setIsOpen(false);
    setIsExporting(true);
    setExportType(format);

    try {
      const data = await fetchAppointmentsForExport();
      
      if (data.length === 0) {
        toast.error("No appointments found to export.");
        setIsExporting(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const filename = `appointments_report_${today}`;

      if (format === "csv") {
        const headers = Object.keys(data[0]);
        const rows = data.map(row => 
          headers.map(h => {
            let val = (row as any)[h];
            if (val == null) val = "";
            val = String(val).replace(/"/g, '""'); 
            if (h === "Contact Number") {
              return `="""${val}"""`; // Excel CSV text trick
            }
            return `"${val}"`;
          }).join(",")
        );
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Appointments", {
          views: [{ showGridLines: false }]
        });

        // 1. Add Logo
        try {
          const response = await fetch('/logo.png');
          const blob = await response.blob();
          const base64Str = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const base64Data = base64Str.split(',')[1];
          const logoId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });
          // Place logo in top left
          sheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 100, height: 100 }
          });
        } catch(e) {
          console.warn("Could not load logo for export", e);
        }

        // Adjust row heights for the logo
        sheet.getRow(1).height = 30;
        sheet.getRow(2).height = 30;
        sheet.getRow(3).height = 30;
        sheet.getRow(4).height = 30;

        // Header Text
        const headerCell = sheet.getCell('B2');
        headerCell.value = "CINDYRELLA AESTHETIC & WELLNESS";
        headerCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFD4AF37' } }; // Gold color
        headerCell.alignment = { vertical: 'middle', horizontal: 'left' };

        sheet.getCell('B3').value = "APPOINTMENTS REPORT";
        sheet.getCell('B3').font = { bold: true, size: 12, color: { argb: 'FF4A4A4A' } };
        sheet.getCell('B4').value = `Report Date: ${today}`;
        
        const branches = Array.from(new Set(data.map(d => d.Branch))).join(", ");
        sheet.getCell('B5').value = `Branch: ${branches}`;
        sheet.getCell('B5').font = { italic: true, color: { argb: 'FF666666' } };

        // 2. Summaries
        const totalAppointments = data.length;
        const totalCompleted = data.filter(d => d["Appointment Status"].toLowerCase() === "completed").length;
        const totalCancelled = data.filter(d => d["Appointment Status"].toLowerCase() === "cancelled").length;
        const totalAmountDue = data.reduce((acc, curr) => acc + (Number(curr["Amount Due"]) || 0), 0);
        const totalPaid = data.filter(d => d["Payment Status"].toLowerCase() === "paid").reduce((acc, curr) => acc + (Number(curr["Amount Due"]) || 0), 0);

        sheet.getCell('B8').value = "APPOINTMENT SUMMARY";
        sheet.getCell('B8').font = { bold: true };
        sheet.getCell('B9').value = `Total Appointments: ${totalAppointments}`;
        sheet.getCell('B10').value = `Completed: ${totalCompleted}`;
        sheet.getCell('B11').value = `Cancelled: ${totalCancelled}`;

        sheet.getCell('D8').value = "FINANCIAL SUMMARY";
        sheet.getCell('D8').font = { bold: true };
        sheet.getCell('D9').value = "Total Amount Due:";
        sheet.getCell('E9').value = totalAmountDue;
        sheet.getCell('E9').numFmt = '"₱"#,##0.00';
        
        sheet.getCell('D10').value = "Total Paid:";
        sheet.getCell('E10').value = totalPaid;
        sheet.getCell('E10').numFmt = '"₱"#,##0.00';

        // 3. Table Data
        const headers = Object.keys(data[0]);
        const startRow = 14;

        // Add Headers
        const headerRow = sheet.getRow(startRow);
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A4A4A' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
          };
        });
        
        sheet.autoFilter = {
          from: { row: startRow, column: 1 },
          to: { row: startRow, column: headers.length }
        };
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: startRow }];

        // Add Rows
        data.forEach((row, rowIndex) => {
          const r = sheet.getRow(startRow + 1 + rowIndex);
          headers.forEach((h, colIndex) => {
            const cell = r.getCell(colIndex + 1);
            let val = (row as any)[h];
            
            if (h === "Amount Due") {
              cell.value = Number(val) || 0;
              cell.numFmt = '"₱"#,##0.00';
            } else if (h === "Contact Number") {
              // Force contact number as text so it doesn't lose leading zeros or become scientific
              cell.value = String(val);
              cell.numFmt = '@'; 
            } else {
              cell.value = val;
            }

            cell.border = {
              top: {style:'thin', color: {argb:'FFEEEEEE'}}, 
              left: {style:'thin', color: {argb:'FFEEEEEE'}}, 
              bottom: {style:'thin', color: {argb:'FFEEEEEE'}}, 
              right: {style:'thin', color: {argb:'FFEEEEEE'}}
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
            
            // Alternate row colors
            if (rowIndex % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
          });
        });

        // 4. Auto-fit Columns
        sheet.columns.forEach((column, i) => {
          let maxLength = 0;
          column.eachCell!({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber >= startRow) { 
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) maxLength = columnLength;
            }
          });
          column.width = Math.min(Math.max(maxLength + 2, 15), 50); // limit width to 50
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success("Appointments report exported successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export appointments.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-royal hover:text-royal disabled:opacity-50 shadow-sm"
      >
        <Download size={16} />
        {isExporting ? `Exporting ${exportType === 'csv' ? 'CSV' : 'Excel'}...` : "Export"}
        <ChevronDown size={14} className="ml-1 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-1">
              <button 
                onClick={() => handleExport("csv")}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-pale font-medium transition-colors"
              >
                <FileText size={16} className="text-royal" />
                Export CSV
              </button>
              <button 
                onClick={() => handleExport("excel")}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-pale font-medium transition-colors"
              >
                <FileSpreadsheet size={16} className="text-green-600" />
                Export Excel (.xlsx)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
