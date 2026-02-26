import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function titleize(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function LibraryPage({ user, sessionLoading }) {
  usePageStylesheets(['/stylesheets/library.css'])

  const [library, setLibrary] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [selectedFavoriteRecipeId, setSelectedFavoriteRecipeId] = useState('')
  const [collectionRecipeSelections, setCollectionRecipeSelections] = useState({})
  const [collectionRenameValues, setCollectionRenameValues] = useState({})

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false

    async function loadLibraryData() {
      setLoading(true)
      setError('')

      try {
        const [libraryData, recipeData] = await Promise.all([
          api.getLibrary(),
          api.listRecipes(),
        ])

        if (!cancelled) {
          setLibrary(libraryData.library || { favoriteRecipes: [], collections: [] })
          setRecipes(recipeData.recipes || [])
        }
      } catch (err) {
        console.log(err)
        if (!cancelled) {
          setError(err.message || 'Unable to load library')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLibraryData()

    return () => {
      cancelled = true
    }
  }, [user?._id])

  const favoriteIds = useMemo(
    () => new Set((library?.favoriteRecipes || []).map((recipe) => String(recipe._id))),
    [library?.favoriteRecipes]
  )

  if (sessionLoading && !user) {
    return (
      <main className="library-page">
        <h1>Loading library...</h1>
      </main>
    )
  }

  if (!sessionLoading && !user) {
    return <Navigate to="/" replace />
  }

  async function refreshLibrary() {
    try {
      const data = await api.getLibrary()
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to refresh library')
    }
  }

  async function handleAddFavorite() {
    if (!selectedFavoriteRecipeId) {
      return
    }

    try {
      const data = await api.addFavorite(selectedFavoriteRecipeId)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
      setSelectedFavoriteRecipeId('')
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to add favorite')
    }
  }

  async function handleRemoveFavorite(recipeId) {
    try {
      const data = await api.removeFavorite(recipeId)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to remove favorite')
    }
  }

  async function handleCreateCollection(event) {
    event.preventDefault()
    if (!newCollectionName.trim()) {
      return
    }

    try {
      const data = await api.createCollection(newCollectionName.trim())
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
      setNewCollectionName('')
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to create collection')
    }
  }

  async function handleRenameCollection(collectionId) {
    const nextName = String(collectionRenameValues[collectionId] || '').trim()
    if (!nextName) {
      return
    }

    try {
      const data = await api.renameCollection(collectionId, nextName)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to rename collection')
    }
  }

  async function handleDeleteCollection(collectionId) {
    const shouldDelete = window.confirm('Delete this collection?')
    if (!shouldDelete) {
      return
    }

    try {
      const data = await api.deleteCollection(collectionId)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to delete collection')
    }
  }

  async function handleAddRecipeToCollection(collectionId) {
    const recipeId = String(collectionRecipeSelections[collectionId] || '').trim()
    if (!recipeId) {
      return
    }

    try {
      const data = await api.addRecipeToCollection(collectionId, recipeId)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
      setCollectionRecipeSelections((current) => ({
        ...current,
        [collectionId]: '',
      }))
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to add recipe to collection')
    }
  }

  async function handleRemoveRecipeFromCollection(collectionId, recipeId) {
    try {
      const data = await api.removeRecipeFromCollection(collectionId, recipeId)
      setLibrary(data.library || { favoriteRecipes: [], collections: [] })
    } catch (err) {
      console.log(err)
      setError(err.message || 'Unable to remove recipe from collection')
    }
  }

  return (
    <main className="library-page">
      <section className="library-shell">
        <h1>Favorites & Collections</h1>
        <p>
          Save your best recipes, organize them into collections, and quickly jump
          back in when planning meals.
        </p>
        {error ? <p className="library-error">{error}</p> : null}
        {loading ? <p>Loading...</p> : null}
      </section>

      <section className="library-shell">
        <h2>Favorites</h2>
        <div className="library-actions">
          <select
            value={selectedFavoriteRecipeId}
            onChange={(event) => setSelectedFavoriteRecipeId(event.target.value)}
          >
            <option value="">Select recipe to favorite</option>
            {recipes.map((recipe) => (
              <option key={recipe._id} value={recipe._id}>
                {recipe.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAddFavorite}>
            Add Favorite
          </button>
          <button type="button" onClick={refreshLibrary}>
            Refresh
          </button>
        </div>
        <div className="favorite-grid">
          {(library?.favoriteRecipes || []).map((recipe) => (
            <article key={recipe._id} className="library-recipe-card">
              <img
                src={recipe.imageUrl || '/assets/images/logo-images/logo.png'}
                alt={recipe.name}
              />
              <h3>
                <Link to={`/recipes/${recipe._id}`}>{recipe.name}</Link>
              </h3>
              <p>
                {titleize(recipe.mealCategory || 'other')} |{' '}
                {titleize(recipe.cuisineType || 'other')}
              </p>
              <button
                type="button"
                className="danger"
                onClick={() => handleRemoveFavorite(recipe._id)}
              >
                Remove Favorite
              </button>
            </article>
          ))}
          {!library?.favoriteRecipes?.length ? (
            <p className="empty-state">No favorites yet.</p>
          ) : null}
        </div>
      </section>

      <section className="library-shell">
        <h2>Collections</h2>
        <form className="create-collection-form" onSubmit={handleCreateCollection}>
          <input
            type="text"
            value={newCollectionName}
            placeholder="e.g. Weeknight Winners"
            onChange={(event) => setNewCollectionName(event.target.value)}
          />
          <button type="submit">Create Collection</button>
        </form>
        <div className="collection-list">
          {(library?.collections || []).map((collection) => (
            <article key={collection._id} className="collection-card">
              <div className="collection-header">
                <input
                  type="text"
                  value={collectionRenameValues[collection._id] ?? collection.name}
                  onChange={(event) =>
                    setCollectionRenameValues((current) => ({
                      ...current,
                      [collection._id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => handleRenameCollection(collection._id)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDeleteCollection(collection._id)}
                >
                  Delete
                </button>
              </div>
              <div className="collection-actions">
                <select
                  value={collectionRecipeSelections[collection._id] || ''}
                  onChange={(event) =>
                    setCollectionRecipeSelections((current) => ({
                      ...current,
                      [collection._id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Add recipe to collection</option>
                  {recipes.map((recipe) => (
                    <option key={recipe._id} value={recipe._id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddRecipeToCollection(collection._id)}
                >
                  Add Recipe
                </button>
              </div>
              <ul className="collection-recipes">
                {(collection.recipes || []).map((recipe) => (
                  <li key={`${collection._id}-${recipe._id}`}>
                    <Link to={`/recipes/${recipe._id}`}>{recipe.name}</Link>
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        handleRemoveRecipeFromCollection(collection._id, recipe._id)
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {!collection.recipes?.length ? (
                  <li className="empty-state">No recipes in this collection yet.</li>
                ) : null}
              </ul>
            </article>
          ))}
          {!library?.collections?.length ? (
            <p className="empty-state">No collections yet.</p>
          ) : null}
        </div>
      </section>

      <section className="library-shell">
        <h2>Quick Recipe Browser</h2>
        <p>
          Recipes with a filled heart are already in your favorites.
        </p>
        <div className="favorite-grid">
          {recipes.map((recipe) => (
            <article key={`browse-${recipe._id}`} className="library-recipe-card">
              <h3>
                <Link to={`/recipes/${recipe._id}`}>{recipe.name}</Link>
              </h3>
              <p>
                {titleize(recipe.mealCategory || 'other')} |{' '}
                {titleize(recipe.cuisineType || 'other')}
              </p>
              {favoriteIds.has(String(recipe._id)) ? (
                <p className="favorited-label">★ Favorited</p>
              ) : (
                <button type="button" onClick={() => handleAddFavorite(recipe._id)}>
                  Add to Favorites
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export { LibraryPage }
