import * as XLSX from "xlsx";
import type { IncomingFile, IncomingItemGroup, IncomingRecord } from "../types";

export function isExcelFile(file: File) {
  return /\.(xlsx|xls)$/i.test(file.name) && !file.name.startsWith("~$");
}

export async function parseIncomingFile(file: File, relativePath: string): Promise<IncomingFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames.find((name) =>
    name.replace(/\s/g, "").startsWith("입고리스트"),
  );

  if (!sheetName) {
    throw new Error("입고리스트 시트를 찾지 못했습니다.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const date = extractDateFromFileName(file.name) || extractDateFromSheet(rows);

  if (!date) {
    throw new Error("날짜 정보를 파악하지 못했습니다.");
  }

  const headerIndex = rows.findIndex(isIncomingHeaderRow);

  if (headerIndex < 0) {
    throw new Error("입고리스트 헤더 행을 찾지 못했습니다.");
  }

  const records: IncomingRecord[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const itemName = String(row[1] ?? "").trim();

    if (!itemName) continue;

    const no = String(row[0] ?? "").trim();
    if (!no || isNaN(Number(no))) continue;

    records.push({
      id: `${relativePath}-${records.length}`,
      sourceFile: file.name,
      date,
      itemName,
      issue: formatIssueDate(row[2]),
      volNo: String(row[3] ?? "").trim(),
      quantity: Number(row[4]) || 0,
      subscriberQty: Number(row[5]) || 0,
      remark: String(row[6] ?? "").trim(),
    });
  }

  if (records.length === 0) {
    throw new Error("입고 데이터를 찾지 못했습니다.");
  }

  return {
    id: `${relativePath}-${file.lastModified}`,
    fileName: file.name,
    date,
    records,
  };
}

export function groupByItem(files: IncomingFile[]): IncomingItemGroup[] {
  const allDates = [...new Set(files.map((f) => f.date))].sort();
  const groupMap = new Map<string, IncomingRecord[]>();

  for (const file of files) {
    for (const record of file.records) {
      const key = normalizeItemName(record.itemName);
      const current = groupMap.get(key) ?? [];
      current.push(record);
      groupMap.set(key, current);
    }
  }

  return Array.from(groupMap.entries())
    .map(([key, records]) => {
      const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
      const presentDates = [...new Set(records.map((r) => r.date))].sort();
      const missingDates = allDates.filter((d) => !presentDates.includes(d));

      return {
        id: key,
        itemName: getDisplayName(records),
        records: sortedRecords,
        presentDates,
        missingDates,
        totalQuantity: records.reduce((sum, r) => sum + r.quantity, 0),
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "ko"));
}

function isIncomingHeaderRow(row: unknown[]) {
  const col0 = String(row[0] ?? "").replace(/\s/g, "").toLowerCase();
  const col1 = String(row[1] ?? "").replace(/\s/g, "").toLowerCase();
  return col0 === "no" && (col1.includes("item") || col1.includes("품목"));
}

function extractDateFromFileName(fileName: string): string {
  const match = fileName.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function extractDateFromSheet(rows: unknown[][]): string {
  const dateRow = rows.find((r) => String(r[0]).includes("Date"));
  if (!dateRow) return "";

  const text = String(dateRow[0]);
  const match = text.match(/(\w{3})\s+(\d{1,2})[.,]\s*(\d{4})/);
  if (!match) return "";

  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const month = months[match[1]];
  if (!month) return "";

  return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

function formatIssueDate(value: unknown): string {
  if (typeof value === "number") {
    return XLSX.SSF.format("yyyy-mm-dd", value);
  }
  return String(value ?? "").trim();
}

function normalizeItemName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function getDisplayName(records: IncomingRecord[]): string {
  const counts = new Map<string, number>();
  for (const r of records) {
    const name = r.itemName.trim();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
