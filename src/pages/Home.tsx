import { useNavigate } from "react-router-dom";
import { features } from "../features";

export function Home() {
  const navigate = useNavigate();

  return (
    <main className="home">
      <header className="home-header">
        <h1>엑셀 도구</h1>
        <p>업무에 필요한 엑셀 작업 도구 모음</p>
      </header>
      <div className="feature-grid">
        {features.map((feature) => (
          <button
            key={feature.path}
            className="feature-card"
            type="button"
            onClick={() => navigate(feature.path)}
          >
            <div className="feature-card-indicator" />
            <div className="feature-card-body">
              <h2>{feature.label}</h2>
              <p>{feature.description}</p>
            </div>
            <span className="feature-card-action">시작하기 →</span>
          </button>
        ))}
      </div>
    </main>
  );
}
