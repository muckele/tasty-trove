const DIETARY_TAG_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
]

const ALLERGEN_TAG_OPTIONS = [
  'dairy',
  'eggs',
  'peanuts',
  'tree nuts',
  'soy',
  'wheat',
  'fish',
  'shellfish',
  'sesame',
]

const ALLERGEN_KEYWORDS = {
  dairy: [
    'milk',
    'cheese',
    'butter',
    'cream',
    'yogurt',
    'ghee',
    'parmesan',
    'mozzarella',
    'feta',
  ],
  eggs: ['egg', 'eggs', 'mayonnaise', 'aioli'],
  peanuts: ['peanut', 'peanuts', 'peanut butter'],
  'tree nuts': [
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'pistachio',
    'hazelnut',
    'macadamia',
    'pine nut',
  ],
  soy: ['soy', 'tofu', 'tempeh', 'miso', 'edamame', 'soy sauce'],
  wheat: [
    'wheat',
    'flour',
    'bread',
    'pasta',
    'noodle',
    'breadcrumbs',
    'tortilla',
    'barley',
    'rye',
    'gluten',
  ],
  fish: ['fish', 'salmon', 'tuna', 'anchovy', 'cod', 'sardine'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster'],
  sesame: ['sesame', 'tahini'],
}

const NON_VEGETARIAN_KEYWORDS = [
  'beef',
  'pork',
  'chicken',
  'turkey',
  'lamb',
  'bacon',
  'ham',
  'sausage',
  'fish',
  'shrimp',
  'crab',
  'anchovy',
  'gelatin',
]

const NON_VEGAN_KEYWORDS = [
  'milk',
  'cheese',
  'butter',
  'cream',
  'yogurt',
  'egg',
  'eggs',
  'honey',
  'ghee',
  'mayonnaise',
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function hasKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i')
  return pattern.test(text)
}

function normalizeTagArray(value, validOptions = []) {
  const optionsSet = new Set(validOptions)
  const inputValues = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)

  const output = []
  const seen = new Set()

  inputValues.forEach((entry) => {
    const normalized = normalizeText(entry)
    if (!normalized || !optionsSet.has(normalized) || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    output.push(normalized)
  })

  return output
}

function inferAllergenTags(ingredients = []) {
  const ingredientText = normalizeText(
    Array.isArray(ingredients) ? ingredients.join(' ') : ingredients
  )

  return Object.entries(ALLERGEN_KEYWORDS)
    .filter(([, keywords]) =>
      keywords.some((keyword) => hasKeyword(ingredientText, keyword))
    )
    .map(([tag]) => tag)
}

function inferDietaryTags(ingredients = [], inferredAllergens = []) {
  const ingredientText = normalizeText(
    Array.isArray(ingredients) ? ingredients.join(' ') : ingredients
  )
  const allergensSet = new Set(inferredAllergens)

  const isVegetarian = !NON_VEGETARIAN_KEYWORDS.some((keyword) =>
    hasKeyword(ingredientText, keyword)
  )
  const isVegan =
    isVegetarian &&
    !NON_VEGAN_KEYWORDS.some((keyword) => hasKeyword(ingredientText, keyword))
  const isGlutenFree = !ALLERGEN_KEYWORDS.wheat.some((keyword) =>
    hasKeyword(ingredientText, keyword)
  )

  const tags = []
  if (isVegetarian) {
    tags.push('vegetarian')
  }
  if (isVegan) {
    tags.push('vegan')
  }
  if (isGlutenFree) {
    tags.push('gluten-free')
  }
  if (!allergensSet.has('dairy')) {
    tags.push('dairy-free')
  }
  if (!allergensSet.has('peanuts') && !allergensSet.has('tree nuts')) {
    tags.push('nut-free')
  }

  return tags
}

function inferRecipeTags(ingredients = []) {
  const allergenTags = inferAllergenTags(ingredients)
  const dietaryTags = inferDietaryTags(ingredients, allergenTags)

  return {
    dietaryTags,
    allergenTags,
  }
}

export {
  DIETARY_TAG_OPTIONS,
  ALLERGEN_TAG_OPTIONS,
  normalizeTagArray,
  inferRecipeTags,
}
