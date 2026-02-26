import { Router } from 'express'
import { Recipe } from '../models/recipe.js'

const router = Router()

function getRandomRecipes(recipes, count) {
  return [...recipes].sort(() => Math.random() - 0.5).slice(0, count)
}

function hashString(value) {
  let hash = 0
  const normalized = String(value || '')
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0
  }

  return hash
}

function getFeaturedRecipeForDay(recipes, dayKey) {
  if (!recipes.length) {
    return null
  }

  const sortedRecipes = [...recipes].sort((left, right) =>
    String(left._id).localeCompare(String(right._id))
  )
  const index = hashString(dayKey) % sortedRecipes.length
  return sortedRecipes[index]
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.get('/home', async (req, res) => {
  try {
    const recipes = await Recipe.find({})
    const dayKey = new Date().toISOString().slice(0, 10)
    const featuredRecipe = getFeaturedRecipeForDay(recipes, dayKey)
    const remainingRecipes = featuredRecipe
      ? recipes.filter(
          (recipe) => String(recipe._id) !== String(featuredRecipe._id)
        )
      : recipes
    const randomRecipes = getRandomRecipes(remainingRecipes, 5)

    return res.json({ featuredRecipe, randomRecipes, featuredDate: dayKey })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to load home data' })
  }
})

export {
  router,
}
