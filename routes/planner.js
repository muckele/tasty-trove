import { Router } from 'express'
import * as plannerCtrl from '../controllers/planner.js'
import { isLoggedIn } from '../middleware/middleware.js'

const router = Router()

// GET /api/planner
router.get('/', isLoggedIn, plannerCtrl.index)
// PUT /api/planner/entry
router.put('/entry', isLoggedIn, plannerCtrl.upsertEntry)
// DELETE /api/planner/entry
router.delete('/entry', isLoggedIn, plannerCtrl.removeEntry)
// GET /api/planner/grocery
router.get('/grocery', isLoggedIn, plannerCtrl.grocery)

export { router }
