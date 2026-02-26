import { MealPlan, MEAL_SLOTS } from '../models/mealPlan.js'
import { Recipe } from '../models/recipe.js'
import { Library } from '../models/library.js'
import { Profile } from '../models/profile.js'
import {
  normalizeMealCategory,
  normalizeCuisineType,
} from '../services/recipeClassification.js'

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

const FRACTION_CHAR_MAP = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅒': '1/10',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

const WORD_NUMBER_MAP = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
}

const AMOUNT_TOKEN_PATTERN =
  '\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter'

const AMOUNT_RANGE_REGEX = new RegExp(
  `^(${AMOUNT_TOKEN_PATTERN})(?:\\s*(?:-|to)\\s*(${AMOUNT_TOKEN_PATTERN}))?\\s*(.*)$`,
  'i'
)

const UNIT_DEFINITIONS = {
  lb: {
    kind: 'weight',
    baseFactor: 453.592,
    singular: 'lb',
    plural: 'lb',
  },
  oz: {
    kind: 'weight',
    baseFactor: 28.3495,
    singular: 'oz',
    plural: 'oz',
  },
  g: {
    kind: 'weight',
    baseFactor: 1,
    singular: 'g',
    plural: 'g',
  },
  kg: {
    kind: 'weight',
    baseFactor: 1000,
    singular: 'kg',
    plural: 'kg',
  },
  cup: {
    kind: 'volume',
    baseFactor: 240,
    singular: 'cup',
    plural: 'cups',
  },
  tbsp: {
    kind: 'volume',
    baseFactor: 15,
    singular: 'tbsp',
    plural: 'tbsp',
  },
  tsp: {
    kind: 'volume',
    baseFactor: 5,
    singular: 'tsp',
    plural: 'tsp',
  },
  ml: {
    kind: 'volume',
    baseFactor: 1,
    singular: 'ml',
    plural: 'ml',
  },
  l: {
    kind: 'volume',
    baseFactor: 1000,
    singular: 'l',
    plural: 'l',
  },
  floz: {
    kind: 'volume',
    baseFactor: 29.5735,
    singular: 'fl oz',
    plural: 'fl oz',
  },
  each: {
    kind: 'count',
    baseFactor: 1,
    singular: 'item',
    plural: 'items',
  },
  bunch: {
    kind: 'count',
    baseFactor: 1,
    singular: 'bunch',
    plural: 'bunches',
  },
  clove: {
    kind: 'count',
    baseFactor: 1,
    singular: 'clove',
    plural: 'cloves',
  },
  stalk: {
    kind: 'count',
    baseFactor: 1,
    singular: 'stalk',
    plural: 'stalks',
  },
  head: {
    kind: 'count',
    baseFactor: 1,
    singular: 'head',
    plural: 'heads',
  },
  can: {
    kind: 'count',
    baseFactor: 1,
    singular: 'can',
    plural: 'cans',
  },
  package: {
    kind: 'count',
    baseFactor: 1,
    singular: 'package',
    plural: 'packages',
  },
  slice: {
    kind: 'count',
    baseFactor: 1,
    singular: 'slice',
    plural: 'slices',
  },
  stick: {
    kind: 'count',
    baseFactor: 1,
    singular: 'stick',
    plural: 'sticks',
  },
  pinch: {
    kind: 'count',
    baseFactor: 1,
    singular: 'pinch',
    plural: 'pinches',
  },
  dash: {
    kind: 'count',
    baseFactor: 1,
    singular: 'dash',
    plural: 'dashes',
  },
}

const UNIT_ALIASES = {
  'fluid ounces': 'floz',
  'fluid ounce': 'floz',
  'fl oz': 'floz',
  pounds: 'lb',
  pound: 'lb',
  lbs: 'lb',
  lb: 'lb',
  ounces: 'oz',
  ounce: 'oz',
  oz: 'oz',
  kilograms: 'kg',
  kilogram: 'kg',
  kilos: 'kg',
  kilo: 'kg',
  kg: 'kg',
  grams: 'g',
  gram: 'g',
  g: 'g',
  tablespoons: 'tbsp',
  tablespoon: 'tbsp',
  tbsp: 'tbsp',
  tbs: 'tbsp',
  teaspoons: 'tsp',
  teaspoon: 'tsp',
  tsp: 'tsp',
  cups: 'cup',
  cup: 'cup',
  milliliters: 'ml',
  milliliter: 'ml',
  ml: 'ml',
  liters: 'l',
  liter: 'l',
  l: 'l',
  bunches: 'bunch',
  bunch: 'bunch',
  cloves: 'clove',
  clove: 'clove',
  stalks: 'stalk',
  stalk: 'stalk',
  heads: 'head',
  head: 'head',
  cans: 'can',
  can: 'can',
  packages: 'package',
  package: 'package',
  pkgs: 'package',
  pkg: 'package',
  slices: 'slice',
  slice: 'slice',
  sticks: 'stick',
  stick: 'stick',
  pinches: 'pinch',
  pinch: 'pinch',
  dashes: 'dash',
  dash: 'dash',
}

