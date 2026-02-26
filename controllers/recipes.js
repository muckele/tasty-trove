import { Recipe } from '../models/recipe.js'
import { scrapeRecipeFromUrl } from '../services/recipeImporter.js'
import { parseRecipeFromText } from '../services/recipeTextImporter.js'
import {
  classifyRecipeMetadata,
  normalizeMealCategory,
  normalizeCuisineType,
} from '../services/recipeClassification.js'

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeStringArray(value, delimiter = ',') {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

function recipePayload(body, existingRecipe = null) {
  const payload = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '',
    totalTime: Number(body.totalTime) || 0,
    prepTime: Number(body.prepTime) || 0,
    cookTime: Number(body.cookTime) || 0,
  }

  if (body.description !== undefined) {
    payload.description =
      typeof body.description === 'string' ? body.description.trim() : ''
  }

  if (body.sourceUrl !== undefined) {
    payload.sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  }

  if (body.servings !== undefined) {
    payload.servings = typeof body.servings === 'string' ? body.servings.trim() : ''
  }

  if (body.mealCategory !== undefined) {
    payload.mealCategory = normalizeMealCategory(body.mealCategory)
  }

  if (body.cuisineType !== undefined) {
    payload.cuisineType = normalizeCuisineType(body.cuisineType)
  }

  if (body.ingredients !== undefined) {
    payload.ingredients = normalizeStringArray(body.ingredients)
  }

  if (body.preparation !== undefined) {
    payload.preparation = normalizeStringArray(body.preparation, '\n')
  }

  const classificationInput = {
    name: payload.name || existingRecipe?.name || '',
    description:
      payload.description !== undefined
        ? payload.description
        : existingRecipe?.description || '',
    sourceUrl:
      payload.sourceUrl !== undefined
        ? payload.sourceUrl
        : existingRecipe?.sourceUrl || '',
    ingredients:
      payload.ingredients !== undefined
        ? payload.ingredients
        : existingRecipe?.ingredients || [],
    preparation:
      payload.preparation !== undefined
        ? payload.preparation
        : existingRecipe?.preparation || [],
  }

  const inferredClassification = classifyRecipeMetadata(classificationInput)

  if (!payload.mealCategory) {
    payload.mealCategory =
      normalizeMealCategory(existingRecipe?.mealCategory) ||
      inferredClassification.mealCategory
  }

  if (!payload.cuisineType) {
    payload.cuisineType =
      normalizeCuisineType(existingRecipe?.cuisineType) ||
      inferredClassification.cuisineType
  }

  return payload
}

async function loadRecipeWithRelations(recipeId) {
  return Recipe.findById(recipeId).populate([
    { path: 'owner', select: 'name avatar' },
    { path: 'reviews.author', select: 'name avatar' },
  ])
}

async function index(req, res) {
  try {
    const nameQuery = (req.query.query || '').trim()
    const mealCategory = normalizeMealCategory(req.query.mealCategory)
    const cuisineType = normalizeCuisineType(req.query.cuisineType)
    const filter = {}

    if (nameQuery) {
      const escapedQuery = escapeRegExp(nameQuery)
      const searchRegex = new RegExp(escapedQuery, 'i')
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { ingredients: searchRegex },
      ]
    }

    if (mealCategory) {
      filter.mealCategory = mealCategory
    }

    if (cuisineType) {
      filter.cuisineType = cuisineType
    }

    const recipes = await Recipe.find(filter).sort({ createdAt: -1 })
    return res.json({ recipes })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to fetch recipes' })
  }
}

async function random(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20)
    const recipes = await Recipe.find({})
    const randomRecipes = [...recipes]
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)

    return res.json({ recipes: randomRecipes })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to fetch random recipes' })
  }
}

async function create(req, res) {
  try {
    const payload = recipePayload(req.body)
    payload.owner = req.user.profile._id
    const recipe = await Recipe.create(payload)
    return res.status(201).json({ recipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to create recipe' })
  }
}

async function importRecipe(req, res) {
  try {
    const importedData = await scrapeRecipeFromUrl(req.body.url)
    const payload = recipePayload(importedData)
    payload.owner = req.user.profile._id

    const recipe = await Recipe.create(payload)
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)

    return res.status(201).json({ recipe: hydratedRecipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      error: err.message || 'Unable to import recipe from URL',
    })
  }
}

async function importRecipeFromText(req, res) {
  try {
    const importedData = parseRecipeFromText(req.body.text)
    const payload = recipePayload(importedData)
    payload.owner = req.user.profile._id

    const recipe = await Recipe.create(payload)
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)

    return res.status(201).json({ recipe: hydratedRecipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      error: err.message || 'Unable to import recipe from text',
    })
  }
}

function parseRecipeText(req, res) {
  try {
    const importedData = parseRecipeFromText(req.body.text)
    const payload = recipePayload(importedData)

    return res.json({ recipe: payload })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      error: err.message || 'Unable to parse recipe text',
    })
  }
}

async function show(req, res) {
  try {
    const recipe = await loadRecipeWithRelations(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    return res.json({ recipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to fetch recipe' })
  }
}

async function update(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!recipe.owner.equals(req.user.profile._id)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    recipe.set(recipePayload(req.body, recipe))
    await recipe.save()

    const updatedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.json({ recipe: updatedRecipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to update recipe' })
  }
}

async function deleteRecipe(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!recipe.owner.equals(req.user.profile._id)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await recipe.deleteOne()
    return res.status(204).end()
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to delete recipe' })
  }
}

async function createReview(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    recipe.reviews.push({
      author: req.user.profile._id,
      content: typeof req.body.content === 'string' ? req.body.content.trim() : '',
      rating: Number(req.body.rating) || 1,
    })
    await recipe.save()

    const updatedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.status(201).json({ recipe: updatedRecipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to create review' })
  }
}

async function updateReview(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    const review = recipe.reviews.id(req.params.reviewId)
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    if (!review.author.equals(req.user.profile._id)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    review.set({
      content: typeof req.body.content === 'string' ? req.body.content.trim() : '',
      rating: Number(req.body.rating) || 1,
    })

    await recipe.save()
    const updatedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.json({ recipe: updatedRecipe })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to update review' })
  }
}

async function deleteReview(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    const review = recipe.reviews.id(req.params.reviewId)
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    if (!review.author.equals(req.user.profile._id)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    recipe.reviews.pull(review._id)
    await recipe.save()
    return res.status(204).end()
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to delete review' })
  }
}

export {
  index,
  random,
  create,
  importRecipe,
  parseRecipeText,
  importRecipeFromText,
  show,
  update,
  deleteRecipe as delete,
  createReview,
  updateReview,
  deleteReview,
}
