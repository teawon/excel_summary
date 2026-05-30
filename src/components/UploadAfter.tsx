import { useState } from "react";
import type { DeliveryGroup } from "../types";
import {
  downloadDeliveryGroup,
  downloadPublicationGroup,
  groupItemsByPublication,
} from "../utils/excel";

type UploadAfterProps = {
  groups: DeliveryGroup[];
  onReset: () => void;
};

export function UploadAfter({ groups, onReset }: UploadAfterProps) {
  const [activeTabByGroup, setActiveTabByGroup] = useState<Record<string, "publications" | "files">>({});
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
          const activeTab = activeTabByGroup[group.id] ?? "publications";
          const publicationGroups = groupItemsByPublication(group.items);

          return (
            <details className="library-card" key={group.id}>
              <summary className="library-card-summary">
                <div>
                  <h2>{group.destinationName}</h2>
                  <p>
                    {group.dateRange || "날짜 없음"} · {group.documents.length}개 파일 ·{" "}
                    {publicationGroups.length}개 간행물 · {group.items.length}개 항목 · 총{" "}
                    {group.totalQuantity}부
                  </p>
                </div>
              </summary>

              <div className="library-tabs" role="tablist" aria-label={`${group.destinationName} 보기 전환`}>
                <button
                  className={`library-tab ${activeTab === "publications" ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "publications"}
                  onClick={() =>
                    setActiveTabByGroup((current) => ({
                      ...current,
                      [group.id]: "publications",
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
                      [group.id]: "files",
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
                      <button
                        className="download-button"
                        type="button"
                        onClick={() => downloadPublicationGroup(group.destinationName, publicationGroup)}
                      >
                        다운로드
                      </button>
                    </div>
                  ))}

                  <div className="publication-item all-items">
                    <div>
                      <strong>전체 통합본</strong>
                      <span>
                        {group.dateRange || "날짜 없음"} · {group.items.length}개 항목 · 총{" "}
                        {group.totalQuantity}부
                      </span>
                    </div>
                    <button
                      className="download-button"
                      type="button"
                      onClick={() => downloadDeliveryGroup(group)}
                    >
                      다운로드
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
