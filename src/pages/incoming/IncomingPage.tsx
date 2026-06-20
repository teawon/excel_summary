import { DragEvent, useMemo, useState } from "react";
import type { IncomingFile, ParseError } from "./types";
import { groupByItem, isExcelFile, parseIncomingFile } from "./utils/excel";
import { IncomingResult } from "./components/IncomingResult";

type UploadFile = { file: File; relativePath: string };

export function IncomingPage() {
  const [files, setFiles] = useState<IncomingFile[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const groups = useMemo(() => groupByItem(files), [files]);
  const allDates = useMemo(
    () => [...new Set(files.map((f) => f.date))].sort(),
    [files],
  );
  const hasFiles = files.length > 0;

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const uploadFiles = await getFilesFromDrop(event.dataTransfer);
    await parseFiles(uploadFiles);
  };

  const parseFiles = async (uploadFiles: UploadFile[]) => {
    const excelFiles = uploadFiles.filter(({ file }) => isExcelFile(file));

    if (excelFiles.length === 0) {
      setErrors((current) => [
        ...current,
        {
          id: `no-excel-${crypto.randomUUID()}`,
          fileName: "업로드 항목",
          message: "읽을 수 있는 엑셀 파일(.xlsx, .xls)을 찾지 못했습니다.",
        },
      ]);
      return;
    }

    setIsReading(true);
    const parsed: IncomingFile[] = [];
    const parseErrors: ParseError[] = [];

    await Promise.all(
      excelFiles.map(async ({ file, relativePath }) => {
        try {
          const result = await parseIncomingFile(file, relativePath);
          parsed.push(result);
        } catch (error) {
          parseErrors.push({
            id: `${relativePath}-${file.lastModified}-error`,
            fileName: file.name,
            message:
              error instanceof Error ? error.message : "파일을 읽는 중 오류가 발생했습니다.",
          });
        }
      }),
    );

    setFiles((current) => {
      const existingIds = new Set(current.map((f) => f.id));
      return [...current, ...parsed.filter((f) => !existingIds.has(f.id))];
    });
    setErrors((current) => [...current, ...parseErrors]);
    setIsReading(false);
  };

  const handleReset = () => {
    setFiles([]);
    setErrors([]);
    setIsDragging(false);
  };

  return (
    <main
      className={`app-shell ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      {isReading && (
        <div className="loading-overlay" role="status" aria-live="polite" aria-label="파일 읽는 중">
          <div className="loading-spinner" aria-hidden="true" />
        </div>
      )}

      {errors.length > 0 && (
        <details className="error-dropdown">
          <summary>
            <div>
              <strong>읽지 못한 파일</strong>
              <span>{errors.length}개 파일에서 오류가 발생했습니다.</span>
            </div>
          </summary>
          <div className="error-list">
            {errors.map((error) => (
              <div key={error.id} className="error-item">
                <strong>{error.fileName}</strong>
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {!hasFiles ? (
        <section className="drop-panel" aria-label="파일 업로드">
          <div className="drop-panel-content">
            <span className="upload-icon" aria-hidden="true">+</span>
            <h1>파일을 올려주세요</h1>
            <p>입출고리스트 엑셀 파일을 드래그해 올려주세요</p>
            <p className="description">
              여러 날짜의 파일을 한꺼번에 올리면 품목별로 누락 날짜를 확인할 수 있습니다.
            </p>
          </div>
        </section>
      ) : (
        <IncomingResult groups={groups} allDates={allDates} onReset={handleReset} />
      )}
    </main>
  );
}

async function getFilesFromDrop(dataTransfer: DataTransfer): Promise<UploadFile[]> {
  const entries = Array.from(dataTransfer.items)
    .map((item) => (item as any).webkitGetAsEntry?.() ?? null)
    .filter(Boolean);

  if (entries.length === 0) {
    return Array.from(dataTransfer.files).map((file) => ({
      file,
      relativePath: file.name,
    }));
  }

  const results = await Promise.all(entries.map((entry: any) => readEntry(entry, "")));
  return results.flat();
}

async function readEntry(entry: any, parentPath: string): Promise<UploadFile[]> {
  const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
    return [{ file, relativePath: currentPath }];
  }

  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const children: any[] = [];

  while (true) {
    const batch = await new Promise<any[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    children.push(...batch);
  }

  const nested = await Promise.all(children.map((child) => readEntry(child, currentPath)));
  return nested.flat();
}
