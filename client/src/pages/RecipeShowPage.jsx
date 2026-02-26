import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function getProfileId(user) {
  if (!user?.profile) {
    return null
  }

  if (typeof user.profile === 'string') {
    return user.profile
  }

  return user.profile._id
}

function RecipeShowPage({ user }) {
  usePageStylesheets(['/stylesheets/recipes/show.css'])

  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [newReview, setNewReview] = useState({ content: '', rating: 1 })

  useEffect(() => {
    let cancelled = false

    async function loadRecipe() {
      try {
        const data = await api.getRecipe(recipeId)
        if (!cancelled) {
          setRecipe(data.recipe)
          setNotFound(false)
        }
      } catch (err) {
        console.log(err)
        if (!cancelled) {
          setNotFound(true)
        }
      }
    }

    loadRecipe()

    return () => {
      cancelled = true
    }
  }, [recipeId])

  const userProfileId = getProfileId(user)
  const isRecipeOwner = useMemo(() => {
    if (!userProfileId || !recipe?.owner?._id) {
      return false
    }

    return recipe.owner._id === userProfileId
  }, [recipe, userProfileId])

  const averageRating = useMemo(() => {
    if (!recipe?.reviews?.length) {
      return null
    }

    const total = recipe.reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    )
    return (total / recipe.reviews.length).toFixed(2)
  }, [recipe])

  async function refreshRecipe() {
    try {
      const data = await api.getRecipe(recipeId)
      setRecipe(data.recipe)
      setNotFound(false)
    } catch (err) {
      console.log(err)
      setNotFound(true)
    }
  }

  async function handleDeleteRecipe() {
    const shouldDelete = window.confirm('Delete this recipe?')
    if (!shouldDelete) {
      return
    }

    try {
      await api.deleteRecipe(recipeId)
      navigate('/recipes')
    } catch (err) {
      console.log(err)
    }
  }

  async function handleReviewSubmit(event) {
    event.preventDefault()

    try {
      const data = await api.createReview(recipeId, newReview)
      setRecipe(data.recipe)
      setNewReview({ content: '', rating: 1 })
    } catch (err) {
      console.log(err)
    }
  }

  async function handleDeleteReview(reviewId) {
    const shouldDelete = window.confirm('Delete this review?')
    if (!shouldDelete) {
      return
    }

    try {
      await api.deleteReview(recipeId, reviewId)
      await refreshRecipe()
    } catch (err) {
      console.log(err)
    }
  }

  if (!recipe) {
    return (
      <section>
        <h1>{notFound ? 'Recipe not found.' : 'Loading recipe...'}</h1>
      </section>
    )
  }

  return (
    <>
      <section>
        <div className="recipe-header">
          <h1>{recipe.name}</h1>
          <img src={recipe.imageUrl} alt={recipe.name} />
        </div>
        <p id="author">From the kitchen of {recipe.owner?.name || 'Unknown'}...</p>
        {recipe.description ? <p>{recipe.description}</p> : null}
        {recipe.servings ? <p>Servings: {recipe.servings}</p> : null}
        {recipe.sourceUrl ? (
          <p>
            Original Source:{' '}
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              {recipe.sourceUrl}
            </a>
          </p>
        ) : null}
        <div className="time">
          <h2 id="prep-time">Prep Time: {recipe.prepTime}</h2>
          <hr />
          <h2 id="total-time">Total Time: {recipe.totalTime}</h2>
          <hr />
          <h2 id="cook-time">Cook Time: {recipe.cookTime}</h2>
        </div>
        <hr />
        <div className="recipe-content">
          <div className="ingredients">
            <h2>Ingredients: </h2>
            <ul className="ingredients-list">
              {(recipe.ingredients || []).map((ingredient, index) => (
                <li key={`${ingredient}-${index}`}>{ingredient}</li>
              ))}
            </ul>
          </div>
          <div className="preparation">
            <h2>Preparation:</h2>
            <ol>
              {(recipe.preparation || []).map((step, index) => (
                <li key={`${step}-${index}`}>
                  <strong>Step {index + 1}:</strong>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {isRecipeOwner ? (
        <div className="change-btns">
          <Link to={`/recipes/${recipe._id}/edit`}>
            <button className="btn" type="button">
              Edit this Recipe 🧑‍🍳🚧
            </button>
          </Link>
          <button className="btn" type="button" onClick={handleDeleteRecipe}>
            Delete this recipe 💀
          </button>
        </div>
      ) : null}

      <section className="reviews">
        <hr />
        <h2>Recommended Reviews</h2>
        {averageRating ? (
          <span className="average-rating">
            <p>Average Rating: {averageRating}</p>
          </span>
        ) : (
          <p id="leave-review">No reviews yet. Be the first to leave a review!</p>
        )}
        {user ? (
          <form id="add-review-form" onSubmit={handleReviewSubmit}>
            <div className="star-rating">
              <label htmlFor="rating">Your Rating:</label>
              <fieldset id="rating">
                <input
                  type="radio"
                  id="star5"
                  name="rating"
                  value="5"
                  checked={newReview.rating === 5}
                  onChange={() => setNewReview((current) => ({ ...current, rating: 5 }))}
                />
                <label htmlFor="star5">★</label>
                <input
                  type="radio"
                  id="star4"
                  name="rating"
                  value="4"
                  checked={newReview.rating === 4}
                  onChange={() => setNewReview((current) => ({ ...current, rating: 4 }))}
                />
                <label htmlFor="star4">★</label>
                <input
                  type="radio"
                  id="star3"
                  name="rating"
                  value="3"
                  checked={newReview.rating === 3}
                  onChange={() => setNewReview((current) => ({ ...current, rating: 3 }))}
                />
                <label htmlFor="star3">★</label>
                <input
                  type="radio"
                  id="star2"
                  name="rating"
                  value="2"
                  checked={newReview.rating === 2}
                  onChange={() => setNewReview((current) => ({ ...current, rating: 2 }))}
                />
                <label htmlFor="star2">★</label>
                <input
                  type="radio"
                  id="star1"
                  name="rating"
                  value="1"
                  checked={newReview.rating === 1}
                  onChange={() => setNewReview((current) => ({ ...current, rating: 1 }))}
                />
                <label htmlFor="star1">★</label>
              </fieldset>
            </div>
            <textarea
              name="content"
              id="content-textarea"
              placeholder="Tell us what you thought!"
              value={newReview.content}
              onChange={(event) =>
                setNewReview((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
            />
            <br />
            <button type="submit" className="submit-review-btn">
              Submit Review
            </button>
          </form>
        ) : (
          <p>Please log in to leave a review.</p>
        )}
        {recipe.reviews?.length ? (
          <div className="review-cards">
            {recipe.reviews.map((review) => {
              const reviewAuthorId =
                typeof review.author === 'string'
                  ? review.author
                  : review.author?._id
              const isReviewOwner =
                Boolean(userProfileId) && reviewAuthorId === userProfileId

              return (
                <div key={review._id} className="review-card">
                  <header>
                    <h4>{review.content}</h4>
                    <p>{review.author?.name || 'Anonymous'}</p>
                  </header>
                  <div className="review-rating">Rating: {review.rating}</div>
                  <p className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                  {isReviewOwner ? (
                    <footer className="review-actions">
                      <Link to={`/recipes/${recipe._id}/reviews/${review._id}/edit`}>
                        <button className="edit-btn" type="button">
                          📝 Edit
                        </button>
                      </Link>
                      <button
                        className="delete-btn"
                        type="button"
                        onClick={() => handleDeleteReview(review._id)}
                      >
                        ️️🗑️ Delete
                      </button>
                    </footer>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </section>
    </>
  )
}

export {
  RecipeShowPage,
}
