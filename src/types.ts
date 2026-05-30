export type SheetData = {
  name: string;
  headers: string[];
  rows: string[][];
};

export type WorkbookData = {
  id: string;
  fileName: string;
  folderPath: string;
  relativePath: string;
  fileSize: number;
  sheets: SheetData[];
};

export type ParseError = {
  id: string;
  fileName: string;
  message: string;
};

export type UploadFile = {
  file: File;
  relativePath: string;
};

