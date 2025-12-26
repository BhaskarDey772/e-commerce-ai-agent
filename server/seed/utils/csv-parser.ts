/**
 * Simple CSV parser for product data
 */

export interface CSVRow {
  [key: string]: string;
}

/**
 * Parse CSV string into array of objects
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current);

  // Trim all values
  return values.map((v) => v.trim());
}
