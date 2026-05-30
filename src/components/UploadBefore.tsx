export function UploadBefore() {
  return (
    <section className="drop-panel" aria-label="파일 업로드">
      <div className="drop-panel-content">
        <span className="upload-icon" aria-hidden="true">
          +
        </span>
        <h1>파일을 올려주세요</h1>
        <p>각 분기별 폴더를 하나로 묶어 드래그 후 올려주세요</p>
      </div>
    </section>
  );
}

