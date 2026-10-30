import { ReceiptData } from '../components/ThermalReceiptModal';
import { formatCurrency } from './pos-logic';

/**
 * Formats a clean ASCII thermal receipt slip (58mm / 32 columns standard)
 */
export function formatThermalReceiptAscii(receipt: ReceiptData): string {
  const divider = '--------------------------------';
  const doubleDivider = '================================';
  const width = 32;

  const center = (text: string): string => {
    if (text.length >= width) return text.substring(0, width);
    const totalPad = width - text.length;
    const leftPad = Math.floor(totalPad / 2);
    return ' '.repeat(leftPad) + text;
  };

  const padBetween = (left: string, right: string): string => {
    const spaceNeeded = width - left.length - right.length;
    if (spaceNeeded <= 0) return `${left} ${right}`;
    return left + ' '.repeat(spaceNeeded) + right;
  };

  const lines: string[] = [
    doubleDivider,
    center(receipt.storeName || 'GIVA LIVING & BABY'),
    center(receipt.tagline || 'For your Home. For your baby.'),
    doubleDivider,
    `RECEIPT:  ${receipt.receiptNo}`,
    `DATE:     ${new Date(receipt.timestamp).toLocaleString()}`,
    `TERMINAL: Android 11 Q3 POS #01`,
    `CASHIER:  ${receipt.cashierName || 'Cathy'}`,
    `CURRENCY: ${receipt.currency}`,
    `EX. RATE: 1 USD = ${(receipt.bankRate || 40).toFixed(2)} ZiG`,
    `PAYMENT:  ${receipt.paymentMethod}`,
    divider,
    padBetween('ITEM', 'PRICE'),
    divider,
  ];

  receipt.items.forEach((item) => {
    lines.push(item.name.substring(0, width));
    const qtyPrice = `${item.quantity}x @ ${formatCurrency(item.unitPrice, receipt.currency)}`;
    const subtotal = formatCurrency(item.subtotal, receipt.currency);
    lines.push(padBetween(`  ${qtyPrice}`, subtotal));
  });

  lines.push(divider);
  lines.push(padBetween('TOTAL:', formatCurrency(receipt.totalAmount, receipt.currency)));
  lines.push(padBetween('TENDERED:', formatCurrency(receipt.amountTendered, receipt.currency)));
  lines.push(padBetween('CHANGE DUE:', formatCurrency(receipt.changeAmount, receipt.currency)));
  lines.push(doubleDivider);
  lines.push(center('THANK YOU FOR SHOPPING!'));
  lines.push(center('GOD BLESS YOUR FAMILY!'));
  lines.push(doubleDivider);
  lines.push('\n\n\n'); // Feed lines for 58mm paper cutter

  return lines.join('\n');
}

/**
 * Builds HTML for 58mm thermal receipt printing
 */
