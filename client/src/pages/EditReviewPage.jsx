import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

function EditReviewPage({ user, sessionLoading }) {
  usePageStylesheets(['/stylesheets/recipes/show.css'])

  const { recipeId, reviewId } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadReview() {
      try {
        const data = await api.getRecipe(recipeId)
        const review = data.recipe.reviews?.find((item) => item._id === reviewId)
        if (!cancelled && review) {
          setContent(review.content || '')
          setRating(Number(review.rating) || 1)
        }
      } catch (err) {
        console.log(err)
      }
    }

    loadReview()

    return () => {
      cancelled = true
    }
  }, [recipeId, reviewId])

  if (sessionLoading && !user) {
    return (
      <main className="recipe-show-page review-edit-page-shell">
        <section className="recipe-shell review-edit-page">
          <h1>Loading...</h1>
        </section>
      </main>
    )
  }

  if (!sessionLoading && !user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      await api.updateReview(recipeId, reviewId, { content, rating })
      navigate(`/recipes/${recipeId}`)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <main className="recipe-show-page review-edit-page-shell">
      <section className="recipe-shell review-edit-page">
        <h1>Edit your review!</h1>
        <form className="review-edit-form" onSubmit={handleSubmit}>
          <label htmlFor="content-textarea">Review:</label>
          <textarea
            name="content"
            id="content-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <label htmlFor="rating-select">Rating:</label>
          <select
            name="rating"
            id="rating-select"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <button className="submit-review-btn" type="submit">Update Review</button>
        </form>
      </section>
    </main>
  )
}

export {
  EditReviewPage,
}
