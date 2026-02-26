import { useEffect, useState } from 'react'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function HomePage({ user }) {
  usePageStylesheets(['/stylesheets/index.css'])

  const [randomRecipes, setRandomRecipes] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadHome() {
      try {
        const data = await api.getHome()
        if (!cancelled) {
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
    <main>
      <section className="welcome-section">
        <h1>Welcome to Tasty Trove, {user?.profile?.name || 'Chef!'}</h1>
        {user?.profile?.avatar ? (
          <div className="avatar-container">
            <img src={user.profile.avatar} alt={`${user.profile.name} avatar`} />
          </div>
        ) : null}
      </section>

      <section id="welcome-message">
        <p>
          Indulge your taste buds in a culinary adventure with Tasty Trove, your
          go-to destination for delicious recipes that ignite the chef in you!
          From mouthwatering mains to irresistible desserts, we&apos;ve curated a
          collection that promises to elevate your cooking experience.
          <br />
          <br />
          Explore, cook, and savor the joy of creating culinary wonders. Get
          ready to embark on a flavorsome journey!
          <br />
          <br />
          Happy Cooking! 🍽️✨
        </p>
      </section>

      <hr />
      <section className="logo-section">
        <img id="logo" src="/assets/images/logo-images/logo.png" alt="Title Image" />
      </section>

      <section className="top-recipes">
        <h2>Top Recipes</h2>
        <div className="recipe-list">
          {randomRecipes.map((recipe) => (
            <div key={recipe._id} className="recipe-card">
              <img src={recipe.imageUrl} alt={recipe.name} />
              <div className="recipe-info">
                <h3>{recipe.name}</h3>
                <p>{recipe.description || ''}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export {
  HomePage,
}