export function generateThermalReceiptHtml(receipt: ReceiptData): string {
  const itemsHtml = receipt.items
    .map(
      (item) => `
      <div style="margin-bottom: 6px;">
        <div style="font-weight: bold; font-size: 11px; word-break: break-word;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
          <span>${item.quantity} x ${formatCurrency(item.unitPrice, receipt.currency)}</span>
          <span style="font-weight: bold;">${formatCurrency(item.subtotal, receipt.currency)}</span>
        </div>
      </div>
    `
    )
    .join('');

  return `
    <div style="width: 58mm; max-width: 58mm; margin: 0 auto; padding: 2mm 3mm; font-family: 'JetBrains Mono', monospace, -apple-system, sans-serif; font-size: 11px; line-height: 1.35; color: #000; background: #fff;">
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-size: 14px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
          ${receipt.storeName}
        </div>
        <div style="font-size: 9px; font-style: italic; margin-top: 2px;">
          ${receipt.tagline}
        </div>
        <div style="font-size: 9px; margin-top: 4px; color: #444;">
          <div>Tax Invoice & Cash Receipt</div>
          <div style="font-weight: bold; font-size: 10px; color: #000;">${receipt.receiptNo}</div>
          <div>${new Date(receipt.timestamp).toLocaleString()}</div>
          <div>Terminal: Android 11 Q3 POS</div>
          <div style="margin-top: 2px; font-weight: bold;">
            Rate: 1 USD = ${(receipt.bankRate || 40).toFixed(2)} ZiG
          </div>
        </div>
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 4px;">
          <span>ITEM</span>
          <span>TOTAL</span>
        </div>
        ${itemsHtml}
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${formatCurrency(receipt.totalAmount, receipt.currency)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; margin: 4px 0; border-top: 1px solid #000; padding-top: 4px;">
          <span>TOTAL (${receipt.currency}):</span>
          <span>${formatCurrency(receipt.totalAmount, receipt.currency)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span>Payment:</span>
          <span>${receipt.paymentMethod}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span>Tendered:</span>
          <span>${formatCurrency(receipt.amountTendered, receipt.currency)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; margin-top: 2px;">
          <span>Change Due:</span>
          <span>${formatCurrency(receipt.changeAmount, receipt.currency)}</span>
        </div>
      </div>

      <div style="text-align: center; padding-top: 4px; font-size: 9px;">
        <div style="font-weight: bold;">THANK YOU FOR SHOPPING!</div>
        <div style="font-style: italic; margin-top: 2px;">"For your Home. For your baby for His glory."</div>
      </div>
    </div>
  `;
}

/**
 * Triggers 58mm thermal print via an isolated iframe
 * Eliminates all modal overflow/clipping bugs in Chrome, Android, and Q3 POS
 */
export function printReceiptSlip(receipt: ReceiptData): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // 1. If running inside Android APK native container with Print bridge
      if ((window as any).AndroidPrint?.printReceipt) {
        try {
          (window as any).AndroidPrint.printReceipt();
          resolve(true);
          return;
        } catch (androidErr) {
          console.warn('Native AndroidPrint error, falling back to iframe print:', androidErr);
        }
      }

      // 2. Create isolated print iframe
      const existingIframe = document.getElementById('giva-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'giva-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        resolve(true);
        return;
      }

      const receiptBody = generateThermalReceiptHtml(receipt);

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${receipt.receiptNo}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 58mm;
      max-width: 58mm;
      background: #fff;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${receiptBody}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`);
      doc.close();

      setTimeout(() => {
        try {
          iframe.remove();
        } catch (e) {}
        resolve(true);
      }, 4000);
    } catch (err) {
      console.warn('Print slip failed, falling back to window.print():', err);
      window.print();
      resolve(true);
    }
  });
}

/**
 * Direct ESC/POS Bluetooth Thermal Printing
 * Supports standard 58mm portable Bluetooth printers (e.g. PT-210, MPT-II, POS-5802)
 */
export async function printReceiptBluetooth(receipt: ReceiptData): Promise<{ success: boolean; message: string }> {
  if (!('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'Web Bluetooth is not supported in this browser. Please use the Print Slip option or Chrome on Android.',
    };
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { namePrefix: 'POS' },
        { namePrefix: 'Printer' },
        { namePrefix: 'MPT' },
        { namePrefix: 'Q3' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ],
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Could not connect to Bluetooth printer GATT server.');

    // Look for common printer characteristics
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    const receiptText = formatThermalReceiptAscii(receipt);
    const encoder = new TextEncoder();
    const data = encoder.encode(receiptText);

    // Send in chunks of 512 bytes
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }

    return { success: true, message: 'Receipt printed successfully via Bluetooth!' };
  } catch (err: any) {
    console.warn('Bluetooth print error:', err);
    return { success: false, message: err.message || 'Bluetooth connection failed.' };
  }
}

/**
 * Open WhatsApp with prefilled formatted receipt
 */
export function openWhatsAppReceipt(receipt: ReceiptData, phoneNumber: string = ''): void {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const receiptText = formatThermalReceiptAscii(receipt);
  const encodedText = encodeURIComponent(
    `*GIVA LIVING & BABY - OFFICIAL RECEIPT*\n\n${receiptText}\nThank you for choosing GIVA Living & Baby!`
  );

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank');
}
