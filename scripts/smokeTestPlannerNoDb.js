import * as plannerCtrl from '../controllers/planner.js'
import { MealPlan } from '../models/mealPlan.js'
import { Recipe } from '../models/recipe.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    ended: false,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
}

function makeReq(profileId, overrides = {}) {
  return {
    user: {
      profile: {
        _id: profileId,
      },
    },
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function makePlanDoc(rawPlan) {
  const doc = {
    _id: rawPlan._id || `plan-${rawPlan.owner}-${rawPlan.weekStart}`,
    owner: rawPlan.owner,
    weekStart: rawPlan.weekStart,
    entries: rawPlan.entries || [],
    async save() {
      plansByKey.set(makePlanKey(this.owner, this.weekStart), this)
      return this
    },
    toObject() {
      return clone({
        _id: this._id,
        owner: this.owner,
        weekStart: this.weekStart,
        entries: this.entries,
      })
    },
  }

  return doc
}

function makePopulatedPlanDoc(planDoc) {
  if (!planDoc) {
    return null
  }

  const populatedEntries = (planDoc.entries || []).map((entry) => ({
    ...entry,
    recipe: recipesById.get(String(entry.recipe)) || null,
  }))

  return {
    _id: planDoc._id,
    owner: planDoc.owner,
    weekStart: planDoc.weekStart,
    entries: populatedEntries,
    toObject() {
      return clone({
        _id: this._id,
        owner: this.owner,
        weekStart: this.weekStart,
        entries: this.entries,
      })
    },
  }
}

function makePlanKey(owner, weekStart) {
  return `${String(owner)}::${String(weekStart)}`
}

const recipesById = new Map()
const plansByKey = new Map()

const originalFindById = Recipe.findById
const originalMealPlanFindOne = MealPlan.findOne
const originalMealPlanCreate = MealPlan.create

async function run() {
  try {
    recipesById.set('recipe-public-1', {
      _id: 'recipe-public-1',
      name: 'Public Test Soup',
      owner: 'owner-a',
      visibility: 'public',
      ingredients: ['1 cup rice', '2 carrots', '1 tbsp butter'],
    })
    recipesById.set('recipe-private-owner', {
      _id: 'recipe-private-owner',
      name: 'Private Owner Recipe',
      owner: 'owner-a',
      visibility: 'private',
      ingredients: '1 cup quinoa, 1 onion, 2 cloves garlic',
    })
    recipesById.set('recipe-private-other', {
      _id: 'recipe-private-other',
      name: 'Private Other Recipe',
      owner: 'owner-b',
      visibility: 'private',
      ingredients: ['1 lb chicken', '2 tbsp oil'],
    })

    Recipe.findById = async (id) => recipesById.get(String(id)) || null

    MealPlan.findOne = (filter) => {
      const key = makePlanKey(filter.owner, filter.weekStart)
      const planDoc = plansByKey.get(key) || null

      return {
        then(resolve, reject) {
          return Promise.resolve(planDoc).then(resolve, reject)
        },
        catch(reject) {
          return Promise.resolve(planDoc).catch(reject)
        },
        async populate() {
          return makePopulatedPlanDoc(planDoc)
        },
      }
    }

    MealPlan.create = async (payload) => {
      const doc = makePlanDoc({
        _id: `plan-${Date.now()}`,
        owner: String(payload.owner),
        weekStart: payload.weekStart,
        entries: payload.entries || [],
      })
      plansByKey.set(makePlanKey(doc.owner, doc.weekStart), doc)
      return doc
    }

    {
      const req = makeReq('owner-a', {
        query: { weekStart: '2026-02-23' },
      })
      const res = makeRes()
      await plannerCtrl.index(req, res)
      assert(res.statusCode === 200, 'Planner index should return 200')
      assert((res.body?.weekDateKeys || []).length === 7, 'Planner week should have 7 dates')
    }

    {
      const req = makeReq('owner-a', {
        body: {
          weekStart: '2026-02-23',
          dateKey: '2026-02-24',
          slot: 'dinner',
          recipeId: 'recipe-private-owner',
        },
      })
      const res = makeRes()
      await plannerCtrl.upsertEntry(req, res)
      assert(res.statusCode === 200, 'Upsert should succeed for owner private recipe')
      assert((res.body?.mealPlan?.entries || []).length === 1, 'Missing upserted entry')
    }

    {
      const req = makeReq('owner-a', {
        body: {
          weekStart: '2026-02-23',
          dateKey: '2026-02-24',
          slot: 'lunch',
          recipeId: 'recipe-private-other',
        },
      })
      const res = makeRes()
      await plannerCtrl.upsertEntry(req, res)
      assert(res.statusCode === 403, 'Upsert should fail for non-owner private recipe')
    }

    {
      const req = makeReq('owner-a', {
        query: { weekStart: '2026-02-23' },
      })
      const res = makeRes()
      await plannerCtrl.grocery(req, res)
      assert(res.statusCode === 200, 'Grocery should return 200')
      const items = res.body?.items || []
      assert(items.length >= 3, 'Packed ingredient strings were not split into items')
      assert(
        items.every((item) => String(item.name || '').length <= 72),
        'Ingredient display names should be shortened'
      )
      assert(
        Object.keys(res.body?.groupedItems || {}).length > 0,
        'Grocery grouped aisles should be populated'
      )
    }

    {
      const req = makeReq('owner-a', {
        body: {
          weekStart: '2026-02-23',
          dateKey: '2026-02-24',
          slot: 'dinner',
        },
      })
      const res = makeRes()
      await plannerCtrl.removeEntry(req, res)
      assert(res.statusCode === 200, 'Remove entry should return 200')
      assert((res.body?.mealPlan?.entries || []).length === 0, 'Entry should be removed')
    }

    {
      const req = makeReq('owner-a', {
        body: {
          weekStart: '2026-03-02',
          dateKey: '2026-03-03',
          slot: 'dinner',
        },
      })
      const res = makeRes()
      await plannerCtrl.removeEntry(req, res)
      assert(
        res.statusCode === 200 && Array.isArray(res.body?.mealPlan?.entries),
        'Remove on empty week should return empty mealPlan payload'
      )
    }

    console.log('Planner smoke tests passed.')
  } finally {
    Recipe.findById = originalFindById
    MealPlan.findOne = originalMealPlanFindOne
    MealPlan.create = originalMealPlanCreate
  }
}

run().catch((err) => {
  console.error('Planner smoke tests failed:')
  console.error(err)
  process.exitCode = 1
})
