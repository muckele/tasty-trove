import { Router } from 'express'
import * as libraryCtrl from '../controllers/library.js'
import { isLoggedIn } from '../middleware/middleware.js'

const router = Router()

// GET /api/library
router.get('/', isLoggedIn, libraryCtrl.index)
// POST /api/library/favorites/:recipeId
router.post('/favorites/:recipeId', isLoggedIn, libraryCtrl.addFavorite)
// DELETE /api/library/favorites/:recipeId
router.delete('/favorites/:recipeId', isLoggedIn, libraryCtrl.removeFavorite)
// POST /api/library/collections
router.post('/collections', isLoggedIn, libraryCtrl.createCollection)
// PUT /api/library/collections/:collectionId
router.put('/collections/:collectionId', isLoggedIn, libraryCtrl.renameCollection)
// DELETE /api/library/collections/:collectionId
router.delete('/collections/:collectionId', isLoggedIn, libraryCtrl.deleteCollection)
// POST /api/library/collections/:collectionId/recipes/:recipeId
router.post(
  '/collections/:collectionId/recipes/:recipeId',
  isLoggedIn,
  libraryCtrl.addRecipeToCollection
)
// DELETE /api/library/collections/:collectionId/recipes/:recipeId
router.delete(
  '/collections/:collectionId/recipes/:recipeId',
  isLoggedIn,
  libraryCtrl.removeRecipeFromCollection
)

export { router }
