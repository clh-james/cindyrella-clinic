// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Monthly Detailed Sales Report Excel (.xlsx) Generator using ExcelJS
// ==============================================================================

import ExcelJS from "exceljs";
import { MonthlySalesReportData } from "./monthly-sales-engine";

/**
 * Generates an Excel workbook (.xlsx) matching the reference Cindyrella sales logsheet.
 */
export async function generateMonthlySalesExcel(reportData: MonthlySalesReportData): Promise<Blob> {
  const { summary, rows } = reportData;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cindyrella Management System";
  workbook.lastModifiedBy = "Cindyrella Sales Reports";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(`${summary.monthName} ${summary.year} Sales`, {
    views: [{ state: "frozen", ySplit: 2 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // Border styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFB0C4DE" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    bottom: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCE6F1" }, // Light steel blue from reference
  };

  // ----------------------------------------------------------------------------
  // ROW 1: Grouped Headers
  // ----------------------------------------------------------------------------
  const r1 = worksheet.getRow(1);
  r1.height = 28;
  r1.values = ["Date", "Client Name", "Services Availed", "Deposit/adv pyt", "Amount", "", "", ""];

  // Merge A1:A2, B1:B2, C1:C2, D1:D2, E1:H1
  worksheet.mergeCells("A1:A2");
  worksheet.mergeCells("B1:B2");
  worksheet.mergeCells("C1:C2");
  worksheet.mergeCells("D1:D2");
  worksheet.mergeCells("E1:H1");

  // ----------------------------------------------------------------------------
  // ROW 2: Sub-headers
  // ----------------------------------------------------------------------------
  const r2 = worksheet.getRow(2);
  r2.height = 24;
  r2.getCell(5).value = "Penile Main";
  r2.getCell(6).value = "Penile walk-in";
  r2.getCell(7).value = "Others";
  r2.getCell(8).value = "Total Sales";

  // Style header cells
  for (let rowIdx = 1; rowIdx <= 2; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    for (let colIdx = 1; colIdx <= 8; colIdx++) {
      const cell = row.getCell(colIdx);
      cell.fill = headerFill;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = thinBorder;
    }
  }

  // Row 2 specific alignment
  r2.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
  r2.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
  r2.getCell(7).alignment = { vertical: "middle", horizontal: "right" };
  r2.getCell(8).alignment = { vertical: "middle", horizontal: "right" };

  // ----------------------------------------------------------------------------
  // DATA ROWS
  // ----------------------------------------------------------------------------
  let currentExcelRow = 3;

  for (const rowData of rows) {
    const excelRow = worksheet.getRow(currentExcelRow);
    excelRow.height = 22;

    excelRow.getCell(1).value = rowData.dateFormatted;
    excelRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

    excelRow.getCell(2).value = rowData.clientName;
    excelRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

    excelRow.getCell(3).value = rowData.servicesAvailed;
    excelRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };

    // Deposit column (Green text if > 0)
    const depCell = excelRow.getCell(4);
    if (rowData.depositAmount > 0) {
      depCell.value = rowData.depositAmount;
      depCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF15803D" } };
      depCell.numFmt = "#,##0.00";
    } else {
      depCell.value = "";
    }
    depCell.alignment = { vertical: "middle", horizontal: "right" };

    // Penile Main
    const pmCell = excelRow.getCell(5);
    if (rowData.penileMainAmount > 0) {
      pmCell.value = rowData.penileMainAmount;
      pmCell.numFmt = "#,##0.00";
    } else {
      pmCell.value = "";
    }
    pmCell.alignment = { vertical: "middle", horizontal: "right" };

    // Penile Walk-in
    const pwCell = excelRow.getCell(6);
    if (rowData.penileWalkinAmount > 0) {
      pwCell.value = rowData.penileWalkinAmount;
      pwCell.numFmt = "#,##0.00";
    } else {
      pwCell.value = "";
    }
    pwCell.alignment = { vertical: "middle", horizontal: "right" };

    // Others
    const otCell = excelRow.getCell(7);
    if (rowData.othersAmount > 0) {
      otCell.value = rowData.othersAmount;
      otCell.numFmt = "#,##0.00";
    } else {
      otCell.value = "";
    }
    otCell.alignment = { vertical: "middle", horizontal: "right" };

    // Total Sales
    const tsCell = excelRow.getCell(8);
    tsCell.value = rowData.totalSales;
    tsCell.font = { name: "Arial", size: 9.5, bold: true };
    tsCell.numFmt = "#,##0.00";
    tsCell.alignment = { vertical: "middle", horizontal: "right" };

    // Apply borders & font to data row
    for (let colIdx = 1; colIdx <= 8; colIdx++) {
      const cell = excelRow.getCell(colIdx);
      if (!cell.font) {
        cell.font = { name: "Arial", size: 9.5, color: { argb: "FF1F2937" } };
      }
      cell.border = thinBorder;
    }

    currentExcelRow++;
  }

  // ----------------------------------------------------------------------------
  // EMPTY BLANK ROWS (Spacing like in Excel screenshot)
  // ----------------------------------------------------------------------------
  for (let emptyIdx = 0; emptyIdx < 2; emptyIdx++) {
    const emptyRow = worksheet.getRow(currentExcelRow);
    emptyRow.height = 18;
    for (let c = 1; c <= 8; c++) {
      emptyRow.getCell(c).border = thinBorder;
    }
    currentExcelRow++;
  }

  // ----------------------------------------------------------------------------
  // SUMMARY TOTALS ROW
  // ----------------------------------------------------------------------------
  const summaryRow = worksheet.getRow(currentExcelRow);
  summaryRow.height = 26;

  // Clear 1-3 with top/bottom border
  for (let c = 1; c <= 3; c++) {
    const cell = summaryRow.getCell(c);
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "double", color: { argb: "FF000000" } },
    };
  }

  // Deposit Total (Green bold font)
  const totalDepCell = summaryRow.getCell(4);
  totalDepCell.value = summary.totalDeposits;
  totalDepCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF15803D" } };
  totalDepCell.numFmt = "#,##0.00";
  totalDepCell.alignment = { vertical: "middle", horizontal: "right" };
  totalDepCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  // Penile Main Total (Green bold font)
  const totalPmCell = summaryRow.getCell(5);
  totalPmCell.value = summary.totalPenileMain;
  totalPmCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF15803D" } };
  totalPmCell.numFmt = "#,##0.00";
  totalPmCell.alignment = { vertical: "middle", horizontal: "right" };
  totalPmCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  // Penile Walk-in Total (Purple bold font)
  const totalPwCell = summaryRow.getCell(6);
  totalPwCell.value = summary.totalPenileWalkin;
  totalPwCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF7E22CE" } };
  totalPwCell.numFmt = "#,##0.00";
  totalPwCell.alignment = { vertical: "middle", horizontal: "right" };
  totalPwCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  // Others Total (Bold black font)
  const totalOtCell = summaryRow.getCell(7);
  totalOtCell.value = summary.totalOthers;
  totalOtCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
  totalOtCell.numFmt = "#,##0.00";
  totalOtCell.alignment = { vertical: "middle", horizontal: "right" };
  totalOtCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  // Grand Total Sales (Yellow Highlight Fill, Black Bold)
  const grandTotalCell = summaryRow.getCell(8);
  grandTotalCell.value = summary.grandTotalSales;
  grandTotalCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" }, // Bright yellow from reference
  };
  grandTotalCell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: "FF000000" } };
  grandTotalCell.numFmt = "#,##0.00";
  grandTotalCell.alignment = { vertical: "middle", horizontal: "right" };
  grandTotalCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FFB0C4DE" } },
    right: { style: "thin", color: { argb: "FFB0C4DE" } },
  };

  // ----------------------------------------------------------------------------
  // COLUMN WIDTHS AUTO-FIT
  // ----------------------------------------------------------------------------
  worksheet.getColumn(1).width = 11; // Date
  worksheet.getColumn(2).width = 24; // Client Name
  worksheet.getColumn(3).width = 28; // Services Availed
  worksheet.getColumn(4).width = 17; // Deposit/adv pyt
  worksheet.getColumn(5).width = 16; // Penile Main
  worksheet.getColumn(6).width = 16; // Penile walk-in
  worksheet.getColumn(7).width = 15; // Others
  worksheet.getColumn(8).width = 16; // Total Sales

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

