import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="container">
      <div className="empty-state">
        <h2>That page is not here</h2>
        <p>The link may be old. Head back to your palaces.</p>
        <div className="empty-state__actions">
          <Link className="btn btn--primary" to="/">
            Go to your palaces
          </Link>
        </div>
      </div>
    </main>
  );
}
