import { Link, useLocation } from "react-router-dom";
import { features } from "../features";

export function GNB() {
  const location = useLocation();

  return (
    <nav className="gnb">
      <Link to="/" className="gnb-home">
        엑셀 도구
      </Link>
      <div className="gnb-links">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className={`gnb-link ${location.pathname === feature.path ? "active" : ""}`}
          >
            {feature.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
