import type { DeliveryGroup } from "../types";
import { downloadDeliveryGroup } from "../utils/excel";

type UploadAfterProps = {
  groups: DeliveryGroup[];
};

export function UploadAfter({ groups }: UploadAfterProps) {
  const totalFileCount = groups.reduce(
    (sum, group) => sum + group.documents.length,
    0,
  );
  const totalItemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="delivery-summary" aria-label="납품서 요약">
      <header className="summary-header">
        <div>
          <p className="summary-kicker">납품서 정리 결과</p>
          <h1>도서관별 납품 데이터</h1>
        </div>
        <div className="summary-stats" aria-label="전체 요약">
          <span>{groups.length}개 납품처</span>
          <span>{totalFileCount}개 파일</span>
          <span>{totalItemCount}개 항목</span>
        </div>
      </header>

      <div className="library-grid">
        {groups.map((group) => (
          <details className="library-card" key={group.id}>
            <summary className="library-card-summary">
              <div>
                <h2>{group.destinationName}</h2>
                <p>
                  {group.dateRange || "날짜 없음"} · {group.documents.length}개 파일 ·{" "}
                  {group.items.length}개 항목 · 총 {group.totalQuantity}부
                </p>
              </div>
            </summary>

            <div className="library-card-actions">
              <button
                className="download-button"
                type="button"
                onClick={() => downloadDeliveryGroup(group)}
              >
                다운로드
              </button>
            </div>

            <div className="grouped-file-list" aria-label={`${group.destinationName} 파일 목록`}>
              {group.documents.map((document) => (
                <div className="grouped-file-item" key={document.id}>
                  <div>
                    <strong>{document.fileName}</strong>
                    <span>{document.relativePath}</span>
                  </div>
                  <small>
                    {document.deliveryDate} · {document.items.length}개 항목
                  </small>
                </div>
              ))}
            </div>

            <div className="preview-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>납품일</th>
                    <th>간행물명</th>
                    <th>간종</th>
                    <th>발행일</th>
                    <th>Vol-No.</th>
                    <th>부수</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td>{item.deliveryDate}</td>
                      <td>{item.publicationName}</td>
                      <td>{item.publicationType}</td>
                      <td>{item.issueDate}</td>
                      <td>{item.volumeNo}</td>
                      <td>{item.quantity}</td>
                      <td>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {group.items.length > 8 && (
                <p className="row-limit">
                  화면에는 처음 8개 항목만 표시합니다. 전체 데이터는 다운로드 파일에 포함됩니다.
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