const UNIT_ALIAS_LIST = Object.keys(UNIT_ALIASES).sort(
  (left, right) => right.length - left.length
)

const DEFAULT_GROCERY_PREFERENCES = {
  weightUnit: 'lb',
  volumeUnit: 'cup',
}

const NEAR_DUPLICATE_ALIASES = [
  {
    canonical: 'green onion',
    pattern: /\b(?:scallions?|spring onions?|green onions?)\b/g,
  },
  {
    canonical: 'cilantro',
    pattern: /\b(?:coriander(?: leaves?)?)\b/g,
  },
  {
    canonical: 'bell pepper',
    pattern: /\b(?:capsicum|bell peppers?)\b/g,
  },
  {
    canonical: 'zucchini',
    pattern: /\b(?:courgettes?|zucchinis?)\b/g,
  },
  {
    canonical: 'eggplant',
    pattern: /\b(?:aubergines?|eggplants?)\b/g,
  },
  {
    canonical: 'chickpea',
    pattern: /\b(?:garbanzo beans?|chickpeas?)\b/g,
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

function normalizeWeightUnit(value) {
  return String(value || '').trim().toLowerCase() === 'kg' ? 'kg' : 'lb'
}

function normalizeVolumeUnit(value) {
  return String(value || '').trim().toLowerCase() === 'ml' ? 'ml' : 'cup'
}

function normalizeGroceryPreferences(preferences = {}) {
  return {
    weightUnit: normalizeWeightUnit(preferences.weightUnit),
    volumeUnit: normalizeVolumeUnit(preferences.volumeUnit),
  }
}

async function loadGroceryPreferences(ownerId) {
  const profile = await Profile.findById(ownerId).select('groceryPreferences')
  if (!profile) {
    return { ...DEFAULT_GROCERY_PREFERENCES }
  }

  const nextPreferences = normalizeGroceryPreferences(profile.groceryPreferences || {})
  if (
    profile.groceryPreferences?.weightUnit !== nextPreferences.weightUnit ||
    profile.groceryPreferences?.volumeUnit !== nextPreferences.volumeUnit
  ) {
    profile.groceryPreferences = nextPreferences
    await profile.save()
  }

  return nextPreferences
}

function normalizeFractionChars(value) {
  return String(value || '').replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (match) => {
    return FRACTION_CHAR_MAP[match] || match
  })
}

function parseAmountToken(token) {
  const normalized = String(token || '').trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (WORD_NUMBER_MAP[normalized] !== undefined) {
    return WORD_NUMBER_MAP[normalized]
  }

  const mixedFractionMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1])
    const numerator = Number(mixedFractionMatch[2])
    const denominator = Number(mixedFractionMatch[3])
    if (denominator) {
      return whole + numerator / denominator
    }
  }

  const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1])
    const denominator = Number(fractionMatch[2])
    if (denominator) {
      return numerator / denominator
    }
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized)
  }

  return null
}

function parseLeadingUnit(remainingText) {
  const normalized = String(remainingText || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return null
  }

  const matchedAlias = UNIT_ALIAS_LIST.find(
    (alias) => normalized === alias || normalized.startsWith(`${alias} `)
  )

  if (!matchedAlias) {
    return null
  }

  const canonicalUnit = UNIT_ALIASES[matchedAlias]
  const rest = normalized.slice(matchedAlias.length).trim().replace(/^of\s+/, '').trim()
  return {
    unit: canonicalUnit,
    remaining: rest,
  }
}

function roundQuantity(value, precision = 2) {
  const factor = 10 ** precision
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor
}

