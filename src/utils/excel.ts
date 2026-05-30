import * as XLSX from "xlsx";
import type {
  DeliveryDocument,
  DeliveryGroup,
  DeliveryItem,
  PublicationGroup,
  QuarterGroup,
  UploadFile,
} from "../types";

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

const excelFilePattern = /\.(xlsx|xls|csv)$/i;
const codeSuffixPattern = /\s+[A-Z]{2}\d{3,}$/;

export async function parseDeliveryDocument({
  file,
  relativePath,
}: UploadFile): Promise<DeliveryDocument> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const parsedSheet = findDeliverySheet(workbook);

  if (!parsedSheet) {
    throw new Error("납품서 데이터 헤더를 찾지 못했습니다.");
  }

  const { headerIndex, rows, sheetName } = parsedSheet;
  const destinationRaw = formatCellValue(readMetaValue(rows, headerIndex, "납품처"));
  const deliveryDate = formatExcelDate(readMetaValue(rows, headerIndex, "납품일"));
  const destinationName = normalizeDestinationName(destinationRaw || file.name, relativePath, sheetName);
  const items = readDeliveryItems({
    deliveryDate,
    destinationName,
    headerIndex,
    relativePath,
    rows,
  });

  if (items.length === 0) {
    throw new Error("납품서 행 데이터를 찾지 못했습니다.");
  }

  return {
    id: `${relativePath}-${file.lastModified}`,
    fileName: file.name,
    relativePath,
    destinationName,
    destinationRaw,
    deliveryDate,
    items,
  };
}

export function groupDeliveryDocuments(documents: DeliveryDocument[]): DeliveryGroup[] {
  const groupsByDestination = new Map<string, DeliveryDocument[]>();

  for (const document of documents) {
    const current = groupsByDestination.get(document.destinationName) ?? [];
    current.push(document);
    groupsByDestination.set(document.destinationName, current);
  }

  return Array.from(groupsByDestination.entries())
    .map(([destinationName, groupDocuments]) => {
      const documentsByDate = [...groupDocuments].sort(compareDocuments);
      const items = documentsByDate.flatMap((document) => document.items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: destinationName,
        destinationName,
        documents: documentsByDate,
        items,
        totalQuantity,
        dateRange: buildDateRange(documentsByDate.map((document) => document.deliveryDate)),
      };
    })
    .sort((a, b) => a.destinationName.localeCompare(b.destinationName, "ko"));
}

export function downloadDeliveryGroup(group: DeliveryGroup) {
  downloadDeliveryItems({
    dateRange: group.dateRange,
    destinationName: group.destinationName,
    items: group.items,
  });
}

export function groupItemsByPublication(items: DeliveryItem[]): PublicationGroup[] {
  const groupsByPublication = new Map<string, DeliveryItem[]>();

  for (const item of items) {
    const current = groupsByPublication.get(item.publicationName) ?? [];
    current.push(item);
    groupsByPublication.set(item.publicationName, current);
  }

  return Array.from(groupsByPublication.entries())
    .map(([publicationName, publicationItems]) => {
      const sortedItems = [...publicationItems].sort(compareItems);

      return {
        id: publicationName,
        publicationName,
        items: sortedItems,
        totalQuantity: sortedItems.reduce((sum, item) => sum + item.quantity, 0),
        dateRange: buildDateRange(sortedItems.map((item) => item.deliveryDate)),
      };
    })
    .sort((a, b) => a.publicationName.localeCompare(b.publicationName, "ko"));
}

export function groupDeliveryByQuarter(group: DeliveryGroup): QuarterGroup[] {
  const quarterMap = new Map<string, QuarterGroup>();

  for (const document of group.documents) {
    const quarter = getQuarter(document.deliveryDate);

    if (!quarter) {
      continue;
    }

    const current =
      quarterMap.get(quarter.id) ??
      {
        id: quarter.id,
        label: quarter.label,
        documents: [],
        items: [],
        totalQuantity: 0,
        dateRange: "",
      };

    current.documents.push(document);
    current.items.push(...document.items);
    quarterMap.set(quarter.id, current);
  }

  return ["q1", "q2", "q3", "q4"]
    .map((quarterId) => quarterMap.get(quarterId))
    .filter((quarterGroup): quarterGroup is QuarterGroup => Boolean(quarterGroup))
    .map((quarterGroup) => {
      const documents = [...quarterGroup.documents].sort(compareDocuments);
      const items = [...quarterGroup.items].sort(compareItems);

      return {
        ...quarterGroup,
        documents,
        items,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        dateRange: buildDateRange(documents.map((document) => document.deliveryDate)),
      };
    });
}

export function downloadPublicationGroup(destinationName: string, group: PublicationGroup) {
  downloadDeliveryItems({
    dateRange: group.dateRange,
    destinationName,
    fileNameParts: [destinationName, group.publicationName],
    items: group.items,
    sheetName: group.publicationName,
  });
}

