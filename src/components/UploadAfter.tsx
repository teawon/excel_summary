import { useState } from "react";
import type { DeliveryGroup, DeliveryItem } from "../types";
import {
  downloadDeliveryGroup,
  downloadPublicationGroup,
  groupDeliveryByQuarter,
  groupItemsByPublication,
} from "../utils/excel";

type UploadAfterProps = {
  groups: DeliveryGroup[];
  onReset: () => void;
};

type PreviewTarget = {
  title: string;
  items: DeliveryItem[];
};

export function UploadAfter({ groups, onReset }: UploadAfterProps) {
  const [activeQuarterByGroup, setActiveQuarterByGroup] = useState<Record<string, string>>({});
  const [activeTabByGroup, setActiveTabByGroup] = useState<Record<string, "publications" | "files">>({});
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const totalFileCount = groups.reduce(
    (sum, group) => sum + group.documents.length,
    0,
  );
  const totalItemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="delivery-summary" aria-label="납품서 요약">
      <button className="floating-reset-button" type="button" onClick={onReset}>
        처음으로
      </button>

      {previewTarget && (
        <PreviewModal
          items={previewTarget.items}
          onClose={() => setPreviewTarget(null)}
          title={previewTarget.title}
        />
      )}

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
        {groups.map((group) => {
          const quarterGroups = groupDeliveryByQuarter(group);
          const allPublicationCount = groupItemsByPublication(group.items).length;
          const activeQuarterId = activeQuarterByGroup[group.id] ?? quarterGroups[0]?.id ?? "";
          const activeQuarter = quarterGroups.find((quarter) => quarter.id === activeQuarterId) ?? quarterGroups[0];
          const scopedId = `${group.id}-${activeQuarter?.id ?? "all"}`;
          const activeTab = activeTabByGroup[scopedId] ?? "publications";
          const scopedItems = activeQuarter?.items ?? group.items;
          const scopedDocuments = activeQuarter?.documents ?? group.documents;
          const publicationGroups = groupItemsByPublication(scopedItems);
          const scopedDateRange = activeQuarter?.dateRange ?? group.dateRange;
          const scopedTotalQuantity =
            activeQuarter?.totalQuantity ?? group.totalQuantity;

          return (
            <details className="library-card" key={group.id}>
              <summary className="library-card-summary">
                <div>
                  <h2>{group.destinationName}</h2>
                  <p>
                    {group.dateRange || "날짜 없음"} · {group.documents.length}개 파일 ·{" "}
                    {allPublicationCount}개 간행물 · {group.items.length}개 항목 · 총{" "}
                    {group.totalQuantity}부
                  </p>
                </div>
              </summary>

              <div className="quarter-tabs" role="tablist" aria-label={`${group.destinationName} 분기 전환`}>
                {quarterGroups.map((quarterGroup) => (
                  <button
                    className={`quarter-tab ${activeQuarter?.id === quarterGroup.id ? "active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeQuarter?.id === quarterGroup.id}
                    key={quarterGroup.id}
                    onClick={() =>
                      setActiveQuarterByGroup((current) => ({
                        ...current,
                        [group.id]: quarterGroup.id,
                      }))
                    }
                  >
                    {quarterGroup.label} {quarterGroup.dateRange ? `(${formatDisplayDateRange(quarterGroup.dateRange)})` : ""}
                    <span>{quarterGroup.documents.length}개 파일</span>
                  </button>
                ))}
              </div>

              <div className="library-tabs" role="tablist" aria-label={`${group.destinationName} 보기 전환`}>
                <button
                  className={`library-tab ${activeTab === "publications" ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "publications"}
                  onClick={() =>
                    setActiveTabByGroup((current) => ({
                      ...current,
                      [scopedId]: "publications",
                    }))
                  }
                >
                  간행물별 다운로드
                </button>
                <button
                  className={`library-tab ${activeTab === "files" ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "files"}
                  onClick={() =>
                    setActiveTabByGroup((current) => ({
                      ...current,
                      [scopedId]: "files",
                    }))
                  }
                >
                  읽은 파일 리스트
                </button>
              </div>

              {activeTab === "publications" ? (
                <div className="publication-list" aria-label={`${group.destinationName} 간행물 목록`}>
                  {publicationGroups.map((publicationGroup) => (
                    <div className="publication-item" key={publicationGroup.id}>
                      <div>
                        <strong>{publicationGroup.publicationName}</strong>
                        <span>
                          {publicationGroup.dateRange || "날짜 없음"} ·{" "}
                          {publicationGroup.items.length}개 항목 · 총 {publicationGroup.totalQuantity}부
                        </span>
                      </div>
                      <div className="item-actions">
                        <button
                          className="preview-button"
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              title: `${group.destinationName} - ${publicationGroup.publicationName}`,
                              items: publicationGroup.items,
                            })
                          }
                        >
                          미리보기
                        </button>
                        <button
                          className="download-button"
                          type="button"
                          onClick={() => downloadPublicationGroup(group.destinationName, publicationGroup)}
                        >
                          다운로드
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="publication-item all-items">
                    <div>
                      <strong>전체 통합본</strong>
                      <span>
                        {scopedDateRange || "날짜 없음"} · {scopedItems.length}개 항목 · 총{" "}
                        {scopedTotalQuantity}부
                      </span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="preview-button"
                        type="button"
                        onClick={() =>
                          setPreviewTarget({
                            title: `${group.destinationName} - 전체 통합본`,
                            items: scopedItems,
                          })
                        }
                      >
                        미리보기
                      </button>
                      <button
                        className="download-button"
                        type="button"
                        onClick={() =>
                          downloadDeliveryGroup({
                            ...group,
                            documents: scopedDocuments,
                            items: scopedItems,
                            totalQuantity: scopedTotalQuantity,
                            dateRange: scopedDateRange,
                          })
                        }
                      >
                        다운로드
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grouped-file-list" aria-label={`${group.destinationName} 파일 목록`}>
                  {scopedDocuments.map((document) => (
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
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

function PreviewModal({
  items,
  onClose,
  title,
}: {
  items: DeliveryItem[];
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 미리보기`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{items.length}개 항목</p>
          </div>
          <button className="modal-close-button" type="button" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="modal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>납품처</th>
                <th>납품일</th>
                <th>번호</th>
                <th>간행물명</th>
                <th>간종</th>
                <th>발행일</th>
                <th>Vol-No.</th>
                <th>부수</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.destinationName}</td>
                  <td>{item.deliveryDate}</td>
                  <td>{item.sequence}</td>
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
        </div>
      </section>
    </div>
  );
}

function formatDisplayDateRange(dateRange: string) {
  return dateRange
    .split("-")
    .map((date) => {
      const compactDate = date.trim();

      if (!/^\d{4}$/.test(compactDate)) {
        return compactDate;
      }

      return `${Number(compactDate.slice(0, 2))}/${Number(compactDate.slice(2))}`;
    })
    .join("-");
}
