import * as XLSX from 'xlsx';

/**
 * One-shot Excel export.
 *
 *   exportToExcel('attendance-2026-05', [
 *     { Date: '2026-05-04', Employee: 'Sara Khan', Status: 'PRESENT', Worked: '8h 22m' },
 *     ...
 *   ]);
 *
 * Each object key becomes a column header. The file downloads immediately.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  sheetName = 'Sheet1',
): void {
  if (rows.length === 0) {
    // Still produce a workbook with just headers so users see "no data" rather
    // than an empty file. Use an empty object to get an empty sheet.
    rows = [{} as T];
  }
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  // .xlsx writes binary OOXML; opens cleanly in Excel, Numbers, LibreOffice, Google Sheets.
  XLSX.writeFile(workbook, ensureExtension(filename, '.xlsx'));
}

function ensureExtension(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith(ext) ? filename : filename + ext;
}