function formatQuantityNumber(value) {
  const rounded = roundQuantity(value, 2)
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return String(Math.round(rounded))
  }

  return String(rounded)
}

function formatQuantityLabel(amount, unit) {
  const unitInfo = UNIT_DEFINITIONS[unit]
  if (!unitInfo || !(amount > 0)) {
    return ''
  }

  const singular = Math.abs(amount - 1) < 0.01
  return `${formatQuantityNumber(amount)} ${
    singular ? unitInfo.singular : unitInfo.plural
  }`
}

function pickDisplayUnitForAggregate(
  measureKind,
  totalBaseAmount,
  aisle,
  aggregationUnit,
  preferences
) {
  if (!(totalBaseAmount > 0)) {
    return ''
  }

  if (measureKind === 'weight') {
    const preferredWeightUnit = normalizeWeightUnit(preferences?.weightUnit)
    if (preferredWeightUnit === 'kg') {
      return totalBaseAmount >= 1000 ? 'kg' : 'g'
    }
    return 'lb'
  }

  if (measureKind === 'volume') {
    const preferredVolumeUnit = normalizeVolumeUnit(preferences?.volumeUnit)
    if (preferredVolumeUnit === 'ml') {
      return totalBaseAmount >= 1000 ? 'l' : 'ml'
    }

    if (totalBaseAmount >= 240) {
      return 'cup'
    }
    if (totalBaseAmount >= 15) {
      return 'tbsp'
    }
    return 'tsp'
  }

  if (measureKind === 'count') {
    return aggregationUnit || 'each'
  }

  return ''
}

function convertBaseAmountToUnit(totalBaseAmount, unit) {
  const unitInfo = UNIT_DEFINITIONS[unit]
  if (!unitInfo || !unitInfo.baseFactor) {
    return 0
  }

  return totalBaseAmount / unitInfo.baseFactor
}

function normalizeIngredientKey(ingredient) {
  let normalized = normalizeFractionChars(String(ingredient || ''))
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
    .replace(/^of\s+/, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  NEAR_DUPLICATE_ALIASES.forEach(({ canonical, pattern }) => {
    normalized = normalized.replace(pattern, canonical)
  })

  normalized = normalized
    .replace(/\b(\w+)\s+\1\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

function parseIngredientMeasurement(ingredientText) {
  const normalizedText = normalizeFractionChars(ingredientText)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalizedText) {
    return null
  }

  const textWithoutQualifier = normalizedText.replace(
    /^(?:about|approx(?:imately)?\.?|around)\s+/i,
    ''
  )
  const amountMatch = textWithoutQualifier.match(AMOUNT_RANGE_REGEX)

  let quantity = null
  let remaining = textWithoutQualifier

  if (amountMatch) {
    const lower = parseAmountToken(amountMatch[1])
    const upper = parseAmountToken(amountMatch[2])
    if (lower !== null) {
      quantity = lower
    }
    if (upper !== null) {
      quantity = quantity === null ? upper : Math.max(quantity, upper)
    }
    remaining = String(amountMatch[3] || '').trim()
  }

  let parsedUnit = parseLeadingUnit(remaining)

  if (parsedUnit && quantity === null) {
    quantity = 1
  }

  if (!parsedUnit && !quantity) {
    const noAmountUnit = parseLeadingUnit(textWithoutQualifier)
    if (noAmountUnit && ['pinch', 'dash'].includes(noAmountUnit.unit)) {
      parsedUnit = noAmountUnit
      quantity = 1
    }
  }

  if (quantity !== null && !parsedUnit) {
    parsedUnit = {
      unit: 'each',
      remaining,
    }
  }

  const normalizedName = normalizeIngredientKey(parsedUnit?.remaining || textWithoutQualifier)
  if (!normalizedName) {
    return null
  }

  const unitInfo = parsedUnit ? UNIT_DEFINITIONS[parsedUnit.unit] : null
  const totalBaseAmount =
    unitInfo && quantity !== null ? Number(quantity) * unitInfo.baseFactor : 0

  return {
    normalizedName,
    displayName: shortenText(formatIngredientLabel(normalizedName), 72),
    measureKind: unitInfo?.kind || '',
    aggregationUnit: unitInfo?.kind === 'count' ? parsedUnit.unit : unitInfo?.kind || 'none',
    totalBaseAmount,
  }
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

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false
    }
  }

  return fallback
}

