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
// GET /api/planner/preferences
router.get('/preferences', isLoggedIn, plannerCtrl.preferences)
// PUT /api/planner/preferences
router.put('/preferences', isLoggedIn, plannerCtrl.updatePreferences)
// POST /api/planner/autofill
router.post('/autofill', isLoggedIn, plannerCtrl.autofillWeek)
// GET /api/planner/grocery
router.get('/grocery', isLoggedIn, plannerCtrl.grocery)

export { router }
