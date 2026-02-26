import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function titleize(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function HomePage({ user }) {
  usePageStylesheets(['/stylesheets/index.css'])

  const [randomRecipes, setRandomRecipes] = useState([])
  const [featuredRecipe, setFeaturedRecipe] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadHome() {
      try {
        const data = await api.getHome()
        if (!cancelled) {
          setFeaturedRecipe(data.featuredRecipe || null)
          setRandomRecipes(data.randomRecipes || [])
        }
      } catch (err) {
        console.log(err)
      }
    }

    loadHome()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="hero-kicker">Tasty Trove Daily</p>
        <h1>Welcome, {user?.profile?.name || 'Chef'}.</h1>
        <p className="hero-copy">
          Cook with confidence using crowd-favorite recipes, now organized by
          category and cuisine so you can find the perfect dish faster.
        </p>
        <div className="hero-actions">
          <Link to="/recipes" className="hero-action-primary">
            Browse Recipes
          </Link>
          {user ? (
            <Link to="/recipes/new" className="hero-action-secondary">
              Create Recipe
            </Link>
          ) : null}
        </div>
        {user?.profile?.avatar ? (
          <div className="avatar-container" aria-hidden="true">
            <img src={user.profile.avatar} alt={`${user.profile.name} avatar`} />
          </div>
        ) : null}
      </section>

      {featuredRecipe ? (
        <section className="featured-day">
          <p className="featured-kicker">Recipe Of The Day</p>
          <Link to={`/recipes/${featuredRecipe._id}`} className="featured-card-link">
            <article className="featured-card">
              <img
                src={featuredRecipe.imageUrl || '/assets/images/logo-images/logo.png'}
                alt={featuredRecipe.name}
              />
              <div className="featured-content">
                <p className="featured-meta">
                  {titleize(featuredRecipe.mealCategory || 'other')} | {titleize(featuredRecipe.cuisineType || 'other')}
                </p>
                <h2>{featuredRecipe.name}</h2>
                <p>
                  {featuredRecipe.description ||
                    'A standout recipe picked for today. Tap in and start cooking.'}
                </p>
                <span className="featured-cta">View Recipe</span>
              </div>
            </article>
          </Link>
        </section>
      ) : null}

      <section className="home-highlights">
        <article className="highlight-card">
          <h2>Cook by Mood</h2>
          <p>
            Jump from breakfast to dinner in one click and discover dishes that
            match your day.
          </p>
        </article>
        <article className="highlight-card">
          <h2>Explore Cuisines</h2>
          <p>
            Compare cuisines side-by-side, from quick American classics to rich
            Mediterranean comfort food.
          </p>
        </article>
        <article className="highlight-card">
          <h2>Save Your Style</h2>
          <p>
            Build your own library of recipes and personalize ingredients and
            servings for your kitchen.
          </p>
        </article>
      </section>

      <section className="top-recipes">
        <div className="section-headline">
          <h2>From The Community Kitchen</h2>
          <p>Fresh picks to inspire your next meal.</p>
        </div>
        <div className="recipe-list">
          {randomRecipes.map((recipe) => (
            <Link key={recipe._id} to={`/recipes/${recipe._id}`} className="recipe-card-link">
              <article className="recipe-card">
                <img
                  src={recipe.imageUrl || '/assets/images/logo-images/logo.png'}
                  alt={recipe.name}
                />
                <div className="recipe-info">
                  <p className="recipe-meta">
                    {titleize(recipe.mealCategory || 'other')} | {titleize(recipe.cuisineType || 'other')}
                  </p>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description || 'A great pick from the Tasty Trove recipe box.'}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
        {!randomRecipes.length ? (
          <p className="no-home-recipes">No featured recipes yet. Add one to get started.</p>
        ) : null}
      </section>
    </main>
  )
}

export {
  HomePage,
}
