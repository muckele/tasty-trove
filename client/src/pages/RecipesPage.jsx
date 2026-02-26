import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function RecipesPage() {
  usePageStylesheets(['/stylesheets/recipes/index.css'])

  const [searchParams] = useSearchParams()
  const [recipes, setRecipes] = useState([])
  const query = searchParams.get('query') || ''

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      try {
        const data = await api.listRecipes(query)
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
  }, [query])

  return (
    <section>
      <h1 className="section-heading">{query ? 'Search Results' : 'Recipe List'}</h1>
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <Link key={recipe._id} to={`/recipes/${recipe._id}`}>
            <div className="recipe-tile">
              <h2>{recipe.name}</h2>
              <img className="recipe-image" src={recipe.imageUrl} alt={`${recipe.name} Image`} />
              <p>Total Time: {recipe.totalTime}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export {
  RecipesPage,
}
