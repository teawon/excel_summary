import * as XLSX from "xlsx";
import type { UploadFile, WorkbookData } from "../types";

type DroppedEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type DroppedFileEntry = DroppedEntry & {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

type DroppedDirectoryEntry = DroppedEntry & {
  createReader: () => DroppedDirectoryReader;
};

type DroppedDirectoryReader = {
  readEntries: (
    successCallback: (entries: DroppedEntry[]) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

type DataTransferItemWithEntry = {
  webkitGetAsEntry?: () => DroppedEntry | null;
};

export const maxPreviewRows = 200;

const excelFilePattern = /\.(xlsx|xls|csv)$/i;

export async function readWorkbook({
  file,
  relativePath,
}: UploadFile): Promise<WorkbookData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    const normalizedRows = rawRows.map((row) => row.map(formatCellValue));
    const widestRow = Math.max(0, ...normalizedRows.map((row) => row.length));
    const [firstRow, ...bodyRows] = normalizedRows;
    const headers = Array.from({ length: widestRow }, (_, index) => {
      const header = firstRow?.[index]?.trim();
      return header || `열 ${index + 1}`;
    });

    return {
      name: sheetName,
      headers,
      rows: bodyRows
        .slice(0, maxPreviewRows)
        .map((row) => padRow(row, widestRow)),
    };
  });

  if (sheets.length === 0) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  return {
    id: `${relativePath}-${file.lastModified}-${crypto.randomUUID()}`,
    fileName: file.name,
    folderPath: getFolderPath(relativePath),
    relativePath,
    fileSize: file.size,
    sheets,
  };
}

export async function getUploadFilesFromDrop(
  dataTransfer: DataTransfer,
): Promise<UploadFile[]> {
  const entries = Array.from(dataTransfer.items)
    .map(
      (item) =>
        (item as unknown as DataTransferItemWithEntry).webkitGetAsEntry?.() ??
        null,
    )
    .filter((entry): entry is DroppedEntry => Boolean(entry));

  if (entries.length === 0) {
    return Array.from(dataTransfer.files).map(fileToUploadFile);
  }

  const files = await Promise.all(entries.map((entry) => readEntry(entry, "")));
  return files.flat();
}

export function isExcelFile(file: File) {
  return excelFilePattern.test(file.name) && !file.name.startsWith("~$");
}

function fileToUploadFile(file: File): UploadFile {
  const relativePath = file.webkitRelativePath || file.name;

  return {
    file,
    relativePath,
  };
}

async function readEntry(
  entry: DroppedEntry,
  parentPath: string,
): Promise<UploadFile[]> {
  const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await readFileEntry(entry as DroppedFileEntry);
    return [{ file, relativePath: currentPath }];
  }

  if (!entry.isDirectory) {
    return [];
  }

  const children = await readDirectoryEntries(entry as DroppedDirectoryEntry);
  const childFiles = await Promise.all(
    children.map((child) => readEntry(child, currentPath)),
  );
  return childFiles.flat();
}

function readFileEntry(entry: DroppedFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function readDirectoryEntries(
  entry: DroppedDirectoryEntry,
): Promise<DroppedEntry[]> {
  const reader = entry.createReader();
  const entries: DroppedEntry[] = [];

  while (true) {
    const batch = await new Promise<DroppedEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

    if (batch.length === 0) {
      break;
    }

    entries.push(...batch);
  }

  return entries;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("ko-KR");
  }

  return String(value);
}

function padRow(row: string[], length: number) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function getFolderPath(relativePath: string) {
  const parts = relativePath.split("/");
  parts.pop();
  return parts.join("/");
}

