import { Router } from 'express'
import * as recipesCtrl from '../controllers/recipes.js'
import { isLoggedIn } from '../middleware/middleware.js'

const router = Router()

// GET localhost:3000/recipes
router.get('/', recipesCtrl.index)
// GET /recipes/new
router.get('/new', recipesCtrl.new)
// POST /recipes
router.post('/', isLoggedIn, recipesCtrl.create)
// GET /taco/:tacoId
router.get('/:recipeId', recipesCtrl.show)
// GET /recipes/:recipeId/edit



export {
  router
}