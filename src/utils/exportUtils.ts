// Utility functions for exporting app data in Editable (CSV, Excel/TSV, JSON) and PDF formats

export type ExportFormat = 'csv' | 'json' | 'tsv' | 'pdf';

export interface ExportColumn<T = any> {
  header: string;
  key: string;
  format?: (row: T) => string;
}

/**
 * Clean cell text for CSV output
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Clean cell text for TSV output (tab-separated, editable in Excel)
 */
function escapeTsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

/**
 * Clean non-blocking in-app notification toast that avoids window.alert
 */
export function showAppNotification(message: string, type: 'info' | 'error' | 'success' = 'info') {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('natal-app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'natal-app-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.zIndex = '99999';
  toast.style.backgroundColor = type === 'error' ? '#2b0d0d' : '#141414';
  toast.style.border = `1px solid ${type === 'error' ? '#ef4444' : '#d4af37'}`;
  toast.style.color = type === 'error' ? '#fca5a5' : '#f5e6b3';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '13px';
  toast.style.fontFamily = 'monospace';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8)';
  toast.style.transition = 'opacity 0.3s ease';
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/**
 * Triggers a download in the browser for text content
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export tabular data to editable CSV
 */
export function exportToCSV<T = any>(
  data: T[],
  columns: ExportColumn<T>[],
  filenamePrefix: string = 'export'
) {
  if (!data || data.length === 0) {
    showAppNotification('No records available to export.', 'info');
    return;
  }
  const headers = columns.map(c => escapeCsvCell(c.header)).join(',');
  const rows = data.map(item =>
    columns.map(c => {
      const val = c.format ? c.format(item) : (item as any)[c.key];
      return escapeCsvCell(val);
    }).join(',')
  );
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n'); // UTF-8 BOM for Excel compatibility
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `${filenamePrefix}_${dateStr}.csv`, 'text/csv');
  showAppNotification(`Successfully exported ${data.length} records to CSV.`, 'success');
}

/**
 * Export tabular data to editable Excel/TSV
 */
export function exportToTSV<T = any>(
  data: T[],
  columns: ExportColumn<T>[],
  filenamePrefix: string = 'export'
) {
  if (!data || data.length === 0) {
    showAppNotification('No records available to export.', 'info');
    return;
  }
  const headers = columns.map(c => escapeTsvCell(c.header)).join('\t');
  const rows = data.map(item =>
    columns.map(c => {
      const val = c.format ? c.format(item) : (item as any)[c.key];
      return escapeTsvCell(val);
    }).join('\t')
  );
  const tsvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(tsvContent, `${filenamePrefix}_${dateStr}.xls`, 'application/vnd.ms-excel');
  showAppNotification(`Successfully exported ${data.length} records to Excel format.`, 'success');
}

/**
 * Export data to editable JSON format
 */
export function exportToJSON<T = any>(
  data: T[],
  filenamePrefix: string = 'export'
) {
  if (!data || data.length === 0) {
    showAppNotification('No records available to export.', 'info');
    return;
  }
  const jsonContent = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(jsonContent, `${filenamePrefix}_${dateStr}.json`, 'application/json');
  showAppNotification(`Successfully exported ${data.length} records to JSON.`, 'success');
}

/**
 * Export and generate a high-fidelity PDF Document using browser printable engine.
 * Renders an executive, luxury-styled document with logo, timestamp, table, and statistics,
 * triggering the browser's native Save as PDF print dialog.
 */
