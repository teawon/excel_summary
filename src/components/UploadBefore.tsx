export function UploadBefore() {
  return (
    <section className="drop-panel" aria-label="파일 업로드">
      <div className="drop-panel-content">
        <span className="upload-icon" aria-hidden="true">
          +
        </span>
        <h1>파일을 올려주세요</h1>
        <p>날짜별 납품서 폴더를 드래그해 올려주세요</p>
      </div>
    </section>
  );
}
