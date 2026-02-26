import crypto from 'node:crypto'
import { Recipe } from '../models/recipe.js'
import { scrapeRecipeFromUrl } from '../services/recipeImporter.js'
import { parseRecipeFromText } from '../services/recipeTextImporter.js'
import {
  classifyRecipeMetadata,
  normalizeMealCategory,
  normalizeCuisineType,
} from '../services/recipeClassification.js'
import {
  DIETARY_TAG_OPTIONS,
  ALLERGEN_TAG_OPTIONS,
  normalizeTagArray,
  inferRecipeTags,
} from '../services/recipeTagging.js'

const VERSION_LIMIT = 30

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

function normalizeVisibility(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) {
    return ''
  }

  return ['public', 'private'].includes(normalized) ? normalized : ''
}

function normalizeRecipeName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildVersionSnapshot(recipe) {
  return {
    name: recipe.name || '',
    description: recipe.description || '',
    sourceUrl: recipe.sourceUrl || '',
    servings: recipe.servings || '',
    imageUrl: recipe.imageUrl || '',
    totalTime: Number(recipe.totalTime) || 0,
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    mealCategory: normalizeMealCategory(recipe.mealCategory) || 'other',
    cuisineType: normalizeCuisineType(recipe.cuisineType) || 'other',
    dietaryTags: normalizeTagArray(recipe.dietaryTags, DIETARY_TAG_OPTIONS),
    allergenTags: normalizeTagArray(recipe.allergenTags, ALLERGEN_TAG_OPTIONS),
    visibility: normalizeVisibility(recipe.visibility) || 'public',
    shareToken: String(recipe.shareToken || ''),
    ingredients: normalizeStringArray(recipe.ingredients),
    preparation: normalizeStringArray(recipe.preparation, '\n'),
  }
}

function appendRecipeVersion(recipe) {
  if (!recipe) {
    return
  }

  const nextVersion = {
    snapshot: buildVersionSnapshot(recipe),
    createdAt: new Date(),
  }

  recipe.versions = Array.isArray(recipe.versions) ? recipe.versions : []
  recipe.versions.unshift(nextVersion)

  if (recipe.versions.length > VERSION_LIMIT) {
    recipe.versions = recipe.versions.slice(0, VERSION_LIMIT)
  }
}

function getOwnerIdFromRequest(req) {
  const profile = req.user?.profile
  if (!profile) {
    return ''
  }

  return String(typeof profile === 'string' ? profile : profile._id || '')
}

function isOwner(recipe, req) {
  const ownerId = getOwnerIdFromRequest(req)
  if (!ownerId || !recipe?.owner) {
    return false
  }

  const recipeOwnerId = String(recipe.owner?._id || recipe.owner)
  return recipeOwnerId === ownerId || recipe.owner.equals?.(ownerId)
}

function canViewRecipe(recipe, req) {
  if (!recipe) {
    return false
  }

  if (recipe.visibility !== 'private') {
    return true
  }

  if (isOwner(recipe, req)) {
    return true
  }

  const shareToken = String(req.query.shareToken || '').trim()
  return Boolean(shareToken && recipe.shareToken && shareToken === recipe.shareToken)
}

function makeShareToken() {
  return crypto.randomBytes(16).toString('hex')
}

function getShareUrl(req, recipeId, shareToken) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0]
  const protocol = forwardedProto || req.protocol || 'http'
  const host = req.get('host')
  return `${protocol}://${host}/recipes/${recipeId}?shareToken=${shareToken}`
}

function sanitizeRecipeForResponse(recipeDoc, req) {
  const recipe = recipeDoc.toObject()
  const owner = isOwner(recipeDoc, req)

  if (owner) {
    const ownerId = getOwnerIdFromRequest(req)
    const ownerNoteEntry = (recipe.ownerNotes || []).find(
      (note) => String(note.author) === ownerId
    )

    recipe.ownerNote = ownerNoteEntry?.content || ''
    recipe.shareUrl = recipe.shareToken
      ? getShareUrl(req, recipe._id, recipe.shareToken)
      : ''
  } else {
    recipe.ownerNote = ''
    recipe.ownerNotes = []
    recipe.versions = []
  }

  return recipe
}

async function findDuplicateRecipe({ ownerId, name, sourceUrl, ignoreRecipeId = '' }) {
  if (!ownerId) {
    return null
  }

  const duplicateChecks = []
  const trimmedSourceUrl = String(sourceUrl || '').trim()
  const trimmedName = normalizeRecipeName(name)

  if (trimmedSourceUrl) {
    duplicateChecks.push({
      owner: ownerId,
      sourceUrl: trimmedSourceUrl,
    })
  }

  if (trimmedName) {
    duplicateChecks.push({
      owner: ownerId,
      name: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i'),
    })
  }

  if (!duplicateChecks.length) {
    return null
  }

  const query = {
    $or: duplicateChecks,
  }

  if (ignoreRecipeId) {
    query._id = { $ne: ignoreRecipeId }
  }

  return Recipe.findOne(query).sort({ createdAt: -1 })
}