export function exportToPDF<T = any>({
  title,
  subtitle,
  category,
  data,
  columns,
  summaryCards,
  notes
}: {
  title: string;
  subtitle?: string;
  category?: string;
  data: T[];
  columns: ExportColumn<T>[];
  summaryCards?: { label: string; value: string | number }[];
  notes?: string;
}) {
  if (!data || data.length === 0) {
    showAppNotification('No records available to generate PDF.', 'info');
    return;
  }

  const dateNow = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // Try window.open first, or safely fall back to an in-DOM print iframe to bypass popup blockers
  let printDoc: Document | null = null;
  let printWin: Window | null = null;

  try {
    const pw = window.open('', '_blank', 'width=1100,height=850');
    if (pw && pw.document) {
      printWin = pw;
      printDoc = pw.document;
    }
  } catch {}

  if (!printDoc) {
    let iframe = document.getElementById('natal-print-iframe') as HTMLIFrameElement;
    if (iframe) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.id = 'natal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    printWin = iframe.contentWindow;
    printDoc = iframe.contentDocument || iframe.contentWindow?.document || null;
  }

  if (!printDoc || !printWin) {
    showAppNotification('Unable to initialize print preview. Please check browser permissions.', 'error');
    return;
  }

  const tableHeadersHtml = columns
    .map(c => `<th style="text-align: left; padding: 10px 12px; background: #0c0c0c; color: #d4af37; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #d4af37; border-top: 1px solid #222;">${c.header}</th>`)
    .join('');

  const tableRowsHtml = data
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? '#111111' : '#181818';
      const cells = columns
        .map(c => {
          const val = c.format ? c.format(item) : (item as any)[c.key];
          const display = val === null || val === undefined || val === '' ? '-' : String(val);
          return `<td style="padding: 9px 12px; color: #e5e5e5; font-size: 11px; border-bottom: 1px solid #262626; vertical-align: top; line-height: 1.4;">${display.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  const summaryHtml = summaryCards && summaryCards.length > 0
    ? `<div style="display: flex; gap: 16px; margin: 20px 0; flex-wrap: wrap;">
        ${summaryCards.map(s => `
          <div style="flex: 1; min-width: 130px; background: #141414; border: 1px solid #d4af3733; padding: 12px 16px; border-radius: 4px;">
            <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; font-family: monospace;">${s.label}</div>
            <div style="font-size: 20px; font-weight: 700; color: #d4af37; margin-top: 4px; font-family: serif;">${s.value}</div>
          </div>
        `).join('')}
       </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Natal Interior Design Report</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 12mm 15mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #090909;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-bar {
      border-bottom: 2px solid #d4af37;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #d4af37;
      margin: 0;
      font-family: 'Cinzel', serif, Georgia;
    }
    .brand-sub {
      font-size: 11px;
      color: #888;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 16px 0 4px 0;
    }
    .report-desc {
      font-size: 12px;
      color: #aaa;
      margin: 0 0 16px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #333;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #777;
      font-family: monospace;
    }
    .action-bar {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 9999;
      background: #111;
      border: 1px solid #d4af37;
      padding: 8px 14px;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8);
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .action-btn {
      background: #d4af37;
      color: #000;
      border: none;
      padding: 6px 14px;
      font-weight: bold;
      font-size: 12px;
      border-radius: 3px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .action-btn:hover {
      background: #e5c358;
    }
    .close-btn {
      background: transparent;
      color: #ccc;
      border: 1px solid #444;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 3px;
      cursor: pointer;
    }
    .close-btn:hover {
      color: #fff;
      border-color: #888;
    }
    @media print {
      .action-bar {
        display: none !important;
      }
      body {
        padding: 0;
        background: #ffffff !important;
        color: #000000 !important;
      }
      th {
        background: #f4f4f4 !important;
        color: #000000 !important;
        border-bottom: 2px solid #333 !important;
      }
      td {
        color: #111111 !important;
        border-bottom: 1px solid #ddd !important;
      }
      tr {
        background: #ffffff !important;
      }
      .brand-title {
        color: #967417 !important;
      }
      .report-title {
        color: #000000 !important;
      }
      .header-bar {
        border-bottom: 2px solid #967417 !important;
      }
      div[style*="background: #141414"] {
        background: #f9f9f9 !important;
        border: 1px solid #ccc !important;
      }
      div[style*="color: #d4af37"] {
        color: #967417 !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <span style="font-size: 12px; color: #d4af37; font-family: monospace;">Report Ready (${data.length} records)</span>
    <button class="action-btn" onclick="window.print()">Print / Save as PDF</button>
    <button class="close-btn" onclick="window.close()">Close</button>
  </div>

  <div class="header-bar">
    <div>
      <h1 class="brand-title">NATAL INTERIOR DESIGN</h1>
      <div class="brand-sub">Atelier &amp; Architecture Executive System</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #888; font-family: monospace;">
      <div>CONFIDENTIAL &bull; FOR INTERNAL USE ONLY</div>
      <div style="color: #d4af37; margin-top: 2px;">Generated: ${dateNow}</div>
    </div>
  </div>

  <div class="report-title">${title}</div>
  ${subtitle ? `<div class="report-desc">${subtitle}</div>` : ''}

  ${summaryHtml}

  <table>
    <thead>
      <tr>
        ${tableHeadersHtml}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  ${notes ? `<div style="margin-top: 16px; padding: 10px 14px; background: #141414; border-left: 3px solid #d4af37; font-size: 11px; color: #aaa;">${notes}</div>` : ''}

  <div class="footer">
    <div>Total Records: ${data.length} | Category: ${category || 'General'}</div>
    <div>Natal Interior Design &bull; Official Database Export</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    // Prompt print dialogue automatically once window renders
    window.addEventListener('load', () => {
      setTimeout(() => {
        // give browser 300ms to paint styles
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
  `;

  printDoc.open();
  printDoc.write(html);
  printDoc.close();
}
