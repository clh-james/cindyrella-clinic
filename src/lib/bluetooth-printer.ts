/**
 * Cindyrella Drip Aesthetic & Wellness Clinic
 * Web Bluetooth (BLE) Thermal Receipt Printer Driver
 * Specifically engineered for Goojprt PT-210, MPT-II, and generic 58mm/80mm ESC/POS printers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const PRINTER_SERVICE_UUIDS = [
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / CC2541 (Extremely common in Goojprt/PT-210)
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART Service (NUS) (Very common in generic thermal printers)
  "000018f0-0000-1000-8000-00805f9b34fb", // Generic Custom Printer Service (Very common in BLE ESC/POS Chinese printers)
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Custom Printer Service
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000af06-0000-1000-8000-00805f9b34fb",
];

export const PRINTER_CHARACTERISTIC_UUIDS = [
  "0000ffe1-0000-1000-8000-00805f9b34fb", // HM-10 Write
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART Write
  "000018f1-0000-1000-8000-00805f9b34fb", // Generic Custom Printer Write (associated with 18f0)
  "00002af1-0000-1000-8000-00805f9b34fb",
  "49535343-1e4d-4bd9-ba61-07c64724f111",
  "0000ff01-0000-1000-8000-00805f9b34fb",
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
];

export interface ConnectedBluetoothPrinter {
  device: any;
  characteristic: any;
  name: string;
}

let cachedPrinter: ConnectedBluetoothPrinter | null = null;

/**
 * Check if the current browser environment supports the Web Bluetooth API
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Connect to a nearby Bluetooth Thermal Printer via Web Bluetooth
 */
export async function connectBluetoothPrinter(): Promise<ConnectedBluetoothPrinter> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser on Windows, Android, or macOS."
    );
  }

  const nav = navigator as any;

  // Request paired/nearby BLE device with configured service UUIDs
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  if (!device) {
    throw new Error("No Bluetooth device selected.");
  }

  // Connect to GATT Server
  const server = await device.gatt.connect();

  // Find supported primary service and characteristic
  let targetCharacteristic: any = null;

  for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetCharacteristic = char;
            break;
          }
        } catch {
          // Characteristic not in this service, continue search
        }
      }
      if (targetCharacteristic) break;
    } catch {
      // Service not offered by device, continue search
    }
  }

  if (!targetCharacteristic) {
    // Fallback: search all available services
    try {
      const services = await server.getPrimaryServices();
      for (const s of services) {
        try {
          const characteristics = await s.getCharacteristics();
          for (const c of characteristics) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              targetCharacteristic = c;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!targetCharacteristic) {
    throw new Error(
      `Connected to '${device.name || "Printer"}', but could not find a writable ESC/POS characteristic.`
    );
  }

  const printerInfo: ConnectedBluetoothPrinter = {
    device,
    characteristic: targetCharacteristic,
    name: device.name || "POS Thermal Printer",
  };

  cachedPrinter = printerInfo;
  return printerInfo;
}

/**
 * Helper to write raw byte stream in BLE-friendly chunks (typically 20-50 bytes)
 */
export async function sendEscPosChunked(
  characteristic: any,
  data: Uint8Array,
  onProgress?: (percent: number) => void
): Promise<void> {
  const CHUNK_SIZE = 40; // Safe MTU size for Goojprt / PT-210 BLE module
  const total = data.length;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
    }
    // Throttle 20ms to allow small printer FIFO buffers to drain
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export interface ReceiptPayload {
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  receiptNo: string;
  dateStr: string;
  isAppointment?: boolean;
  appointmentNo?: string;
  customerName?: string;
  cashierName?: string;
  items: Array<{ name: string; qty: number; price: number; amount: number }>;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  verificationUrl?: string;
}

/**
 * Format string helper for 32-character wide 58mm thermal receipt paper
 */
function padLine(left: string, right: string, width = 32): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    return left.slice(0, width - right.length - 1) + " " + right;
  }
  return left + " ".repeat(spaceNeeded) + right;
}

/**
 * Format 3-column item row for 58mm thermal receipt paper:
 * Line 1: Item Name
 * Line 2:   @ P{Price} (left)    {Qty} (center)    P{Amount} (right)
 */