function normalizeAutofillInput(rawInput = {}) {
  const maxTotalTime = Number(rawInput.maxTotalTime)
  return {
    mealCategory: normalizeMealCategory(rawInput.mealCategory),
    cuisineType: normalizeCuisineType(rawInput.cuisineType),
    maxTotalTime: Number.isFinite(maxTotalTime) && maxTotalTime > 0 ? maxTotalTime : 0,
    favoritesOnly: toBoolean(rawInput.favoritesOnly, false),
    prioritizeFavorites: toBoolean(rawInput.prioritizeFavorites, true),
    overwriteExisting: toBoolean(rawInput.overwriteExisting, false),
    slots: Array.isArray(rawInput.slots)
      ? rawInput.slots
          .map((slot) => String(slot || '').toLowerCase())
          .filter((slot) => MEAL_SLOTS.includes(slot))
      : [],
  }
}

async function loadFavoriteRecipeIdSet(ownerId) {
  const library = await Library.findOne({ owner: ownerId }).select('favoriteRecipeIds')
  if (!library) {
    return new Set()
  }

  return new Set((library.favoriteRecipeIds || []).map((entry) => String(entry)))
}

function getAutofillSlots(normalizedInput) {
  if (normalizedInput.slots.length) {
    return normalizedInput.slots
  }
  return MEAL_SLOTS
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

async function preferences(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const groceryPreferences = await loadGroceryPreferences(ownerId)
    return res.json({ groceryPreferences })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to load planner preferences' })
  }
}

async function updatePreferences(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const profile = await Profile.findById(ownerId)
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const nextPreferences = normalizeGroceryPreferences(req.body.groceryPreferences || req.body)
    profile.groceryPreferences = nextPreferences
    await profile.save()

    return res.json({ groceryPreferences: nextPreferences })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ error: 'Unable to save planner preferences' })
  }
}

function pickAutofillRecipe(candidates, usageCountByRecipeId, favoriteRecipeIds, options) {
  if (!candidates.length) {
    return null
  }

  let winningRecipe = null
  let winningScore = -Infinity

  candidates.forEach((recipe) => {
    const recipeId = String(recipe._id)
    const usageCount = usageCountByRecipeId.get(recipeId) || 0
    const favoriteBoost =
      options.prioritizeFavorites && favoriteRecipeIds.has(recipeId) ? 40 : 0
    const timePenalty = Number(recipe.totalTime || 0) > 0 ? Number(recipe.totalTime) / 30 : 0
    const usagePenalty = usageCount * 12
    const randomBonus = Math.random() * 4
    const score = 100 + favoriteBoost - usagePenalty - timePenalty + randomBonus

    if (score > winningScore) {
      winningScore = score
      winningRecipe = recipe
    }
  })

  return winningRecipe
}