function recipePayload(body, existingRecipe = null) {
  const payload = {
    name: normalizeRecipeName(body.name),
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
    payload.sourceUrl =
      typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
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

  if (body.visibility !== undefined) {
    payload.visibility = normalizeVisibility(body.visibility)
  }

  if (body.ingredients !== undefined) {
    payload.ingredients = normalizeStringArray(body.ingredients)
  }

  if (body.preparation !== undefined) {
    payload.preparation = normalizeStringArray(body.preparation, '\n')
  }

  if (body.dietaryTags !== undefined) {
    payload.dietaryTags = normalizeTagArray(body.dietaryTags, DIETARY_TAG_OPTIONS)
  }

  if (body.allergenTags !== undefined) {
    payload.allergenTags = normalizeTagArray(body.allergenTags, ALLERGEN_TAG_OPTIONS)
  }

  const currentValues = {
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

  const inferredClassification = classifyRecipeMetadata(currentValues)
  const inferredTags = inferRecipeTags(currentValues.ingredients)

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

  if (!Array.isArray(payload.dietaryTags)) {
    payload.dietaryTags =
      normalizeTagArray(existingRecipe?.dietaryTags, DIETARY_TAG_OPTIONS) ||
      []
    if (!payload.dietaryTags.length) {
      payload.dietaryTags = inferredTags.dietaryTags
    }
  }

  if (!Array.isArray(payload.allergenTags)) {
    payload.allergenTags =
      normalizeTagArray(existingRecipe?.allergenTags, ALLERGEN_TAG_OPTIONS) ||
      []
    if (!payload.allergenTags.length) {
      payload.allergenTags = inferredTags.allergenTags
    }
  }

  if (!payload.visibility) {
    payload.visibility = normalizeVisibility(existingRecipe?.visibility) || 'public'
  }

  if (payload.visibility === 'private') {
    payload.shareToken = String(existingRecipe?.shareToken || body.shareToken || '').trim()
    if (!payload.shareToken) {
      payload.shareToken = makeShareToken()
    }
  }

  return payload
}

function buildBaseVisibilityFilter(req) {
  const ownerId = getOwnerIdFromRequest(req)
  if (!ownerId) {
    return { visibility: 'public' }
  }

  return {
    $or: [{ visibility: 'public' }, { owner: ownerId }],
  }
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
    const dietaryTag = normalizeTagArray(req.query.dietaryTag, DIETARY_TAG_OPTIONS)[0]
    const allergenTag = normalizeTagArray(req.query.allergenTag, ALLERGEN_TAG_OPTIONS)[0]

    const filter = {
      ...buildBaseVisibilityFilter(req),
    }

    if (nameQuery) {
      const escapedQuery = escapeRegExp(nameQuery)
      const searchRegex = new RegExp(escapedQuery, 'i')
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { ingredients: searchRegex },
        ],
      })
    }

    if (mealCategory) {
      filter.mealCategory = mealCategory
    }

    if (cuisineType) {
      filter.cuisineType = cuisineType
    }

    if (dietaryTag) {
      filter.dietaryTags = dietaryTag
    }

    if (allergenTag) {
      filter.allergenTags = allergenTag
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
    const recipes = await Recipe.find(buildBaseVisibilityFilter(req))
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

    const duplicateRecipe = await findDuplicateRecipe({
      ownerId: payload.owner,
      name: payload.name,
      sourceUrl: payload.sourceUrl,
    })

    if (duplicateRecipe && !req.body.allowDuplicate) {
      return res.status(409).json({
        error: 'Duplicate recipe detected. Open the existing one or confirm create anyway.',
        duplicateRecipeId: duplicateRecipe._id,
      })
    }

    const recipe = await Recipe.create(payload)
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.status(201).json({ recipe: sanitizeRecipeForResponse(hydratedRecipe, req) })
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

    const duplicateRecipe = await findDuplicateRecipe({
      ownerId: payload.owner,
      name: payload.name,
      sourceUrl: payload.sourceUrl,
    })

    if (duplicateRecipe && !req.body.allowDuplicate) {
      return res.status(409).json({
        error: 'Duplicate recipe detected from this source URL or recipe title.',
        duplicateRecipeId: duplicateRecipe._id,
      })
    }

    const recipe = await Recipe.create(payload)
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)

    return res
      .status(201)
      .json({ recipe: sanitizeRecipeForResponse(hydratedRecipe, req) })
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

    const duplicateRecipe = await findDuplicateRecipe({
      ownerId: payload.owner,
      name: payload.name,
      sourceUrl: payload.sourceUrl,
    })

    if (duplicateRecipe && !req.body.allowDuplicate) {
      return res.status(409).json({
        error: 'Duplicate recipe detected from existing imported text or title.',
        duplicateRecipeId: duplicateRecipe._id,
      })
    }

    const recipe = await Recipe.create(payload)
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)

    return res
      .status(201)
      .json({ recipe: sanitizeRecipeForResponse(hydratedRecipe, req) })
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

    if (!canViewRecipe(recipe, req)) {
      return res.status(403).json({ error: 'This recipe is private.' })
    }

    return res.json({ recipe: sanitizeRecipeForResponse(recipe, req) })
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

    if (!isOwner(recipe, req)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const payload = recipePayload(req.body, recipe)

    const duplicateRecipe = await findDuplicateRecipe({
      ownerId: recipe.owner,
      name: payload.name || recipe.name,
      sourceUrl: payload.sourceUrl || recipe.sourceUrl,
      ignoreRecipeId: recipe._id,
    })

    if (duplicateRecipe && !req.body.allowDuplicate) {
      return res.status(409).json({
        error: 'Duplicate recipe detected. Update canceled.',
        duplicateRecipeId: duplicateRecipe._id,
      })
    }

    appendRecipeVersion(recipe)
    recipe.set(payload)
    await recipe.save()

    const updatedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.json({ recipe: sanitizeRecipeForResponse(updatedRecipe, req) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to update recipe' })
  }
}

async function regenerateShareToken(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!isOwner(recipe, req)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    recipe.shareToken = makeShareToken()
    if (recipe.visibility !== 'private') {
      recipe.visibility = 'private'
    }

    await recipe.save()
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.json({
      recipe: sanitizeRecipeForResponse(hydratedRecipe, req),
      shareUrl: getShareUrl(req, recipe._id, recipe.shareToken),
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to create share link' })
  }
}

async function sharedByToken(req, res) {
  try {
    const token = String(req.params.shareToken || '').trim()
    if (!token) {
      return res.status(400).json({ error: 'Share token is required' })
    }

    const recipe = await Recipe.findOne({ shareToken: token }).populate([
      { path: 'owner', select: 'name avatar' },
      { path: 'reviews.author', select: 'name avatar' },
    ])

    if (!recipe) {
      return res.status(404).json({ error: 'Shared recipe not found' })
    }

    return res.json({ recipe: sanitizeRecipeForResponse(recipe, req) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to fetch shared recipe' })
  }
}

async function updateOwnerNote(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!isOwner(recipe, req)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const ownerId = getOwnerIdFromRequest(req)
    const nextContent = String(req.body.content || '').trim()
    recipe.ownerNotes = Array.isArray(recipe.ownerNotes) ? recipe.ownerNotes : []

    const existingNote = recipe.ownerNotes.find(
      (note) => String(note.author) === ownerId
    )

    if (nextContent) {
      if (existingNote) {
        existingNote.content = nextContent
        existingNote.updatedAt = new Date()
      } else {
        recipe.ownerNotes.push({
          author: ownerId,
          content: nextContent,
          updatedAt: new Date(),
        })
      }
    } else {
      recipe.ownerNotes = recipe.ownerNotes.filter(
        (note) => String(note.author) !== ownerId
      )
    }

    await recipe.save()
    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)
    const sanitized = sanitizeRecipeForResponse(hydratedRecipe, req)
    return res.json({
      recipe: sanitized,
      ownerNote: sanitized.ownerNote || '',
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to save note' })
  }
}

async function listVersions(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!isOwner(recipe, req)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    return res.json({ versions: recipe.versions || [] })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to fetch versions' })
  }
}

async function restoreVersion(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!isOwner(recipe, req)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const versionEntry = recipe.versions.id(req.params.versionId)
    if (!versionEntry) {
      return res.status(404).json({ error: 'Version not found' })
    }

    appendRecipeVersion(recipe)
    recipe.set(versionEntry.snapshot || {})
    await recipe.save()

    const hydratedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.json({ recipe: sanitizeRecipeForResponse(hydratedRecipe, req) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to restore version' })
  }
}

async function deleteRecipe(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!isOwner(recipe, req)) {
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

    if (!canViewRecipe(recipe, req)) {
      return res.status(403).json({ error: 'This recipe is private.' })
    }

    recipe.reviews.push({
      author: req.user.profile._id,
      content: typeof req.body.content === 'string' ? req.body.content.trim() : '',
      rating: Number(req.body.rating) || 1,
    })
    await recipe.save()

    const updatedRecipe = await loadRecipeWithRelations(recipe._id)
    return res.status(201).json({ recipe: sanitizeRecipeForResponse(updatedRecipe, req) })
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
    return res.json({ recipe: sanitizeRecipeForResponse(updatedRecipe, req) })
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
  sharedByToken,
  update,
  regenerateShareToken,
  updateOwnerNote,
  listVersions,
  restoreVersion,
  deleteRecipe as delete,
  createReview,
  updateReview,
  deleteReview,
}
