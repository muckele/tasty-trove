import { Library } from '../models/library.js'
import { Recipe } from '../models/recipe.js'

function getOwnerId(req) {
  return String(req.user?.profile?._id || req.user?.profile || '')
}

async function ensureLibrary(ownerId) {
  let library = await Library.findOne({ owner: ownerId })
  if (!library) {
    library = await Library.create({
      owner: ownerId,
      favoriteRecipeIds: [],
      collections: [],
    })
  }

  return library
}

function recipeIsVisibleToOwner(recipe, ownerId) {
  if (!recipe) {
    return false
  }

  if (recipe.visibility !== 'private') {
    return true
  }

  return String(recipe.owner?._id || recipe.owner) === ownerId
}

async function hydrateLibrary(ownerId) {
  const library = await ensureLibrary(ownerId)
  await library.populate([
    {
      path: 'favoriteRecipeIds',
      select:
        'name imageUrl mealCategory cuisineType totalTime owner visibility dietaryTags allergenTags',
    },
    {
      path: 'collections.recipeIds',
      select:
        'name imageUrl mealCategory cuisineType totalTime owner visibility dietaryTags allergenTags',
    },
  ])

  const hydrated = library.toObject()
  hydrated.favoriteRecipes = (hydrated.favoriteRecipeIds || []).filter((recipe) =>
    recipeIsVisibleToOwner(recipe, ownerId)
  )

  hydrated.collections = (hydrated.collections || []).map((collection) => ({
    ...collection,
    recipes: (collection.recipeIds || []).filter((recipe) =>
      recipeIsVisibleToOwner(recipe, ownerId)
    ),
  }))

  delete hydrated.favoriteRecipeIds
  return hydrated
}

async function index(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const library = await hydrateLibrary(ownerId)
    return res.json({ library })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to load library' })
  }
}

async function addFavorite(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const recipeId = String(req.params.recipeId || '').trim()

    const recipe = await Recipe.findById(recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!recipeIsVisibleToOwner(recipe, ownerId)) {
      return res.status(403).json({ error: 'Recipe is not available in your library' })
    }

    const library = await ensureLibrary(ownerId)
    if (!library.favoriteRecipeIds.some((id) => String(id) === recipeId)) {
      library.favoriteRecipeIds.push(recipeId)
      await library.save()
    }

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to add favorite' })
  }
}

async function removeFavorite(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const recipeId = String(req.params.recipeId || '').trim()

    const library = await ensureLibrary(ownerId)
    library.favoriteRecipeIds = library.favoriteRecipeIds.filter(
      (id) => String(id) !== recipeId
    )
    await library.save()

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to remove favorite' })
  }
}

async function createCollection(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const name = String(req.body.name || '').trim()
    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' })
    }

    const library = await ensureLibrary(ownerId)
    library.collections.push({
      name,
      recipeIds: [],
    })
    await library.save()

    return res.status(201).json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to create collection' })
  }
}

async function renameCollection(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const name = String(req.body.name || '').trim()
    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' })
    }

    const library = await ensureLibrary(ownerId)
    const collection = library.collections.id(req.params.collectionId)
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' })
    }

    collection.name = name
    await library.save()

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to rename collection' })
  }
}

async function deleteCollection(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const library = await ensureLibrary(ownerId)
    const collection = library.collections.id(req.params.collectionId)
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' })
    }

    library.collections.pull(collection._id)
    await library.save()

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to delete collection' })
  }
}

async function addRecipeToCollection(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const recipeId = String(req.params.recipeId || '').trim()
    const recipe = await Recipe.findById(recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!recipeIsVisibleToOwner(recipe, ownerId)) {
      return res.status(403).json({ error: 'Recipe is not available in your library' })
    }

    const library = await ensureLibrary(ownerId)
    const collection = library.collections.id(req.params.collectionId)
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' })
    }

    if (!collection.recipeIds.some((id) => String(id) === recipeId)) {
      collection.recipeIds.push(recipeId)
      await library.save()
    }

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to add recipe to collection' })
  }
}

async function removeRecipeFromCollection(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const recipeId = String(req.params.recipeId || '').trim()
    const library = await ensureLibrary(ownerId)
    const collection = library.collections.id(req.params.collectionId)
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' })
    }

    collection.recipeIds = collection.recipeIds.filter(
      (id) => String(id) !== recipeId
    )
    await library.save()

    return res.json({ library: await hydrateLibrary(ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to remove recipe from collection' })
  }
}

export {
  index,
  addFavorite,
  removeFavorite,
  createCollection,
  renameCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
}
