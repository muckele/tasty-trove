import { Link } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'

function NotFoundPage() {
  usePageStylesheets(['/stylesheets/not-found.css'])

  return (
    <main className="not-found-page">
      <section className="not-found-shell">
        <p className="not-found-kicker">404</p>
        <h1>Page Not Found</h1>
        <p>The page you are looking for is not available.</p>
        <Link to="/" className="not-found-link">
          Back Home
        </Link>
      </section>
    </main>
  )
}

export {
  NotFoundPage,
}
