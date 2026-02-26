import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function NavBar({ user, googleClientID, onSessionChange }) {
  usePageStylesheets(['/stylesheets/nav.css'])

  const [showLinks, setShowLinks] = useState(true)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(params.get('query') || '')
  }, [location.search])

  useEffect(() => {
    if (user || !googleClientID) {
      return
    }

    if (document.querySelector('script[data-google-one-tap]')) {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleOneTap = 'true'
    document.body.appendChild(script)
  }, [user, googleClientID])

  async function handleLogout() {
    try {
      await api.logout()
      await onSessionChange()
      navigate('/')
    } catch (err) {
      console.log(err)
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      navigate('/recipes')
      return
    }

    navigate(`/recipes?query=${encodeURIComponent(value)}`)
  }

  return (
    <nav className="navbar">
      <div className="nav-center">
        <div className="nav-header">
          <Link to="/" className="nav-logo">
            <img src="/assets/images/logo-images/logo.png" alt="Tasty Trove" />
          </Link>
          <button
            type="button"
            className="nav-btn"
            onClick={() => setShowLinks((current) => !current)}
          >
            <i className="fas fa-align-justify" />
          </button>
        </div>
        <div className={`nav-links ${showLinks ? 'show-links' : ''}`}>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/recipes/new"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Create A Recipe
              </NavLink>
              <NavLink
                to="/planner"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Meal Planner
              </NavLink>
              <NavLink
                to="/library"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Library
              </NavLink>
            </>
          ) : null}
          <NavLink
            to="/recipes"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            All Recipes
          </NavLink>
        </div>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for recipes..."
          />
          <button type="submit">
            <i className="fas fa-search" />
          </button>
        </form>
      </div>
      <div className="user-actions">
        {user ? (
          <button type="button" id="logout" onClick={handleLogout}>
            Logout
          </button>
        ) : googleClientID ? (
          <>
            <div
              id="g_id_onload"
              data-client_id={googleClientID || ''}
              data-login_uri="/auth/google"
              data-auto_prompt="false"
              data-prompt_parent_id="g_id_onload"
            />
            <div
              className="g_id_signin"
              data-type="standard"
              data-size="large"
              data-theme="outline"
              data-text="sign_in_with"
              data-shape="rectangular"
              data-logo_alignment="right"
            />
          </>
        ) : null}
      </div>
    </nav>
  )
}

export {
  NavBar,
}
