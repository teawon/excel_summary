import { DragEvent, useMemo, useState } from "react";
import { UploadAfter } from "./components/UploadAfter";
import { UploadBefore } from "./components/UploadBefore";
import type { ParseError, UploadFile, WorkbookData } from "./types";
import { getUploadFilesFromDrop, isExcelFile, readWorkbook } from "./utils/excel";

function App() {
  const [workbooks, setWorkbooks] = useState<WorkbookData[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(null);
  const [activeSheetByWorkbook, setActiveSheetByWorkbook] = useState<
    Record<string, string>
  >({});
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const activeWorkbook = useMemo(
    () =>
      workbooks.find((workbook) => workbook.id === activeWorkbookId) ??
      workbooks[0],
    [activeWorkbookId, workbooks],
  );

  const activeSheetName = activeWorkbook
    ? activeSheetByWorkbook[activeWorkbook.id]
    : undefined;
  const activeSheet =
    activeWorkbook?.sheets.find((sheet) => sheet.name === activeSheetName) ??
    activeWorkbook?.sheets[0];

  const hasUploadedFiles = workbooks.length > 0;

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = await getUploadFilesFromDrop(event.dataTransfer);

    if (files.length === 0) {
      return;
    }

    await parseUploadFiles(files);
  };

  const parseUploadFiles = async (files: UploadFile[]) => {
    const excelFiles = files.filter(({ file }) => isExcelFile(file));

    if (excelFiles.length === 0) {
      setErrors((current) => [
        ...current,
        {
          id: `no-excel-${crypto.randomUUID()}`,
          fileName: "업로드 항목",
          message:
            "읽을 수 있는 엑셀 파일(.xlsx, .xls, .csv)을 찾지 못했습니다.",
        },
      ]);
      return;
    }

    setIsReading(true);
    const parsedWorkbooks: WorkbookData[] = [];
    const parseErrors: ParseError[] = [];

    await Promise.all(
      excelFiles.map(async (uploadFile) => {
        try {
          const workbook = await readWorkbook(uploadFile);
          parsedWorkbooks.push(workbook);
        } catch (error) {
          parseErrors.push({
            id: `${uploadFile.relativePath}-${uploadFile.file.lastModified}-error`,
            fileName: uploadFile.relativePath,
            message:
              error instanceof Error
                ? error.message
                : "파일을 읽는 중 오류가 발생했습니다.",
          });
        }
      }),
    );

    setWorkbooks((current) => {
      const next = [...current, ...parsedWorkbooks];

      if (!activeWorkbookId && next[0]) {
        setActiveWorkbookId(next[0].id);
      }

      return next;
    });

    setActiveSheetByWorkbook((current) => {
      const next = { ...current };

      for (const workbook of parsedWorkbooks) {
        if (workbook.sheets[0]) {
          next[workbook.id] = workbook.sheets[0].name;
        }
      }

      return next;
    });

    if (parsedWorkbooks[0]) {
      setActiveWorkbookId(parsedWorkbooks[0].id);
    }

    setErrors((current) => [...current, ...parseErrors]);
    setIsReading(false);
  };

  const handleRemoveWorkbook = (workbookId: string) => {
    setWorkbooks((current) => {
      const next = current.filter((workbook) => workbook.id !== workbookId);

      if (activeWorkbookId === workbookId) {
        setActiveWorkbookId(next[0]?.id ?? null);
      }

      return next;
    });
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
        <div
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-label="파일 읽는 중"
        >
          <div className="loading-spinner" aria-hidden="true" />
        </div>
      )}

      {errors.length > 0 && (
        <section className="error-list" aria-label="파일 오류">
          {errors.map((error) => (
            <div key={error.id} className="error-item">
              <strong>{error.fileName}</strong>
              <span>{error.message}</span>
            </div>
          ))}
        </section>
      )}

      {!hasUploadedFiles ? (
        <UploadBefore />
      ) : (
        <UploadAfter
          activeSheet={activeSheet}
          activeWorkbook={activeWorkbook}
          onRemoveWorkbook={handleRemoveWorkbook}
          onSelectSheet={(workbookId, sheetName) =>
            setActiveSheetByWorkbook((current) => ({
              ...current,
              [workbookId]: sheetName,
            }))
          }
          onSelectWorkbook={setActiveWorkbookId}
          workbooks={workbooks}
        />
      )}
    </main>
  );
}

export default App;
