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
// POST /recipes/:recipeId/reviews
router.post('/:recipeId/reviews', isLoggedIn, recipesCtrl.createReview)
// GET /recipe/:recipeId
router.get('/:recipeId', recipesCtrl.show)
// GET /recipes/:recipeId/edit
router.get('/:recipeId/edit', isLoggedIn, recipesCtrl.edit)
// PUT /recipes/:recipeId
router.put('/:recipeId', isLoggedIn, recipesCtrl.update)
// DELETE /recipes/:recipeId
router.delete('/:recipeId', isLoggedIn, recipesCtrl.delete)



export {
  router
}