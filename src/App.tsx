import { DragEvent, useMemo, useState } from "react";
import { ErrorDropdown } from "./components/ErrorDropdown";
import { UploadAfter } from "./components/UploadAfter";
import { UploadBefore } from "./components/UploadBefore";
import type { DeliveryDocument, ParseError, UploadFile } from "./types";
import {
  getUploadFilesFromDrop,
  groupDeliveryDocuments,
  isExcelFile,
  parseDeliveryDocument,
} from "./utils/excel";

function App() {
  const [documents, setDocuments] = useState<DeliveryDocument[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const deliveryGroups = useMemo(
    () => groupDeliveryDocuments(documents),
    [documents],
  );
  const hasUploadedFiles = deliveryGroups.length > 0;

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
    const parsedDocuments: DeliveryDocument[] = [];
    const parseErrors: ParseError[] = [];

    await Promise.all(
      excelFiles.map(async (uploadFile) => {
        try {
          const document = await parseDeliveryDocument(uploadFile);
          parsedDocuments.push(document);
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

    setDocuments((current) => [...current, ...parsedDocuments]);
    setErrors((current) => [...current, ...parseErrors]);
    setIsReading(false);
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

      <ErrorDropdown errors={errors} />

      {!hasUploadedFiles ? (
        <UploadBefore />
      ) : (
        <UploadAfter groups={deliveryGroups} />
      )}
    </main>
  );
}

export default App;
