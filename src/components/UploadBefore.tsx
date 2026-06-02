import { FormEvent, useState } from "react";

type UploadBeforeProps = {
  excludedDestinations: string[];
  onAddExcludedDestination: (destination: string) => void;
  onRemoveExcludedDestination: (destination: string) => void;
};

export function UploadBefore({
  excludedDestinations,
  onAddExcludedDestination,
  onRemoveExcludedDestination,
}: UploadBeforeProps) {
  const [destination, setDestination] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddExcludedDestination(destination);
    setDestination("");
  };

  return (
    <section className="drop-panel" aria-label="파일 업로드">
      <div className="drop-panel-content">
        <span className="upload-icon" aria-hidden="true">
          +
        </span>
        <h1>파일을 올려주세요</h1>
        <p>날짜별 납품서 폴더를 드래그해 올려주세요</p>

        <div className="exclude-panel">
          <div>
            <h2>미포함 납품처</h2>
            <p>아래 납품처는 집계와 다운로드에서 제외됩니다.</p>
          </div>

          <form className="exclude-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="예: 국립중앙도서관(신문)"
              aria-label="미포함 납품처 추가"
            />
            <button type="submit">추가</button>
          </form>

          <div className="exclude-chip-list" aria-label="미포함 납품처 목록">
            {excludedDestinations.map((item) => (
              <span className="exclude-chip" key={item}>
                {item}
                <button
                  type="button"
                  aria-label={`${item} 삭제`}
                  onClick={() => onRemoveExcludedDestination(item)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
