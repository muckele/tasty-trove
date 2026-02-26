import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { api } from './services/api'
import { HomePage } from './pages/HomePage'
import { RecipesPage } from './pages/RecipesPage'
import { RecipeShowPage } from './pages/RecipeShowPage'
import { RecipeFormPage } from './pages/RecipeFormPage'
import { EditReviewPage } from './pages/EditReviewPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  const [user, setUser] = useState(null)
  const [googleClientID, setGoogleClientID] = useState('')
  const [sessionLoading, setSessionLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setSessionLoading(true)

    try {
      const data = await api.getSession()
      setUser(data.user)
      setGoogleClientID(data.googleClientID || '')
    } catch (err) {
      console.log(err)
      setUser(null)
      setGoogleClientID('')
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  return (
    <>
      <NavBar
        user={user}
        googleClientID={googleClientID}
        onSessionChange={refreshSession}
      />
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route
          path="/recipes/new"
          element={
            <RecipeFormPage
              mode="create"
              user={user}
              sessionLoading={sessionLoading}
            />
          }
        />
        <Route
          path="/recipes/:recipeId/edit"
          element={
            <RecipeFormPage
              mode="edit"
              user={user}
              sessionLoading={sessionLoading}
            />
          }
        />
        <Route
          path="/recipes/:recipeId/reviews/:reviewId/edit"
          element={<EditReviewPage user={user} sessionLoading={sessionLoading} />}
        />
        <Route path="/recipes/:recipeId" element={<RecipeShowPage user={user} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
