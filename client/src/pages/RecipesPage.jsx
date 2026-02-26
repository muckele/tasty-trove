import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

const MEAL_CATEGORY_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'side', label: 'Side' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
  { value: 'soup', label: 'Soup' },
  { value: 'salad', label: 'Salad' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'other', label: 'Other' },
]

const CUISINE_TYPE_OPTIONS = [
  { value: 'american', label: 'American' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'italian', label: 'Italian' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'indian', label: 'Indian' },
  { value: 'thai', label: 'Thai' },
  { value: 'french', label: 'French' },
  { value: 'greek', label: 'Greek' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'korean', label: 'Korean' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'middle eastern', label: 'Middle Eastern' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'other', label: 'Other' },
]

function titleize(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function RecipesPage() {
  usePageStylesheets(['/stylesheets/recipes/index.css'])

  const [searchParams, setSearchParams] = useSearchParams()
  const [recipes, setRecipes] = useState([])
  const [tileDensity, setTileDensity] = useState(() => {
    if (typeof window === 'undefined') {
      return 'comfortable'
    }

    const savedValue = window.localStorage.getItem('recipeTileDensity')
    return savedValue === 'dense' ? 'dense' : 'comfortable'
  })
  const query = searchParams.get('query') || ''
  const mealCategory = searchParams.get('mealCategory') || ''
  const cuisineType = searchParams.get('cuisineType') || ''

  const hasActiveFilters = useMemo(
    () => Boolean(query || mealCategory || cuisineType),
    [query, mealCategory, cuisineType]
  )

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      try {
        const data = await api.listRecipes({
          query,
          mealCategory,
          cuisineType,
        })
        if (!cancelled) {
          setRecipes(data.recipes || [])
        }
      } catch (err) {
        console.log(err)
      }
    }

    loadRecipes()

    return () => {
      cancelled = true
    }
  }, [query, mealCategory, cuisineType])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem('recipeTileDensity', tileDensity)
  }, [tileDensity])

  function updateFilters(nextValues) {
    const params = new URLSearchParams(searchParams)

    Object.entries(nextValues).forEach(([key, value]) => {
      const normalizedValue = String(value || '').trim()
      if (!normalizedValue) {
        params.delete(key)
      } else {
        params.set(key, normalizedValue)
      }
    })

    setSearchParams(params)
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams)
    params.delete('query')
    params.delete('mealCategory')
    params.delete('cuisineType')
    setSearchParams(params)
  }

  return (
    <main className={`recipes-page ${tileDensity === 'dense' ? 'density-dense' : ''}`}>
      <section className="recipes-hero">
        <p className="recipes-kicker">Browse</p>
        <h1 className="section-heading">{hasActiveFilters ? 'Filtered Recipes' : 'Recipe Library'}</h1>
        <p className="recipes-intro">
          Explore dishes by meal and cuisine, then jump straight into the recipe
          that fits your table tonight.
        </p>
      </section>
      <section className="recipes-toolbar">
        <div className="recipe-filters">
          <div className="recipe-filter-control">
            <label htmlFor="meal-category-filter">Meal Category</label>
            <select
              id="meal-category-filter"
              value={mealCategory}
              onChange={(event) =>
                updateFilters({ mealCategory: event.target.value })
              }
            >
              <option value="">All Meal Categories</option>
              {MEAL_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="recipe-filter-control">
            <label htmlFor="cuisine-type-filter">Cuisine Type</label>
            <select
              id="cuisine-type-filter"
              value={cuisineType}
              onChange={(event) =>
                updateFilters({ cuisineType: event.target.value })
              }
            >
              <option value="">All Cuisines</option>
              {CUISINE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
        </div>
        <div className="recipes-toolbar-right">
          <div className="density-toggle" role="group" aria-label="Recipe tile density">
            <button
              type="button"
              className={tileDensity === 'comfortable' ? 'active' : ''}
              aria-pressed={tileDensity === 'comfortable'}
              onClick={() => setTileDensity('comfortable')}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={tileDensity === 'dense' ? 'active' : ''}
              aria-pressed={tileDensity === 'dense'}
              onClick={() => setTileDensity('dense')}
            >
              Dense
            </button>
          </div>
          <p className="recipe-count">
            {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>
      {query ? <p className="active-search">Search: "{query}"</p> : null}
      {!recipes.length ? (
        <p className="no-recipes-message">No recipes matched these filters.</p>
      ) : null}
      <div className={`recipe-grid ${tileDensity === 'dense' ? 'recipe-grid--dense' : ''}`}>
        {recipes.map((recipe) => (
          <Link key={recipe._id} to={`/recipes/${recipe._id}`} className="recipe-tile-link">
            <article className="recipe-tile">
              <h2>{recipe.name}</h2>
              <img
                className="recipe-image"
                src={recipe.imageUrl || '/assets/images/logo-images/logo.png'}
                alt={`${recipe.name} Image`}
              />
              <p className="recipe-tagline">
                {titleize(recipe.mealCategory || 'other')} | {titleize(recipe.cuisineType || 'other')}
              </p>
              <p className="recipe-time">Total Time: {recipe.totalTime} min</p>
            </article>
          </Link>
        ))}
      </div>
    </main>
  )
}

export {
  RecipesPage,
}
