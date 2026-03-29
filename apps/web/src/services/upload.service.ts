/**
 * Generic CSV upload/download service.
 * Reusable across any module (attendance, students, teachers, etc.)
 */

export interface CSVField {
  /** Object key to read from each row */
  key: string;
  /** Column header in the CSV file */
  header: string;
}

// ── Parse ─────────────────────────────────────────────────────────────────────

/** Parse a CSV string (with header row) into an array of plain objects. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')   // strip Excel BOM (UTF-8 byte-order mark)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ── Generate ──────────────────────────────────────────────────────────────────

/** Convert an array of objects to a CSV string using the given field definitions. */
export function generateCSV(rows: Record<string, any>[], fields: CSVField[]): string {
  const header = fields.map((f) => escapeCell(f.header)).join(',');
  const body   = rows
    .map((row) => fields.map((f) => escapeCell(row[f.key] ?? '')).join(','))
    .join('\n');
  return header + '\n' + body;
}

function escapeCell(value: unknown): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/** Build a Response that triggers a file download in the browser. */
export function csvDownloadResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
