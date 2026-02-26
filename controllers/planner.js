import { MealPlan, MEAL_SLOTS } from '../models/mealPlan.js'
import { Recipe } from '../models/recipe.js'

const AISLE_KEYWORDS = [
  {
    aisle: 'Produce',
    keywords: [
      'onion',
      'garlic',
      'carrot',
      'celery',
      'potato',
      'tomato',
      'pepper',
      'lemon',
      'lime',
      'avocado',
      'spinach',
      'lettuce',
      'apple',
      'banana',
      'cilantro',
      'parsley',
      'ginger',
      'herb',
    ],
  },
  {
    aisle: 'Meat & Seafood',
    keywords: [
      'beef',
      'pork',
      'chicken',
      'turkey',
      'bacon',
      'ham',
      'sausage',
      'fish',
      'salmon',
      'tuna',
      'shrimp',
      'crab',
      'lobster',
    ],
  },
  {
    aisle: 'Dairy & Eggs',
    keywords: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'egg', 'eggs'],
  },
  {
    aisle: 'Bakery & Grains',
    keywords: [
      'bread',
      'bagel',
      'tortilla',
      'rice',
      'pasta',
      'noodle',
      'flour',
      'oats',
      'quinoa',
    ],
  },
  {
    aisle: 'Canned & Jarred',
    keywords: ['canned', 'can ', 'jar', 'tomato paste', 'broth', 'stock'],
  },
  {
    aisle: 'Spices & Seasonings',
    keywords: [
      'salt',
      'pepper',
      'paprika',
      'cumin',
      'curry',
      'oregano',
      'basil',
      'thyme',
      'rosemary',
      'cayenne',
      'seasoning',
      'spice',
    ],
  },
  {
    aisle: 'Oils, Sauces & Condiments',
    keywords: [
      'oil',
      'vinegar',
      'soy sauce',
      'mustard',
      'ketchup',
      'mayo',
      'mayonnaise',
      'hot sauce',
      'sauce',
      'dressing',
      'tahini',
      'paste',
    ],
  },
  {
    aisle: 'Frozen',
    keywords: ['frozen'],
  },
]

function getOwnerId(req) {
  return String(req.user?.profile?._id || req.user?.profile || '')
}

function parseDateInput(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return new Date()
  }

  const date = new Date(`${normalized}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return new Date()
  }

  return date
}

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function getWeekStartKey(input) {
  const date = parseDateInput(input)
  const day = date.getUTCDay()
  const offsetToMonday = (day + 6) % 7
  const monday = new Date(date)
  monday.setUTCDate(monday.getUTCDate() - offsetToMonday)
  return toDateKey(monday)
}

function getWeekDateKeys(weekStartKey) {
  const start = parseDateInput(weekStartKey)
  const keys = []
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + index)
    keys.push(toDateKey(date))
  }

  return keys
}

function normalizeIngredientKey(ingredient) {
  let normalized = String(ingredient || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .trim()

  normalized = normalized.replace(
    /^(?:about|approx\.?|approximately)?\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)(?:\s*(?:-|to)\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter))?\s+/i,
    ''
  )

  normalized = normalized.replace(
    /^(?:cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|ml|l|cloves?|cans?|packages?|slices?|sticks?|pinches?|dash(?:es)?|pt|qt|gal|fl oz)\b\.?\s+/i,
    ''
  )

  normalized = normalized
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

function detectAisle(ingredient) {
  const normalized = String(ingredient || '').toLowerCase()

  const match = AISLE_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  )

  return match?.aisle || 'Other'
}

function formatIngredientLabel(value) {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }

  return text.charAt(0).toUpperCase() + text.slice(1)
}

function shortenText(value, maxLength = 120) {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}...`
}

function splitPackedIngredientText(value) {
  const input = String(value || '')
    .replace(/\r/g, '\n')
    .trim()
  if (!input) {
    return []
  }

  const newlineParts = input
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (newlineParts.length > 1) {
    return newlineParts.flatMap(splitPackedIngredientText)
  }

  const commaCount = (input.match(/,/g) || []).length
  const semicolonCount = (input.match(/;/g) || []).length
  const separatorCount = commaCount + semicolonCount
  const looksPacked = separatorCount >= 4 && input.length >= 80

  if (!looksPacked) {
    return [input]
  }

  const splitParts = input
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (splitParts.length < 2) {
    return [input]
  }

  return splitParts
}

function normalizeIngredientList(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients.flatMap((entry) => splitPackedIngredientText(entry))
  }

  if (typeof ingredients === 'string') {
    const text = ingredients.replace(/\r/g, '\n').trim()
    if (!text) {
      return []
    }

    if (text.includes('\n')) {
      return text
        .split(/\n+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    }

    const commaParts = text
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    if (commaParts.length > 1) {
      return commaParts
    }

    return [text]
  }

  return []
}

async function loadMealPlan(ownerId, weekStart) {
  return MealPlan.findOne({
    owner: ownerId,
    weekStart,
  }).populate({
    path: 'entries.recipe',
    select:
      'name imageUrl totalTime mealCategory cuisineType dietaryTags allergenTags ingredients owner visibility shareToken',
  })
}

