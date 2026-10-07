// Copy-to-clipboard and Excel-export helpers shared by the partner Dashboard
// and Search Jobs pages - both need the exact same "copy this group's
// tracking numbers" / "export this group to Excel" actions grfmxstatusupdate's
// own dashboard toolbar buttons provide per MAWB/Area/date group, so this is
// pulled out once rather than duplicated across both pages.
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

export async function copyTrackingNumbers(orders) {
  const numbers = (orders || []).map((o) => o.doTrackingNumber).filter(Boolean);
  const text = numbers.join('\n');
  if (Platform.OS === 'web' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return numbers.length;
  }
  return 0;
}

// `columns` - array of { label, key, format? } in display order, same shape
// COLUMNS uses in search-jobs.js and the table components in dashboard.js.
// Web-only (Blob + object-URL download is a browser API), matching
// jpmc-portal.js's own handleExport() precedent.
export function exportOrdersToExcel(orders, columns, sectionName) {
  if (Platform.OS !== 'web') return false;
  const rows = (orders || []).map((o) => {
    const row = {};
    columns.forEach((c) => { row[c.label] = c.format ? c.format(o[c.key], o) : (o[c.key] ?? ''); });
    return row;
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sectionName || 'export'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}
