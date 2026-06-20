import { useState } from "react";
import type { IncomingItemGroup, IncomingRecord } from "../types";

type IncomingResultProps = {
  groups: IncomingItemGroup[];
  allDates: string[];
  onReset: () => void;
};

export function IncomingResult({ groups, allDates, onReset }: IncomingResultProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? groups.filter((g) =>
        g.itemName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : groups;

  const totalQuantity = groups.reduce((sum, g) => sum + g.totalQuantity, 0);

  return (
    <section className="incoming-result" aria-label="입고 현황">
      <button className="floating-reset-button" type="button" onClick={onReset}>
        처음으로
      </button>

      <header className="summary-header">
        <div>
          <p className="summary-kicker">입고 현황</p>
          <h1>품목별 입고 리스트</h1>
        </div>
        <div className="summary-stats">
          <span>{allDates.length}개 날짜</span>
          <span>{groups.length}개 품목</span>
          <span>총 {totalQuantity}부</span>
        </div>
      </header>

      <div className="incoming-search-wrap">
        <input
          className="incoming-search"
          type="search"
          placeholder="품목명으로 검색 (예: 마이니치)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="품목명 검색"
        />
        {search && (
          <span className="incoming-search-count">{filtered.length}개 품목</span>
        )}
      </div>

      <div className="incoming-item-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h2>검색 결과 없음</h2>
            <p>"{search}"에 해당하는 품목이 없습니다.</p>
          </div>
        ) : (
          filtered.map((group) => (
            <ItemGroupCard key={group.id} group={group} allDates={allDates} />
          ))
        )}
      </div>
    </section>
  );
}

function ItemGroupCard({
  group,
  allDates,
}: {
  group: IncomingItemGroup;
  allDates: string[];
}) {
  const hasMissing = group.missingDates.length > 0;

  return (
    <details className="incoming-card">
      <summary className="incoming-card-summary">
        <div className="incoming-card-header">
          <h2>{group.itemName}</h2>
          <p>
            {allDates.length}일 중 {group.presentDates.length}일 입고 · 총{" "}
            {group.totalQuantity}부
            {hasMissing && (
              <span className="missing-badge">{group.missingDates.length}일 누락</span>
            )}
          </p>
        </div>
        <DateCoverage group={group} allDates={allDates} />
      </summary>

      <div className="incoming-card-detail">
        <RecordTable records={group.records} missingDates={group.missingDates} />
      </div>
    </details>
  );
}

function DateCoverage({
  group,
  allDates,
}: {
  group: IncomingItemGroup;
  allDates: string[];
}) {
  const presentSet = new Set(group.presentDates);
  const quantityByDate = new Map<string, number>();

  for (const record of group.records) {
    quantityByDate.set(record.date, (quantityByDate.get(record.date) ?? 0) + record.quantity);
  }

  return (
    <div className="date-coverage" aria-label="날짜별 입고 현황">
      {allDates.map((date) => {
        const present = presentSet.has(date);
        const qty = quantityByDate.get(date);
        return (
          <span
            key={date}
            className={`date-chip ${present ? "present" : "missing"}`}
            title={present ? `${formatDate(date)} · ${qty}부` : `${formatDate(date)} · 누락`}
          >
            {toMonthDay(date)}
            {present && <small>{qty}</small>}
          </span>
        );
      })}
    </div>
  );
}

function RecordTable({
  records,
  missingDates,
}: {
  records: IncomingRecord[];
  missingDates: string[];
}) {
  const missingSet = new Set(missingDates);

  const dateGroups = new Map<string, IncomingRecord[]>();
  for (const record of records) {
    const current = dateGroups.get(record.date) ?? [];
    current.push(record);
    dateGroups.set(record.date, current);
  }

  const allDatesInTable = [
    ...[...dateGroups.keys()].sort(),
    ...missingDates,
  ].sort();

  const uniqueDates = [...new Set(allDatesInTable)];

  return (
    <div className="incoming-table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>ISSUE</th>
            <th>VOL.NO</th>
            <th>입고</th>
            <th>독자부수</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {uniqueDates.map((date) => {
            if (missingSet.has(date)) {
              return (
                <tr key={date} className="missing-row">
                  <td>{formatDate(date)}</td>
                  <td colSpan={5} className="missing-cell">누락</td>
                </tr>
              );
            }

            const dayRecords = dateGroups.get(date) ?? [];
            return dayRecords.map((record, i) => (
              <tr key={record.id}>
                {i === 0 && (
                  <td rowSpan={dayRecords.length}>{formatDate(date)}</td>
                )}
                <td>{record.issue}</td>
                <td>{record.volNo}</td>
                <td>{record.quantity}</td>
                <td>{record.subscriberQty}</td>
                <td>{record.remark}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : date;
}

function toMonthDay(date: string) {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : date;
}
