import { Router } from 'express'
import { Recipe } from '../models/recipe.js'

const router = Router()

function getRandomRecipes(recipes, count) {
  return [...recipes].sort(() => Math.random() - 0.5).slice(0, count)
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.get('/home', async (req, res) => {
  try {
    const recipes = await Recipe.find({})
    const randomRecipes = getRandomRecipes(recipes, 5)
    return res.json({ randomRecipes })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to load home data' })
  }
})

export {
  router,
}
