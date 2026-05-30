import { DataTable } from "./DataTable";
import type { SheetData, WorkbookData } from "../types";
import { formatFileSize } from "../utils/format";

type UploadAfterProps = {
  activeSheet: SheetData | undefined;
  activeWorkbook: WorkbookData | undefined;
  onRemoveWorkbook: (workbookId: string) => void;
  onSelectSheet: (workbookId: string, sheetName: string) => void;
  onSelectWorkbook: (workbookId: string) => void;
  workbooks: WorkbookData[];
};

export function UploadAfter({
  activeSheet,
  activeWorkbook,
  onRemoveWorkbook,
  onSelectSheet,
  onSelectWorkbook,
  workbooks,
}: UploadAfterProps) {
  return (
    <section className="viewer-layout">
      <aside className="file-list" aria-label="업로드된 파일">
        <div className="section-heading">
          <h2>업로드 파일</h2>
          <span>{workbooks.length}개</span>
        </div>
        <div className="file-buttons">
          {workbooks.map((workbook) => (
            <button
              key={workbook.id}
              className={`file-button ${workbook.id === activeWorkbook?.id ? "active" : ""}`}
              type="button"
              onClick={() => onSelectWorkbook(workbook.id)}
            >
              <span>{workbook.fileName}</span>
              <small>
                {workbook.folderPath || "개별 업로드"} ·{" "}
                {formatFileSize(workbook.fileSize)}
              </small>
            </button>
          ))}
        </div>
      </aside>

      <section className="sheet-viewer" aria-label="파일 내용">
        {activeWorkbook && activeSheet && (
          <>
            <div className="viewer-header">
              <div>
                <h2>{activeWorkbook.fileName}</h2>
                <p>
                  {activeWorkbook.relativePath} · {activeWorkbook.sheets.length}
                  개 시트 · {formatFileSize(activeWorkbook.fileSize)}
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onRemoveWorkbook(activeWorkbook.id)}
              >
                제거
              </button>
            </div>

            <div className="sheet-tabs" role="tablist" aria-label="시트 목록">
              {activeWorkbook.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  className={`sheet-tab ${sheet.name === activeSheet.name ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={sheet.name === activeSheet.name}
                  onClick={() => onSelectSheet(activeWorkbook.id, sheet.name)}
                >
                  {sheet.name}
                </button>
              ))}
            </div>

            <DataTable sheet={activeSheet} />
          </>
        )}
      </section>
    </section>
  );
}