function formatItemRow(name: string, price: number, qty: number, amount: number, width = 32): string {
  let res = `${name}\n`;
  const priceStr = `  @ P${price.toLocaleString("en-PH")}`;
  const qtyStr = `${qty}`;
  const amtStr = `P${amount.toLocaleString("en-PH")}`;

  const leftWidth = 16;
  const qtyWidth = 6;
  const amtWidth = width - leftWidth - qtyWidth; // 10

  const leftPadded = priceStr.padEnd(leftWidth, " ").slice(0, leftWidth);
  const qtyPadded = qtyStr.padStart(Math.floor((qtyWidth + qtyStr.length) / 2), " ").padEnd(qtyWidth, " ");
  const amtPadded = amtStr.padStart(amtWidth, " ");

  res += `${leftPadded}${qtyPadded}${amtPadded}\n`;
  return res;
}

/**
 * Build ESC/POS Byte Array for Cindyrella Clinic Receipt
 * Matches exact clinic receipt specifications with QR code verification and policy footer
 */
export function buildReceiptEscPos(receiptData: ReceiptPayload): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  // ESC/POS Commands
  const ESC = 0x1b;
  const GS = 0x1d;

  // Initialize printer
  buffer.push(ESC, 0x40);

  // Character set: PC437 / Standard
  buffer.push(ESC, 0x74, 0x00);

  // 1. HEADER (CENTER ALIGNED)
  buffer.push(ESC, 0x61, 0x01);

  // Bold & Double Height / Double Width for Clinic Name
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(GS, 0x21, 0x11); // Double width & height
  buffer.push(...encoder.encode("CINDYRELLA DRIP\n"));

  buffer.push(GS, 0x21, 0x00); // Normal size
  buffer.push(...encoder.encode("A E S T H E T I C   &   W E L L N E S S\n\n"));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF

  // Branch Info
  const rawBranch = receiptData.branchName || "Makati Branch";
  const branchName = rawBranch.toLowerCase().endsWith("branch") ? rawBranch : `${rawBranch} Branch`;
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(...encoder.encode(`${branchName}\n`));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF

  if (receiptData.branchAddress) {
    buffer.push(...encoder.encode(`${receiptData.branchAddress}\n`));
  }
  if (receiptData.branchPhone) {
    buffer.push(...encoder.encode(`${receiptData.branchPhone}\n`));
  }

  // Dashed Divider
  buffer.push(...encoder.encode("--------------------------------\n"));

  // 2. META INFO (LEFT ALIGNED)
  buffer.push(ESC, 0x61, 0x00);

  buffer.push(...encoder.encode(padLine("Transaction:", receiptData.receiptNo) + "\n"));
  buffer.push(...encoder.encode(padLine("Date:", receiptData.dateStr) + "\n"));
  if (receiptData.isAppointment || receiptData.appointmentNo) {
    buffer.push(...encoder.encode(padLine("Appointment:", receiptData.appointmentNo || receiptData.receiptNo) + "\n"));
  }
  buffer.push(
    ...encoder.encode(
      padLine("Customer:", (receiptData.customerName || "Walk-in Customer").slice(0, 18)) + "\n"
    )
  );
  if (receiptData.cashierName) {
    buffer.push(
      ...encoder.encode(padLine("Cashier:", receiptData.cashierName.slice(0, 18)) + "\n")
    );
  }

  // Dashed Divider
  buffer.push(...encoder.encode("--------------------------------\n"));

  // 3. ITEM TABLE (ITEM, QTY, AMT)
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  const headerLeft = "ITEM".padEnd(16, " ");
  const headerQty = "QTY".padStart(4, " ").padEnd(6, " ");
  const headerAmt = "AMT".padStart(10, " ");
  buffer.push(...encoder.encode(`${headerLeft}${headerQty}${headerAmt}\n`));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF
  buffer.push(...encoder.encode("--------------------------------\n"));

  // Items
  for (const item of receiptData.items) {
    buffer.push(...encoder.encode(formatItemRow(item.name, item.price, item.qty, item.amount)));
  }

  // Dashed Divider
  buffer.push(...encoder.encode("--------------------------------\n"));

  // 4. SUBTOTAL & TOTAL
  buffer.push(
    ...encoder.encode(
      padLine("Subtotal:", `P${receiptData.subtotal.toLocaleString("en-PH")}`) + "\n"
    )
  );
  if (receiptData.discount > 0) {
    buffer.push(
      ...encoder.encode(
        padLine("Discount:", `-P${receiptData.discount.toLocaleString("en-PH")}`) + "\n"
      )
    );
  }

  buffer.push(...encoder.encode("--------------------------------\n"));

  // Total (Bold Double Height)
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(GS, 0x21, 0x01); // Double height
  buffer.push(
    ...encoder.encode(
      padLine("TOTAL:", `P${receiptData.totalAmount.toLocaleString("en-PH")}`) + "\n"
    )
  );
  buffer.push(GS, 0x21, 0x00); // Normal size
  buffer.push(ESC, 0x45, 0x00); // Bold OFF

  buffer.push(...encoder.encode("\n"));

  // 5. PAYMENT DETAILS
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(...encoder.encode("PAYMENT DETAILS\n"));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF

  buffer.push(
    ...encoder.encode(
      padLine("Method:", receiptData.paymentMethod.toUpperCase().replace("_", " ")) + "\n"
    )
  );
  const amountPaid = receiptData.amountPaid ?? receiptData.totalAmount;
  buffer.push(
    ...encoder.encode(
      padLine("Amount Paid:", `P${amountPaid.toLocaleString("en-PH")}`) + "\n"
    )
  );
  if (receiptData.change !== undefined && receiptData.change > 0) {
    buffer.push(
      ...encoder.encode(
        padLine("Change:", `P${receiptData.change.toLocaleString("en-PH")}`) + "\n"
      )
    );
  }

  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(...encoder.encode(padLine("STATUS:", "PAID") + "\n"));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF

  buffer.push(...encoder.encode("\n"));

  // 6. QR CODE (CENTER ALIGNED)
  buffer.push(ESC, 0x61, 0x01);

  const qrUrl =
    receiptData.verificationUrl ||
    `https://cindyrelladrip-davao.vercel.app/verify/${receiptData.receiptNo}`;
  const qrBytes = encoder.encode(qrUrl);
  const pLen = qrBytes.length + 3;
  const pL = pLen & 0xff;
  const pH = (pLen >> 8) & 0xff;

  // ESC/POS QR Code Commands (Model 2, size 4, Level L)
  buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // Model 2
  buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04); // Size 4
  buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30); // Error correction L
  buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...qrBytes); // Data
  buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // Print QR

  buffer.push(...encoder.encode("\nScan to verify receipt authenticity\n\n"));
  buffer.push(...encoder.encode("--------------------------------\n"));

  // 7. FOOTER POLICY (CENTER ALIGNED)
  buffer.push(...encoder.encode("Thank you for choosing\n"));
  buffer.push(ESC, 0x45, 0x01); // Bold ON
  buffer.push(...encoder.encode("CINDYRELLA DRIP AESTHETIC & WELLNESS\n\n"));
  buffer.push(ESC, 0x45, 0x00); // Bold OFF
  buffer.push(...encoder.encode("We appreciate your trust and support.\n"));
  buffer.push(...encoder.encode("Please keep this receipt for your records.\n"));
  buffer.push(...encoder.encode("--------------------------------\n"));
  buffer.push(...encoder.encode("Refunds are subject to clinic policy.\n"));
  buffer.push(...encoder.encode("Services depend on availability.\n"));

  // Feed 4 lines for tear bar
  buffer.push(ESC, 0x64, 0x04);

  // Partial / Full Cut
  buffer.push(GS, 0x56, 0x41, 0x10);

  return new Uint8Array(buffer);
}

/**
 * Print receipt directly via Web Bluetooth
 */
export async function printViaBluetooth(
  receiptData: ReceiptPayload,
  onProgress?: (percent: number) => void
): Promise<string> {
  let printer = cachedPrinter;

  // If not cached or disconnected, initiate connection
  if (!printer || !printer.device?.gatt?.connected) {
    printer = await connectBluetoothPrinter();
  }

  const rawBytes = buildReceiptEscPos(receiptData);
  await sendEscPosChunked(printer.characteristic, rawBytes, onProgress);

  return printer.name;
}
