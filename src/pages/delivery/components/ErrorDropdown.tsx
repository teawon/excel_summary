import type { ParseError } from "../types";

type ErrorDropdownProps = {
  errors: ParseError[];
};

export function ErrorDropdown({ errors }: ErrorDropdownProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <details className="error-dropdown">
      <summary>
        <div>
          <strong>읽지 못한 파일</strong>
          <span>{errors.length}개 파일에서 오류가 발생했습니다.</span>
        </div>
      </summary>

      <div className="error-list" aria-label="파일 오류">
        {errors.map((error) => (
          <div key={error.id} className="error-item">
            <strong>{error.fileName}</strong>
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
