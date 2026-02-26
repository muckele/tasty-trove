import { Router } from 'express'
import * as recipesCtrl from '../controllers/recipes.js'
import { isLoggedIn } from '../middleware/middleware.js'

const router = Router()

// GET /api/recipes
router.get('/', recipesCtrl.index)
// GET /api/recipes/random
router.get('/random', recipesCtrl.random)
// POST /api/recipes
router.post('/', isLoggedIn, recipesCtrl.create)
// POST /api/recipes/import
router.post('/import', isLoggedIn, recipesCtrl.importRecipe)
// GET /api/recipes/:recipeId
router.get('/:recipeId', recipesCtrl.show)
// PUT /api/recipes/:recipeId
router.put('/:recipeId', isLoggedIn, recipesCtrl.update)
// DELETE /api/recipes/:recipeId
router.delete('/:recipeId', isLoggedIn, recipesCtrl.delete)
// POST /api/recipes/:recipeId/reviews
router.post('/:recipeId/reviews', isLoggedIn, recipesCtrl.createReview)
// PUT /api/recipes/:recipeId/reviews/:reviewId
router.put('/:recipeId/reviews/:reviewId', isLoggedIn, recipesCtrl.updateReview)
// DELETE /api/recipes/:recipeId/reviews/:reviewId
router.delete('/:recipeId/reviews/:reviewId', isLoggedIn, recipesCtrl.deleteReview)

export {
  router
}
