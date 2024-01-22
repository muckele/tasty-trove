import { Router } from 'express'
import * as recipesCtrl from '../controllers/recipes.js'

const router = Router()

// GET localhost:3000/recipes
router.get('/', recipesCtrl.index)
// GET /recipes/new
router.get('/new', recipesCtrl.new)
// POST /recipes
router.post('/', recipesCtrl.create)



export {
  router
}