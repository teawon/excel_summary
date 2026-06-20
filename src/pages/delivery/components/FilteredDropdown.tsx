import type { FilteredItem } from "../types";

type FilteredDropdownProps = {
  items: FilteredItem[];
};

export function FilteredDropdown({ items }: FilteredDropdownProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <details className="filtered-dropdown">
      <summary>
        <div>
          <strong>필터링으로 무시한 항목</strong>
          <span>{items.length}개 항목이 제외되었습니다.</span>
        </div>
      </summary>

      <div className="filtered-list" aria-label="필터링으로 무시한 항목">
        {items.map((item) => (
          <div key={item.id} className="filtered-item">
            <strong>{item.fileName}</strong>
            <span>{item.relativePath}</span>
            <small>{item.reason}</small>
          </div>
        ))}
      </div>
    </details>
  );
}
