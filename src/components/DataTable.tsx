import { maxPreviewRows } from "../utils/excel";
import type { SheetData } from "../types";

export function DataTable({ sheet }: { sheet: SheetData }) {
  if (sheet.headers.length === 0) {
    return (
      <div className="empty-sheet">
        <h3>{sheet.name}</h3>
        <p>표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {sheet.headers.map((header, index) => (
              <th key={`${header}-${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.length > 0 ? (
            sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={sheet.headers.length}>표시할 행이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
      {sheet.rows.length === maxPreviewRows && (
        <p className="row-limit">
          미리보기 성능을 위해 처음 {maxPreviewRows}개 행만 표시합니다.
        </p>
      )}
    </div>
  );
}