function downloadDeliveryItems({
  dateRange,
  destinationName,
  fileNameParts = [destinationName],
  items,
  sheetName = destinationName,
}: {
  dateRange: string;
  destinationName: string;
  fileNameParts?: string[];
  items: DeliveryItem[];
  sheetName?: string;
}) {
  const rows = [
    ["납품처", "납품일", "번호", "간행물명", "간종", "발행일", "Vol-No.", "부수", "비고"],
    ...items.map((item) => [
      item.destinationName,
      item.deliveryDate,
      item.sequence,
      item.publicationName,
      item.publicationType,
      item.issueDate,
      item.volumeNo,
      item.quantity,
      item.note,
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 34 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
  XLSX.writeFile(
    workbook,
    `${fileNameParts.map(safeFileName).join("_")}_${dateRange || "납품서"}.xlsx`,
  );
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

function findDeliverySheet(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const headerIndex = rows.findIndex(isDeliveryHeaderRow);

    if (headerIndex >= 0) {
      return { headerIndex, rows, sheetName };
    }
  }

  return null;
}

function isDeliveryHeaderRow(row: unknown[]) {
  return normalizeText(row[0]) === "번호" && normalizeText(row[1]).includes("간행물명");
}

function readMetaValue(rows: unknown[][], headerIndex: number, label: string) {
  const metaRows = rows.slice(0, headerIndex);
  const row = metaRows.find((candidate) => normalizeText(candidate[0]).startsWith(label));
  return row?.[1] ?? "";
}

function readDeliveryItems({
  deliveryDate,
  destinationName,
  headerIndex,
  relativePath,
  rows,
}: {
  deliveryDate: string;
  destinationName: string;
  headerIndex: number;
  relativePath: string;
  rows: unknown[][];
}): DeliveryItem[] {
  const fileName = getFileName(relativePath);
  const items: DeliveryItem[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const firstCell = normalizeText(row[0]);

    if (!row.some((cell) => normalizeText(cell) !== "")) {
      continue;
    }

    if (firstCell.includes("합") && firstCell.includes("계")) {
      break;
    }

    const publicationName = formatCellValue(row[1]);

    if (!publicationName) {
      continue;
    }

    items.push({
      id: `${relativePath}-${items.length}`,
      sourceFile: fileName,
      sourcePath: relativePath,
      destinationName,
      deliveryDate,
      sequence: formatCellValue(row[0]),
      publicationName,
      publicationType: formatCellValue(row[2]),
      issueDate: formatExcelDate(row[3]),
      volumeNo: formatCellValue(row[4]),
      quantity: Number(row[5]) || 0,
      note: formatCellValue(row[6]),
    });
  }

  return items;
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

  return String(value).trim();
}

function formatExcelDate(value: unknown): string {
  if (typeof value === "number") {
    return XLSX.SSF.format("yyyy-mm-dd", value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return formatCellValue(value);
}

function normalizeDestinationName(value: unknown, relativePath: string, sheetName: string) {
  const baseName = formatCellValue(value).replace(codeSuffixPattern, "").trim();
  const category = extractDestinationCategory(`${relativePath} ${sheetName}`);

  if (!category || baseName.includes(`(${category})`)) {
    return baseName;
  }

  return `${baseName}(${category})`;
}

function normalizeText(value: unknown) {
  return formatCellValue(value).replace(/\s+/g, "");
}

function compareDocuments(a: DeliveryDocument, b: DeliveryDocument) {
  return a.deliveryDate.localeCompare(b.deliveryDate) || a.fileName.localeCompare(b.fileName, "ko");
}

function compareItems(a: DeliveryItem, b: DeliveryItem) {
  return (
    a.deliveryDate.localeCompare(b.deliveryDate) ||
    a.sourceFile.localeCompare(b.sourceFile, "ko") ||
    Number(a.sequence) - Number(b.sequence)
  );
}

function buildDateRange(dates: string[]) {
  const filteredDates = dates.filter(Boolean).sort();

  if (filteredDates.length === 0) {
    return "";
  }

  const first = toCompactDate(filteredDates[0]);
  const last = toCompactDate(filteredDates[filteredDates.length - 1]);

  return first === last ? first : `${first}-${last}`;
}

function toCompactDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}${match[3]}` : date;
}

function getQuarter(date: string) {
  const month = Number(date.match(/^\d{4}-(\d{2})-\d{2}$/)?.[1]);

  if (!month) {
    return null;
  }

  if (month <= 3) {
    return { id: "q1", label: "1분기" };
  }

  if (month <= 6) {
    return { id: "q2", label: "2분기" };
  }

  if (month <= 9) {
    return { id: "q3", label: "3분기" };
  }

  return { id: "q4", label: "4분기" };
}

function getFileName(relativePath: string) {
  return relativePath.split("/").pop() ?? relativePath;
}

function extractDestinationCategory(relativePath: string) {
  const normalizedPath = relativePath.normalize("NFC").replace(/\s+/g, "");
  const match = normalizedPath.match(/국립중앙도서관\((신문|잡지)\)/);
  return match?.[1] ?? "";
}

function safeFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_");
}

function safeSheetName(sheetName: string) {
  return sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "납품서";
}
