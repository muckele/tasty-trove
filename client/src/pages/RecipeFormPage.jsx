import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

const initialForm = {
  name: '',
  imageUrl: '',
  servings: '',
  mealCategory: '',
  cuisineType: '',
  totalTime: '',
  prepTime: '',
  cookTime: '',
  ingredients: '',
}

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
  const [importText, setImportText] = useState('')
  const [importingText, setImportingText] = useState(false)
  const [importTextError, setImportTextError] = useState('')
  const [importTextPreviewReady, setImportTextPreviewReady] = useState(false)

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
            servings: data.recipe.servings || '',
            mealCategory: data.recipe.mealCategory || '',
            cuisineType: data.recipe.cuisineType || '',
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
      <main className="recipe-editor-page">
        <h1>Loading...</h1>
      </main>
    )
  }

  if (!sessionLoading && !user) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <main className="recipe-editor-page">
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
      servings: form.servings,
      mealCategory: form.mealCategory,
      cuisineType: form.cuisineType,
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

  async function handleImportRecipeText(event) {
    event.preventDefault()
    setImportTextError('')
    setImportTextPreviewReady(false)

    if (!importText.trim()) {
      setImportTextError('Please paste recipe text first.')
      return
    }

    setImportingText(true)

    try {
      const data = await api.parseRecipeFromText(importText.trim())
      const parsedRecipe = data.recipe || {}

      setForm((current) => ({
        ...current,
        name: parsedRecipe.name || '',
        imageUrl: parsedRecipe.imageUrl || '',
        servings: parsedRecipe.servings || '',
        mealCategory: parsedRecipe.mealCategory || '',
        cuisineType: parsedRecipe.cuisineType || '',
        totalTime: parsedRecipe.totalTime ?? '',
        prepTime: parsedRecipe.prepTime ?? '',
        cookTime: parsedRecipe.cookTime ?? '',
        ingredients: Array.isArray(parsedRecipe.ingredients)
          ? parsedRecipe.ingredients.join(', ')
          : parsedRecipe.ingredients || '',
      }))

      setPreparationSteps(
        Array.isArray(parsedRecipe.preparation) && parsedRecipe.preparation.length
          ? parsedRecipe.preparation
          : ['']
      )

      setImportTextPreviewReady(true)
    } catch (err) {
      console.log(err)
      setImportTextError(err.message || 'Unable to import recipe text.')
    } finally {
      setImportingText(false)
    }
  }

  const recipeForm = (
    <form
      id={isEditMode ? 'edit-form' : 'new-form'}
      className="recipe-editor-form"
      onSubmit={handleSubmit}
    >
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

      <label htmlFor="servings-input">Servings:</label>
      <input
        type="text"
        name="servings"
        id="servings-input"
        placeholder="e.g. 4"
        value={form.servings}
        onChange={(event) => setField('servings', event.target.value)}
      />

      <label htmlFor="meal-category-input">Meal Category:</label>
      <select
        name="mealCategory"
        id="meal-category-input"
        value={form.mealCategory}
        onChange={(event) => setField('mealCategory', event.target.value)}
      >
        <option value="">Auto-detect</option>
        {MEAL_CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label htmlFor="cuisine-type-input">Cuisine Type:</label>
      <select
        name="cuisineType"
        id="cuisine-type-input"
        value={form.cuisineType}
        onChange={(event) => setField('cuisineType', event.target.value)}
      >
        <option value="">Auto-detect</option>
        {CUISINE_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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
    <main className={`recipe-editor-page ${isEditMode ? 'recipe-editor-page--edit' : ''}`}>
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
      {!isEditMode ? (
        <section className="import-recipe-card">
          <h2>Import Recipe From Text</h2>
          <p>
            Paste a full recipe from ChatGPT or another source, and Tasty Trove will
            structure it into a recipe card.
          </p>
          <form className="import-recipe-form import-text-form" onSubmit={handleImportRecipeText}>
            <textarea
              id="import-text-input"
              placeholder={`Example:\nClassic Pancakes\nServings: 4\nPrep Time: 10 minutes\nCook Time: 15 minutes\n\nIngredients:\n- 1 cup flour\n- 2 tbsp sugar\n\nInstructions:\n1. Mix ingredients.\n2. Cook on skillet.`}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              required
            />
            <button type="submit" id="import-recipe-button" disabled={importingText}>
              {importingText ? 'Generating Preview...' : 'Generate Preview'}
            </button>
          </form>
          {importTextError ? <p className="import-error">{importTextError}</p> : null}
          {importTextPreviewReady ? (
            <p className="import-success">
              Preview loaded. Review/edit the fields below, then click Create Recipe.
            </p>
          ) : null}
        </section>
      ) : null}
      {isEditMode ? <section>{recipeForm}</section> : recipeForm}
    </main>
  )
}

export {
  RecipeFormPage,
}
