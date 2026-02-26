import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

const initialForm = {
  name: '',
  imageUrl: '',
  totalTime: '',
  prepTime: '',
  cookTime: '',
  ingredients: '',
}

function RecipeFormPage({ mode, user, sessionLoading }) {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const isEditMode = mode === 'edit'

  usePageStylesheets([
    isEditMode ? '/stylesheets/recipes/edit.css' : '/stylesheets/recipes/new.css',
  ])

  const [form, setForm] = useState(initialForm)
  const [preparationSteps, setPreparationSteps] = useState([''])
  const [loading, setLoading] = useState(isEditMode)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRecipe() {
      if (!isEditMode) {
        return
      }

      try {
        const data = await api.getRecipe(recipeId)
        if (!cancelled) {
          setForm({
            name: data.recipe.name || '',
            imageUrl: data.recipe.imageUrl || '',
            totalTime: data.recipe.totalTime ?? '',
            prepTime: data.recipe.prepTime ?? '',
            cookTime: data.recipe.cookTime ?? '',
            ingredients: (data.recipe.ingredients || []).join(', '),
          })
          setPreparationSteps(
            data.recipe.preparation?.length ? data.recipe.preparation : ['']
          )
        }
      } catch (err) {
        console.log(err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRecipe()

    return () => {
      cancelled = true
    }
  }, [isEditMode, recipeId])

  const cleanedPreparation = useMemo(
    () => preparationSteps.map((step) => step.trim()).filter(Boolean),
    [preparationSteps]
  )

  if (sessionLoading && !user) {
    return (
      <main>
        <h1>Loading...</h1>
      </main>
    )
  }

  if (!sessionLoading && !user) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <main>
        <h1>Loading recipe...</h1>
      </main>
    )
  }

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handlePreparationChange(index, value) {
    setPreparationSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? value : step))
    )
  }

  function addPreparationStep() {
    setPreparationSteps((current) => [...current, ''])
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      name: form.name,
      imageUrl: form.imageUrl,
      totalTime: Number(form.totalTime) || 0,
      prepTime: Number(form.prepTime) || 0,
      cookTime: Number(form.cookTime) || 0,
      ingredients: form.ingredients,
      preparation: cleanedPreparation,
    }

    try {
      const data = isEditMode
        ? await api.updateRecipe(recipeId, payload)
        : await api.createRecipe(payload)

      navigate(`/recipes/${data.recipe._id}`)
    } catch (err) {
      console.log(err)
    }
  }

  async function handleImportRecipe(event) {
    event.preventDefault()
    setImportError('')

    if (!importUrl.trim()) {
      setImportError('Please paste a recipe URL first.')
      return
    }

    setImporting(true)

    try {
      const data = await api.importRecipe(importUrl.trim())
      navigate(`/recipes/${data.recipe._id}`)
    } catch (err) {
      console.log(err)
      setImportError(err.message || 'Unable to import recipe from URL.')
    } finally {
      setImporting(false)
    }
  }

  const recipeForm = (
    <form id={isEditMode ? 'edit-form' : 'new-form'} onSubmit={handleSubmit}>
      <label htmlFor="name-input">Name:</label>
      <input
        type="text"
        name="name"
        id="name-input"
        autoComplete="off"
        value={form.name}
        onChange={(event) => setField('name', event.target.value)}
      />

      <label htmlFor="image-input">Picture URL:</label>
      <input
        type="text"
        name="imageUrl"
        id="image-input"
        placeholder="https://example.com"
        value={form.imageUrl}
        onChange={(event) => setField('imageUrl', event.target.value)}
      />

      <label htmlFor="total-time-input">Total Time:</label>
      <input
        type="number"
        name="totalTime"
        id="total-time-input"
        value={form.totalTime}
        onChange={(event) => setField('totalTime', event.target.value)}
      />

      <label htmlFor="prep-time-input">Prep Time:</label>
      <input
        type="number"
        name="prepTime"
        id="prep-time-input"
        value={form.prepTime}
        onChange={(event) => setField('prepTime', event.target.value)}
      />

      <label htmlFor="cook-time-input">Cook Time:</label>
      <input
        type="number"
        name="cookTime"
        id="cook-time-input"
        value={form.cookTime}
        onChange={(event) => setField('cookTime', event.target.value)}
      />

      <label htmlFor="ingredients-input">
        Ingredients (separate ingredients with commas):
      </label>
      <input
        type="text"
        name="ingredients"
        id="ingredients-input"
        value={form.ingredients}
        onChange={(event) => setField('ingredients', event.target.value)}
      />

      <div id="dynamic-form">
        <span>Preparation:</span>
        <ol id="preparation-list" name="preparation[]">
          {preparationSteps.map((step, index) => (
            <li key={`step-${index}`}>
              <input
                type="text"
                name="preparation[]"
                placeholder={`Step ${index + 1}`}
                value={step}
                onChange={(event) =>
                  handlePreparationChange(index, event.target.value)
                }
              />
            </li>
          ))}
        </ol>
        <button type="button" id="add-step-button" onClick={addPreparationStep}>
          Add Next Step
        </button>
        <button
          type="submit"
          id={isEditMode ? 'save-changes-button' : 'create-recipe-button'}
        >
          {isEditMode ? 'Save Changes' : 'Create Recipe'}
        </button>
      </div>
    </form>
  )

  return (
    <main>
      <h1>{isEditMode ? 'Edit Recipe' : 'Create a New Recipe'}</h1>
      {!isEditMode ? (
        <section className="import-recipe-card">
          <h2>Import Recipe From URL</h2>
          <p>Paste a recipe link and Tasty Trove will auto-create the full recipe.</p>
          <form className="import-recipe-form" onSubmit={handleImportRecipe}>
            <input
              type="url"
              id="import-url-input"
              placeholder="https://example.com/recipe-page"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              required
            />
            <button type="submit" id="import-recipe-button" disabled={importing}>
              {importing ? 'Importing...' : 'Import Recipe URL'}
            </button>
          </form>
          {importError ? <p className="import-error">{importError}</p> : null}
        </section>
      ) : null}
      {isEditMode ? <section>{recipeForm}</section> : recipeForm}
    </main>
  )
}

export {
  RecipeFormPage,
}
