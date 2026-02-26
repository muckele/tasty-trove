const MEAL_CATEGORY_OPTIONS = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'appetizer',
  'side',
  'dessert',
  'drink',
  'soup',
  'salad',
  'sauce',
  'other',
]

const CUISINE_TYPE_OPTIONS = [
  'american',
  'mexican',
  'italian',
  'chinese',
  'japanese',
  'indian',
  'thai',
  'french',
  'greek',
  'mediterranean',
  'korean',
  'vietnamese',
  'middle eastern',
  'spanish',
  'other',
]

const MEAL_CATEGORY_KEYWORDS = {
  breakfast: [
    'breakfast',
    'brunch',
    'pancake',
    'waffle',
    'omelet',
    'omelette',
    'french toast',
    'oatmeal',
    'granola',
    'bagel',
    'muffin',
    'hash brown',
  ],
  lunch: [
    'lunch',
    'sandwich',
    'wrap',
    'panini',
    'quesadilla',
    'bowl',
    'grain bowl',
  ],
  dinner: [
    'dinner',
    'roast',
    'casserole',
    'stir fry',
    'meatloaf',
    'pot roast',
    'entree',
  ],
  snack: [
    'snack',
    'trail mix',
    'energy bite',
    'protein bite',
    'popcorn',
    'cracker',
    'chips',
  ],
  appetizer: [
    'appetizer',
    'starter',
    'bruschetta',
    'nachos',
    'dip',
    'hors d oeuvre',
  ],
  side: [
    'side',
    'side dish',
    'slaw',
    'mashed potato',
    'roasted vegetables',
  ],
  dessert: [
    'dessert',
    'cake',
    'cookie',
    'brownie',
    'pie',
    'tart',
    'ice cream',
    'cheesecake',
    'cupcake',
    'sweet',
  ],
  drink: [
    'drink',
    'beverage',
    'smoothie',
    'juice',
    'cocktail',
    'mocktail',
    'latte',
    'coffee',
    'tea',
    'lemonade',
  ],
  soup: ['soup', 'bisque', 'chowder', 'broth', 'ramen'],
  salad: ['salad', 'caesar', 'greens'],
  sauce: ['sauce', 'dressing', 'marinade', 'vinaigrette', 'aioli', 'pesto'],
  other: [],
}

const CUISINE_KEYWORDS = {
  american: [
    'american',
    'southern',
    'bbq',
    'barbecue',
    'new england',
    'cajun',
    'creole',
  ],
  mexican: [
    'mexican',
    'taco',
    'burrito',
    'enchilada',
    'fajita',
    'quesadilla',
    'guacamole',
    'salsa',
  ],
  italian: [
    'italian',
    'pasta',
    'risotto',
    'lasagna',
    'alfredo',
    'parmesan',
    'gnocchi',
    'marinara',
  ],
  chinese: [
    'chinese',
    'sichuan',
    'szechuan',
    'kung pao',
    'lo mein',
    'chow mein',
    'wonton',
  ],
  japanese: [
    'japanese',
    'sushi',
    'ramen',
    'teriyaki',
    'miso',
    'udon',
    'tempura',
  ],
  indian: [
    'indian',
    'masala',
    'tikka',
    'dal',
    'naan',
    'biryani',
    'paneer',
    'garam masala',
  ],
  thai: [
    'thai',
    'pad thai',
    'lemongrass',
    'tom yum',
    'green curry',
    'red curry',
  ],
  french: [
    'french',
    'ratatouille',
    'quiche',
    'coq au vin',
    'bechamel',
    'crepe',
  ],
  greek: ['greek', 'tzatziki', 'gyro', 'souvlaki', 'feta', 'moussaka'],
  mediterranean: ['mediterranean', 'hummus', 'falafel', 'tabbouleh', 'couscous'],
  korean: ['korean', 'kimchi', 'bulgogi', 'gochujang', 'bibimbap'],
  vietnamese: ['vietnamese', 'pho', 'banh mi', 'nuoc cham'],
  'middle eastern': [
    'middle eastern',
    'shawarma',
    'tahini',
    'zaatar',
    'harissa',
    'labneh',
  ],
  spanish: ['spanish', 'paella', 'gazpacho', 'tapas', 'chorizo'],
  other: [],
}

const CUISINE_ALIASES = {
  usa: 'american',
  us: 'american',
  'middle-east': 'middle eastern',
  middleeast: 'middle eastern',
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeMealCategory(value) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return ''
  }

  return MEAL_CATEGORY_OPTIONS.includes(normalized) ? normalized : ''
}

function normalizeCuisineType(value) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return ''
  }

  const aliased = CUISINE_ALIASES[normalized] || normalized
  return CUISINE_TYPE_OPTIONS.includes(aliased) ? aliased : ''
}

function countMatches(text, keyword) {
  if (!text || !keyword) {
    return 0
  }

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`,
    'gi'
  )

  let total = 0
  while (pattern.exec(text)) {
    total += 1
  }

  return total
}

function scoreByKeywords(text, keywords) {
  return keywords.reduce((score, keyword) => score + countMatches(text, keyword), 0)
}

function pickBestClassification(keywordMap, fields, fallbackValue) {
  let winningValue = fallbackValue
  let winningScore = 0

  Object.entries(keywordMap).forEach(([value, keywords]) => {
    if (!keywords.length) {
      return
    }

    const score =
      scoreByKeywords(fields.name, keywords) * 5 +
      scoreByKeywords(fields.description, keywords) * 3 +
      scoreByKeywords(fields.ingredients, keywords) * 2 +
      scoreByKeywords(fields.preparation, keywords) * 1 +
      scoreByKeywords(fields.sourceUrl, keywords) * 2

    if (score > winningScore) {
      winningValue = value
      winningScore = score
    }
  })

  return winningValue
}

function classifyRecipeMetadata(recipe = {}) {
  const fields = {
    name: normalizeText(recipe.name),
    description: normalizeText(recipe.description),
    ingredients: normalizeText(Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ') : ''),
    preparation: normalizeText(Array.isArray(recipe.preparation) ? recipe.preparation.join(' ') : ''),
    sourceUrl: normalizeText(recipe.sourceUrl),
  }

  return {
    mealCategory: pickBestClassification(MEAL_CATEGORY_KEYWORDS, fields, 'other'),
    cuisineType: pickBestClassification(CUISINE_KEYWORDS, fields, 'other'),
  }
}

export {
  MEAL_CATEGORY_OPTIONS,
  CUISINE_TYPE_OPTIONS,
  normalizeMealCategory,
  normalizeCuisineType,
  classifyRecipeMetadata,
}
