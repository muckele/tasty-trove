import * as plannerCtrl from '../controllers/planner.js'
import { MealPlan } from '../models/mealPlan.js'
import { Recipe } from '../models/recipe.js'
import { Profile } from '../models/profile.js'
import { Library } from '../models/library.js'

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
const profilesById = new Map()
const librariesByOwner = new Map()

const originalFindById = Recipe.findById
const originalFind = Recipe.find
const originalMealPlanFindOne = MealPlan.findOne
const originalMealPlanCreate = MealPlan.create
const originalProfileFindById = Profile.findById
const originalLibraryFindOne = Library.findOne

async function run() {
  try {
    recipesById.set('recipe-public-1', {
      _id: 'recipe-public-1',
      name: 'Public Test Soup',
      owner: 'owner-a',
      visibility: 'public',
      ingredients: [
        '1 lb chicken breast',
        '500 g chicken breast',
        '2 bunch cilantro',
        '1 cup rice',
      ],
    })
    recipesById.set('recipe-private-owner', {
      _id: 'recipe-private-owner',
      name: 'Private Owner Recipe',
      owner: 'owner-a',
      visibility: 'private',
      ingredients: '1 kg carrots, 2 lb carrots, 1 bunch cilantro, 2 cloves garlic',
    })
    recipesById.set('recipe-private-other', {
      _id: 'recipe-private-other',
      name: 'Private Other Recipe',
      owner: 'owner-b',
      visibility: 'private',
      ingredients: ['1 lb chicken', '2 tbsp oil'],
    })

    profilesById.set('owner-a', {
      _id: 'owner-a',
      groceryPreferences: {
        weightUnit: 'lb',
        volumeUnit: 'cup',
      },
      async save() {
        profilesById.set(String(this._id), this)
        return this
      },
    })

    librariesByOwner.set('owner-a', {
      owner: 'owner-a',
      favoriteRecipeIds: ['recipe-public-1'],
    })

    Recipe.findById = async (id) => recipesById.get(String(id)) || null
    Recipe.find = (filter = {}) => {
      const ownerFilterValue = Array.isArray(filter.$or)
        ? filter.$or.find((entry) => entry.owner)?.owner
        : null

      const filtered = [...recipesById.values()].filter((recipe) => {
        const ownerMatch = String(recipe.owner) === String(ownerFilterValue || '')
        const visibleMatch = filter.$or
          ? recipe.visibility !== 'private' || ownerMatch
          : true
        if (!visibleMatch) {
          return false
        }

        if (filter.mealCategory && recipe.mealCategory !== filter.mealCategory) {
          return false
        }

        if (filter.cuisineType && recipe.cuisineType !== filter.cuisineType) {
          return false
        }

        if (
          filter.totalTime &&
          Number.isFinite(filter.totalTime.$lte) &&
          Number(recipe.totalTime || 0) > Number(filter.totalTime.$lte)
        ) {
          return false
        }

        return true
      })

      return {
        select() {
          return Promise.resolve(filtered)
        },
        then(resolve, reject) {
          return Promise.resolve(filtered).then(resolve, reject)
        },
        catch(reject) {
          return Promise.resolve(filtered).catch(reject)
        },
      }
    }

    Profile.findById = (id) => {
      const profile = profilesById.get(String(id)) || null
      return {
        select() {
          return Promise.resolve(profile)
        },
        then(resolve, reject) {
          return Promise.resolve(profile).then(resolve, reject)
        },
        catch(reject) {
          return Promise.resolve(profile).catch(reject)
        },
      }
    }

    Library.findOne = (filter) => {
      const library = librariesByOwner.get(String(filter.owner)) || null
      return {
        select() {
          return Promise.resolve(library)
        },
        then(resolve, reject) {
          return Promise.resolve(library).then(resolve, reject)
        },
        catch(reject) {
          return Promise.resolve(library).catch(reject)
        },
      }
    }

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
          recipeId: 'recipe-public-1',
        },
      })
      const res = makeRes()
      await plannerCtrl.upsertEntry(req, res)
      assert(res.statusCode === 200, 'Upsert should succeed for public recipe')
      assert((res.body?.mealPlan?.entries || []).length === 2, 'Missing second upserted entry')
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
      const chickenItems = items.filter((item) =>
        String(item.name || '').toLowerCase().includes('chicken')
      )
      assert(
        chickenItems.length === 1,
        'Duplicate meat ingredients should merge across weight units'
      )
      assert(
        /lb/i.test(String(chickenItems[0].quantityText || '')),
        'Meat quantities should normalize to lb'
      )
      const carrotItem = items.find((item) =>
        String(item.name || '').toLowerCase().includes('carrot')
      )
      assert(carrotItem, 'Expected carrots to appear in grocery list')
      assert(
        /lb/i.test(String(carrotItem.quantityText || '')),
        'Produce weight quantities should normalize to lb'
      )
      const cilantroItem = items.find((item) =>
        String(item.name || '').toLowerCase().includes('cilantro')
      )
      assert(cilantroItem, 'Expected cilantro to appear in grocery list')
      assert(
        /bunch/i.test(String(cilantroItem.quantityText || '')),
        'Produce bunch quantities should keep bunch units'
      )
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
      const req = makeReq('owner-a')
      const res = makeRes()
      await plannerCtrl.preferences(req, res)
      assert(res.statusCode === 200, 'Preferences should return 200')
      assert(
        res.body?.groceryPreferences?.weightUnit === 'lb' &&
          res.body?.groceryPreferences?.volumeUnit === 'cup',
        'Preferences payload should include normalized units'
      )
    }

    {
      const req = makeReq('owner-a', {
        body: {
          groceryPreferences: {
            weightUnit: 'kg',
            volumeUnit: 'ml',
          },
        },
      })
      const res = makeRes()
      await plannerCtrl.updatePreferences(req, res)
      assert(res.statusCode === 200, 'Preference update should return 200')
      assert(
        res.body?.groceryPreferences?.weightUnit === 'kg' &&
          res.body?.groceryPreferences?.volumeUnit === 'ml',
        'Preference update should persist normalized values'
      )
    }

    {
      const req = makeReq('owner-a', {
        body: {
          weekStart: '2026-02-23',
          goals: {
            cuisineType: '',
            mealCategory: '',
            maxTotalTime: 60,
            prioritizeFavorites: true,
            favoritesOnly: false,
            overwriteExisting: false,
            slots: ['snack'],
          },
        },
      })
      const res = makeRes()
      await plannerCtrl.autofillWeek(req, res)
      assert(res.statusCode === 200, 'Autofill should return 200')
      assert(Number(res.body?.filledCount || 0) > 0, 'Autofill should fill at least one slot')
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
      const remainingEntries = res.body?.mealPlan?.entries || []
      const stillHasDinner = remainingEntries.some(
        (entry) => entry.dateKey === '2026-02-24' && entry.slot === 'dinner'
      )
      assert(
        !stillHasDinner,
        'Dinner entry should be removed while other entries may remain'
      )
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
    Recipe.find = originalFind
    MealPlan.findOne = originalMealPlanFindOne
    MealPlan.create = originalMealPlanCreate
    Profile.findById = originalProfileFindById
    Library.findOne = originalLibraryFindOne
  }
}

run().catch((err) => {
  console.error('Planner smoke tests failed:')
  console.error(err)
  process.exitCode = 1
})
