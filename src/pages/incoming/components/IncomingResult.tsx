import { useEffect, useRef, useState } from "react";
import type { IncomingItemGroup } from "../types";
import { downloadItemGroup } from "../utils/excel";

type IncomingResultProps = {
  groups: IncomingItemGroup[];
  allDates: string[];
  onReset: () => void;
};

export function IncomingResult({ groups, allDates, onReset }: IncomingResultProps) {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const debouncedInput = useDebounce(inputValue, 200);

  useEffect(() => {
    setSearch(debouncedInput);
  }, [debouncedInput]);

  const filtered = search.trim()
    ? groups.filter((g) => g.itemName.toLowerCase().includes(search.trim().toLowerCase()))
    : groups;

  const totalQuantity = groups.reduce((sum, g) => sum + g.totalQuantity, 0);

  const handleSelect = (name: string) => {
    setInputValue(name);
    setSearch(name);
  };

  const handleClear = () => {
    setInputValue("");
    setSearch("");
  };

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

      <SearchBar
        value={inputValue}
        suggestions={groups.map((g) => g.itemName)}
        resultCount={search.trim() ? filtered.length : null}
        onChange={setInputValue}
        onSelect={handleSelect}
        onClear={handleClear}
      />

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

type SearchBarProps = {
  value: string;
  suggestions: string[];
  resultCount: number | null;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  onClear: () => void;
};

function SearchBar({ value, suggestions, resultCount, onChange, onSelect, onClear }: SearchBarProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 8)
    : [];

  const isOpen = open && filtered.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(filtered[activeIndex]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="incoming-search-wrap" ref={wrapperRef}>
      <div className="autocomplete-wrap">
        <input
          ref={inputRef}
          className="incoming-search"
          type="text"
          placeholder="품목명으로 검색 (예: 마이니치)"
          value={value}
          aria-label="품목명 검색"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button className="search-clear-button" type="button" onClick={() => { onClear(); inputRef.current?.focus(); }}>
            ✕
          </button>
        )}
        {isOpen && (
          <ul className="autocomplete-dropdown" role="listbox">
            {filtered.map((name, i) => (
              <li
                key={name}
                className={`autocomplete-item ${i === activeIndex ? "active" : ""}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(name);
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Highlight text={name} query={value.trim()} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {resultCount !== null && (
        <span className="incoming-search-count">{resultCount}개 품목</span>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="autocomplete-highlight">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
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
        <PreviewTable group={group} />
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

function PreviewTable({ group }: { group: IncomingItemGroup }) {
  return (
    <div className="incoming-preview-wrap">
      <div className="incoming-preview-actions">
        <span className="incoming-preview-count">{group.records.length}개 행</span>
        <button
          className="download-button"
          type="button"
          onClick={() => downloadItemGroup(group)}
        >
          엑셀 다운로드
        </button>
      </div>
      <div className="incoming-table-wrap">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>품목명</th>
              <th>ISSUE</th>
              <th>VOL.NO</th>
              <th>입고</th>
              <th>독자부수</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {group.records.map((record) => (
              <tr key={record.id}>
                <td>{formatDate(record.date)}</td>
                <td>{record.itemName}</td>
                <td>{record.issue}</td>
                <td>{record.volNo}</td>
                <td>{record.quantity}</td>
                <td>{record.subscriberQty}</td>
                <td>{record.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : date;
}

function toMonthDay(date: string) {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : date;
}
