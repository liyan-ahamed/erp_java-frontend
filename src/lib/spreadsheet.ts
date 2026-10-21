/**
 * Reads the first sheet of an .xlsx file or a .csv file into rows of text cells, in the browser.
 * No library: .xlsx is a zip of XML files, unpacked with the built-in DecompressionStream and read with
 * DOMParser. Only cell values are read (no formulas, styles or dates).
 */

export class SpreadsheetError extends Error {}

// ---------- CSV ----------

/** RFC 4180-style CSV: quoted fields, doubled quotes, commas / semicolons / tabs as separators. */
export const parseCsv = (text: string): string[][] => {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim()));
};

// ---------- XLSX (zip) ----------

interface ZipEntry { name: string; method: number; compressedSize: number; offset: number }

const readZipEntries = (view: DataView): ZipEntry[] => {
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new SpreadsheetError('This file is not a valid .xlsx workbook.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new SpreadsheetError('This .xlsx file is damaged.');
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + p + 46, nameLength));
    entries.push({ name, method, compressedSize, offset });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

const readZipFile = async (view: DataView, entry: ZipEntry): Promise<string> => {
  const local = entry.offset;
  const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const data = new Uint8Array(view.buffer, view.byteOffset + start, entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new SpreadsheetError('This .xlsx file uses an unsupported compression.');
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
};

const columnIndex = (ref: string) => {
  const letters = ref.replace(/[0-9]/g, '').toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');
const textOf = (el: Element | null | undefined) =>
  el ? Array.from(el.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('') : '';

/** Numbers as typed: 17.499999999 from Excel's binary floats becomes 17.5. */
const cleanNumber = (value: string) => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : value;
};

export const parseXlsx = async (buffer: ArrayBuffer): Promise<string[][]> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new SpreadsheetError('This browser cannot read .xlsx files. Save the sheet as .csv and import that instead.');
  }
  const view = new DataView(buffer);
  const entries = readZipEntries(view);
  const find = (name: string) => entries.find((e) => e.name === name);

  // The first sheet in workbook order (not necessarily sheet1.xml).
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = find('xl/workbook.xml');
  const rels = find('xl/_rels/workbook.xml.rels');
  if (workbook && rels) {
    const firstSheet = xml(await readZipFile(view, workbook)).getElementsByTagName('sheet')[0];
    const relId = firstSheet?.getAttribute('r:id') ?? firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const target = Array.from(xml(await readZipFile(view, rels)).getElementsByTagName('Relationship'))
      .find((r) => r.getAttribute('Id') === relId)?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  const sheet = find(sheetPath);
  if (!sheet) throw new SpreadsheetError('No worksheet was found in this file.');

  const sharedEntry = find('xl/sharedStrings.xml');
  const shared = sharedEntry
    ? Array.from(xml(await readZipFile(view, sharedEntry)).getElementsByTagName('si')).map((si) => textOf(si))
    : [];

  const rows: string[][] = [];
  for (const rowEl of Array.from(xml(await readZipFile(view, sheet)).getElementsByTagName('row'))) {
    const rowNumber = Number(rowEl.getAttribute('r')) || rows.length + 1;
    const cells: string[] = [];
    for (const c of Array.from(rowEl.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r');
      const col = ref ? columnIndex(ref) : cells.length;
      const type = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let value: string;
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = textOf(c.getElementsByTagName('is')[0]);
      else if (type === 'str' || type === 'b' || type === 'e') value = v;
      else value = cleanNumber(v);
      cells[col] = value.trim();
    }
    rows[rowNumber - 1] = Array.from(cells, (c) => c ?? '');
  }
  return Array.from(rows, (r) => r ?? []);
};

/** .xlsx or .csv (by extension). Older .xls files are refused with a clear message. */
export const readSpreadsheet = async (file: File): Promise<string[][]> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(await file.text());
  if (name.endsWith('.xlsx')) return parseXlsx(await file.arrayBuffer());
  if (name.endsWith('.xls')) throw new SpreadsheetError('Old .xls files are not supported. Save the sheet as .xlsx or .csv.');
  throw new SpreadsheetError('Choose an .xlsx or .csv file.');
};