function recipeIsVisibleToOwner(recipe, ownerId) {
  if (!recipe) {
    return false
  }

  if (recipe.visibility !== 'private') {
    return true
  }

  return String(recipe.owner?._id || recipe.owner) === ownerId
}

function sanitizePlan(planDoc, ownerId) {
  if (!planDoc) {
    return null
  }

  const plan = planDoc.toObject()
  plan.entries = (plan.entries || []).filter((entry) =>
    recipeIsVisibleToOwner(entry.recipe, ownerId)
  )
  return plan
}

async function index(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.query.weekStart)
    const weekDateKeys = getWeekDateKeys(weekStart)

    const mealPlan = await loadMealPlan(ownerId, weekStart)

    if (!mealPlan) {
      return res.json({
        mealPlan: {
          _id: null,
          owner: ownerId,
          weekStart,
          entries: [],
        },
        weekDateKeys,
      })
    }

    return res.json({
      mealPlan: sanitizePlan(mealPlan, ownerId),
      weekDateKeys,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to load meal plan' })
  }
}

async function upsertEntry(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.body.weekStart)
    const dateKey = String(req.body.dateKey || '').trim()
    const slot = String(req.body.slot || '').trim().toLowerCase()
    const recipeId = String(req.body.recipeId || '').trim()

    if (!dateKey) {
      return res.status(400).json({ error: 'dateKey is required' })
    }

    if (!MEAL_SLOTS.includes(slot)) {
      return res.status(400).json({ error: 'Invalid slot value' })
    }

    const recipe = await Recipe.findById(recipeId)
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }

    if (!recipeIsVisibleToOwner(recipe, ownerId)) {
      return res.status(403).json({ error: 'Recipe is not available for this plan' })
    }

    const plan =
      (await MealPlan.findOne({ owner: ownerId, weekStart })) ||
      (await MealPlan.create({ owner: ownerId, weekStart, entries: [] }))

    const existingEntry = plan.entries.find(
      (entry) => entry.dateKey === dateKey && entry.slot === slot
    )

    if (existingEntry) {
      existingEntry.recipe = recipe._id
    } else {
      plan.entries.push({
        dateKey,
        slot,
        recipe: recipe._id,
      })
    }

    await plan.save()
    const hydratedPlan = await loadMealPlan(ownerId, weekStart)
    return res.json({ mealPlan: sanitizePlan(hydratedPlan, ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to save meal plan entry' })
  }
}

async function removeEntry(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.body.weekStart)
    const dateKey = String(req.body.dateKey || '').trim()
    const slot = String(req.body.slot || '').trim().toLowerCase()

    const plan = await MealPlan.findOne({ owner: ownerId, weekStart })
    if (!plan) {
      return res.json({
        mealPlan: {
          _id: null,
          owner: ownerId,
          weekStart,
          entries: [],
        },
      })
    }

    plan.entries = plan.entries.filter(
      (entry) => !(entry.dateKey === dateKey && entry.slot === slot)
    )

    await plan.save()
    const hydratedPlan = await loadMealPlan(ownerId, weekStart)
    return res.json({ mealPlan: sanitizePlan(hydratedPlan, ownerId) })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to remove meal plan entry' })
  }
}

async function grocery(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.query.weekStart)
    const plan = await loadMealPlan(ownerId, weekStart)

    if (!plan) {
      return res.json({ weekStart, items: [], groupedItems: {} })
    }

    const itemMap = new Map()

    ;(plan.entries || []).forEach((entry) => {
      const recipe = entry.recipe
      if (!recipe || !recipeIsVisibleToOwner(recipe, ownerId)) {
        return
      }

      const ingredients = normalizeIngredientList(recipe.ingredients)
      ingredients.forEach((ingredient) => {
        const ingredientText = String(ingredient || '').trim()
        if (!ingredientText) {
          return
        }

        const key = normalizeIngredientKey(ingredientText) || ingredientText.toLowerCase()
        const aisle = detectAisle(ingredientText)
        const existing = itemMap.get(key)

        if (!existing) {
          const normalizedKey = normalizeIngredientKey(ingredientText) || ingredientText
          itemMap.set(key, {
            key,
            name: shortenText(formatIngredientLabel(normalizedKey), 72),
            sample: shortenText(ingredientText, 180),
            aisle,
            count: 1,
            recipes: new Set([recipe.name]),
          })
          return
        }

        existing.count += 1
        existing.recipes.add(recipe.name)
      })
    })

    const items = [...itemMap.values()]
      .map((item) => ({
        name: item.name,
        sample: item.sample,
        aisle: item.aisle,
        count: item.count,
        recipes: [...item.recipes],
      }))
      .sort((left, right) => {
        if (left.aisle !== right.aisle) {
          return left.aisle.localeCompare(right.aisle)
        }

        return left.name.localeCompare(right.name)
      })

    const groupedItems = items.reduce((groups, item) => {
      groups[item.aisle] = groups[item.aisle] || []
      groups[item.aisle].push(item)
      return groups
    }, {})

    return res.json({ weekStart, items, groupedItems })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to build grocery list' })
  }
}

export {
  index,
  upsertEntry,
  removeEntry,
  grocery,
}