async function autofillWeek(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.body.weekStart)
    const normalizedInput = normalizeAutofillInput(req.body.goals || req.body || {})
    const targetSlots = getAutofillSlots(normalizedInput)
    const weekDateKeys = getWeekDateKeys(weekStart)

    const favorites = await loadFavoriteRecipeIdSet(ownerId)

    const recipeFilter = {
      $or: [
        { visibility: { $ne: 'private' } },
        { owner: ownerId },
      ],
    }

    if (normalizedInput.mealCategory) {
      recipeFilter.mealCategory = normalizedInput.mealCategory
    }
    if (normalizedInput.cuisineType) {
      recipeFilter.cuisineType = normalizedInput.cuisineType
    }
    if (normalizedInput.maxTotalTime > 0) {
      recipeFilter.totalTime = { $lte: normalizedInput.maxTotalTime }
    }

    let candidates = await Recipe.find(recipeFilter).select(
      '_id name totalTime owner visibility mealCategory cuisineType'
    )

    if (normalizedInput.favoritesOnly) {
      candidates = candidates.filter((recipe) => favorites.has(String(recipe._id)))
    }

    if (!candidates.length) {
      return res.status(400).json({
        error:
          'No recipes matched your autofill goals. Relax a filter or add more recipes/favorites.',
      })
    }

    const plan =
      (await MealPlan.findOne({ owner: ownerId, weekStart })) ||
      (await MealPlan.create({ owner: ownerId, weekStart, entries: [] }))

    const existingEntryMap = new Map()
    const usageCountByRecipeId = new Map()
    ;(plan.entries || []).forEach((entry) => {
      existingEntryMap.set(`${entry.dateKey}:${entry.slot}`, entry)
      const recipeId = String(entry.recipe || '')
      if (!recipeId) {
        return
      }
      usageCountByRecipeId.set(recipeId, (usageCountByRecipeId.get(recipeId) || 0) + 1)
    })

    let filledCount = 0
    weekDateKeys.forEach((dateKey) => {
      targetSlots.forEach((slot) => {
        const entryKey = `${dateKey}:${slot}`
        const existingEntry = existingEntryMap.get(entryKey)
        if (existingEntry && !normalizedInput.overwriteExisting) {
          return
        }

        const chosenRecipe = pickAutofillRecipe(
          candidates,
          usageCountByRecipeId,
          favorites,
          normalizedInput
        )
        if (!chosenRecipe) {
          return
        }

        if (existingEntry) {
          existingEntry.recipe = chosenRecipe._id
        } else {
          const nextEntry = {
            dateKey,
            slot,
            recipe: chosenRecipe._id,
          }
          plan.entries.push(nextEntry)
          existingEntryMap.set(entryKey, nextEntry)
        }

        const recipeId = String(chosenRecipe._id)
        usageCountByRecipeId.set(recipeId, (usageCountByRecipeId.get(recipeId) || 0) + 1)
        filledCount += 1
      })
    })

    if (filledCount === 0) {
      return res.status(400).json({
        error:
          'No slots were updated. Enable overwrite or clear some slots before autofill.',
      })
    }

    await plan.save()
    const hydratedPlan = await loadMealPlan(ownerId, weekStart)
    return res.json({
      mealPlan: sanitizePlan(hydratedPlan, ownerId),
      weekDateKeys,
      filledCount,
      goals: {
        mealCategory: normalizedInput.mealCategory,
        cuisineType: normalizedInput.cuisineType,
        maxTotalTime: normalizedInput.maxTotalTime,
        favoritesOnly: normalizedInput.favoritesOnly,
        prioritizeFavorites: normalizedInput.prioritizeFavorites,
        overwriteExisting: normalizedInput.overwriteExisting,
        slots: targetSlots,
      },
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to autofill meal plan' })
  }
}

async function grocery(req, res) {
  try {
    const ownerId = getOwnerId(req)
    const weekStart = getWeekStartKey(req.query.weekStart)
    const groceryPreferences = await loadGroceryPreferences(ownerId)
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

        const aisle = detectAisle(ingredientText)
        const parsed = parseIngredientMeasurement(ingredientText)
        if (!parsed) {
          return
        }

        const key = `${parsed.normalizedName}::${parsed.aggregationUnit}`
        const existing = itemMap.get(key)

        if (!existing) {
          itemMap.set(key, {
            key,
            name: parsed.displayName,
            sample: shortenText(ingredientText, 180),
            aisle,
            count: 1,
            recipes: new Set([recipe.name]),
            measureKind: parsed.measureKind,
            aggregationUnit: parsed.aggregationUnit,
            totalBaseAmount: parsed.totalBaseAmount,
          })
          return
        }

        existing.count += 1
        existing.recipes.add(recipe.name)
        if (parsed.totalBaseAmount > 0) {
          existing.totalBaseAmount += parsed.totalBaseAmount
        }
        if (existing.aisle === 'Other' && aisle !== 'Other') {
          existing.aisle = aisle
        }
      })
    })

    const items = [...itemMap.values()]
      .map((item) => ({
        name: item.name,
        sample: item.sample,
        aisle: item.aisle,
        count: item.count,
        recipes: [...item.recipes],
        quantityText: (() => {
          const displayUnit = pickDisplayUnitForAggregate(
            item.measureKind,
            item.totalBaseAmount,
            item.aisle,
            item.aggregationUnit,
            groceryPreferences
          )
          if (!displayUnit) {
            return ''
          }

          const displayAmount = convertBaseAmountToUnit(item.totalBaseAmount, displayUnit)
          return formatQuantityLabel(displayAmount, displayUnit)
        })(),
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

    return res.json({ weekStart, items, groupedItems, preferences: groceryPreferences })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Unable to build grocery list' })
  }
}

export {
  index,
  upsertEntry,
  removeEntry,
  preferences,
  updatePreferences,
  autofillWeek,
  grocery,
}
