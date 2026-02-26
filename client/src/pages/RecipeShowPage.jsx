import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePageStylesheets } from '../hooks/usePageStylesheets'
import { api } from '../services/api'

const LEADING_QUANTITY_REGEX = new RegExp(
  '^(?:(?:about|approx\\.?|approximately)\\s+)?' +
    '(?<first>\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|an|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|third|three quarters|two thirds)' +
    '(?:\\s*(?<separator>-|to)\\s*' +
    '(?<second>\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|an|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|third|three quarters|two thirds))?' +
    '\\s+(?<rest>.+)$',
  'i'
)

const QUANTITY_WORD_VALUES = {
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
  eleven: 11,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
  third: 1 / 3,
  'three quarters': 0.75,
  'two thirds': 2 / 3,
}

const UNICODE_FRACTION_VALUES = {
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

const IMPERIAL_TO_METRIC = {
  tsp: { kind: 'volume', factor: 4.92892 },
  tbsp: { kind: 'volume', factor: 14.7868 },
  'fl oz': { kind: 'volume', factor: 29.5735 },
  cup: { kind: 'volume', factor: 236.588 },
  pt: { kind: 'volume', factor: 473.176 },
  qt: { kind: 'volume', factor: 946.353 },
  gal: { kind: 'volume', factor: 3785.41 },
  oz: { kind: 'mass', factor: 28.3495 },
  lb: { kind: 'mass', factor: 453.592 },
}

const METRIC_TO_BASE = {
  ml: { kind: 'volume', factor: 1 },
  l: { kind: 'volume', factor: 1000 },
  g: { kind: 'mass', factor: 1 },
  kg: { kind: 'mass', factor: 1000 },
}

const UNIT_ALIASES = [
  {
    canonical: 'fl oz',
    aliases: ['fluid ounces', 'fluid ounce', 'fl. oz.', 'fl oz', 'floz'],
  },
  {
    canonical: 'tbsp',
    aliases: ['tablespoons', 'tablespoon', 'tbsp.', 'tbsp', 'tbs'],
  },
  {
    canonical: 'tsp',
    aliases: ['teaspoons', 'teaspoon', 'tsp.', 'tsp'],
  },
  { canonical: 'cup', aliases: ['cups', 'cup', 'c'] },
  { canonical: 'pt', aliases: ['pints', 'pint', 'pt'] },
  { canonical: 'qt', aliases: ['quarts', 'quart', 'qt'] },
  { canonical: 'gal', aliases: ['gallons', 'gallon', 'gal'] },
  { canonical: 'lb', aliases: ['pounds', 'pound', 'lbs', 'lb'] },
  { canonical: 'oz', aliases: ['ounces', 'ounce', 'oz'] },
  {
    canonical: 'ml',
    aliases: ['milliliters', 'milliliter', 'millilitres', 'millilitre', 'ml'],
  },
  { canonical: 'l', aliases: ['liters', 'liter', 'litres', 'litre', 'l'] },
  { canonical: 'kg', aliases: ['kilograms', 'kilogram', 'kg'] },
  { canonical: 'g', aliases: ['grams', 'gram', 'g'] },
]

const SINGULAR_TO_PLURAL_WORDS = {
  cup: 'cups',
  tablespoon: 'tablespoons',
  teaspoon: 'teaspoons',
  ounce: 'ounces',
  pound: 'pounds',
  pint: 'pints',
  quart: 'quarts',
  gallon: 'gallons',
  pinch: 'pinches',
  dash: 'dashes',
  clove: 'cloves',
  can: 'cans',
  package: 'packages',
  slice: 'slices',
  stick: 'sticks',
  sprig: 'sprigs',
  bunch: 'bunches',
  piece: 'pieces',
}

const PLURAL_TO_SINGULAR_WORDS = Object.fromEntries(
  Object.entries(SINGULAR_TO_PLURAL_WORDS).map(([singular, plural]) => [
    plural,
    singular,
  ])
)

const UNIT_INFLECTION_LABELS = {
  cup: { singular: 'cup', plural: 'cups' },
  tsp: { singular: 'tsp', plural: 'tsp' },
  tbsp: { singular: 'tbsp', plural: 'tbsp' },
  'fl oz': { singular: 'fl oz', plural: 'fl oz' },
  pt: { singular: 'pt', plural: 'pt' },
  qt: { singular: 'qt', plural: 'qt' },
  gal: { singular: 'gal', plural: 'gal' },
  oz: { singular: 'oz', plural: 'oz' },
  lb: { singular: 'lb', plural: 'lb' },
  ml: { singular: 'ml', plural: 'ml' },
  l: { singular: 'l', plural: 'l' },
  g: { singular: 'g', plural: 'g' },
  kg: { singular: 'kg', plural: 'kg' },
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function titleize(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildStarText(value) {
  const rating = Math.min(Math.max(Number(value) || 0, 0), 5)
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
}

function getProfileId(user) {
  if (!user?.profile) {
    return null
  }

  if (typeof user.profile === 'string') {
    return user.profile
  }

  return user.profile._id
}

function parseFraction(value) {
  const [numerator, denominator] = String(value).split('/')
  const top = Number(numerator)
  const bottom = Number(denominator)

  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) {
    return Number.NaN
  }

  return top / bottom
}

function parseQuantity(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return Number.NaN
  }

  if (Object.hasOwn(QUANTITY_WORD_VALUES, normalized)) {
    return QUANTITY_WORD_VALUES[normalized]
  }

  const hyphenWord = normalized.replace(/-/g, ' ')
  if (Object.hasOwn(QUANTITY_WORD_VALUES, hyphenWord)) {
    return QUANTITY_WORD_VALUES[hyphenWord]
  }

  if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
    const [whole, fraction] = normalized.split(/\s+/)
    const fractionValue = parseFraction(fraction)
    if (!Number.isFinite(fractionValue)) {
      return Number.NaN
    }

    return Number(whole) + fractionValue
  }

  if (/^\d+\/\d+$/.test(normalized)) {
    return parseFraction(normalized)
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized)
  }

  return Number.NaN
}

function formatQuantity(value) {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) {
    return String(rounded)
  }

  return String(rounded).replace(/\.?0+$/, '')
}

function normalizeIngredientForParsing(ingredient) {
  let normalized = String(ingredient || '').trim()
  if (!normalized) {
    return ''
  }

  Object.entries(UNICODE_FRACTION_VALUES).forEach(([unicode, ascii]) => {
    const unicodePattern = new RegExp(escapeRegExp(unicode), 'g')
    const mixedPattern = new RegExp(`(\\d)${escapeRegExp(unicode)}`, 'g')
    normalized = normalized.replace(mixedPattern, `$1 ${ascii}`)
    normalized = normalized.replace(unicodePattern, ascii)
  })

  normalized = normalized
    .replace(/[–—]/g, '-')
    .replace(/(\d+)\s*-\s*(\d+\/\d+)/g, '$1 $2')
    .replace(
      /\b(\d+(?:\.\d+)?|\d+\/\d+)\s*-\s*(\d+(?:\.\d+)?|\d+\/\d+)\b/g,
      '$1 - $2'
    )
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

function parseLeadingQuantityInfo(ingredient) {
  const normalized = normalizeIngredientForParsing(ingredient)
  if (!normalized) {
    return null
  }

  const match = normalized.match(LEADING_QUANTITY_REGEX)
  if (!match?.groups) {
    return null
  }

  const firstQuantity = parseQuantity(match.groups.first.toLowerCase())
  if (!Number.isFinite(firstQuantity)) {
    return null
  }

  const secondRaw = match.groups.second?.toLowerCase() || ''
  const secondQuantity = secondRaw ? parseQuantity(secondRaw) : Number.NaN

  return {
    firstQuantity,
    secondQuantity: Number.isFinite(secondQuantity) ? secondQuantity : Number.NaN,
    hasRange: Number.isFinite(secondQuantity),
    separator:
      match.groups.separator?.toLowerCase() === '-'
        ? '-'
        : match.groups.separator
          ? 'to'
          : '',
    rest: String(match.groups.rest || '').trim(),
  }
}

function extractServingCount(servingsValue) {
  if (typeof servingsValue === 'number' && Number.isFinite(servingsValue)) {
    return servingsValue > 0 ? servingsValue : 1
  }

  const normalized = String(servingsValue || '').trim()
  if (!normalized) {
    return 1
  }

  const quantityMatch = normalized.match(/(\d+(?:\.\d+)?)/)
  if (!quantityMatch) {
    return 1
  }

  const parsed = Number(quantityMatch[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildServingsLabel(currentServings, nextServings) {
  const nextText = formatQuantity(nextServings)
  const currentText = String(currentServings || '').trim()
  if (!currentText) {
    return nextText
  }

  if (/\d/.test(currentText)) {
    return currentText.replace(/(\d+(?:\.\d+)?)/, nextText)
  }

  return `${nextText} servings`
}

function buildQuantityText(firstQuantity, secondQuantity, hasRange, separator) {
  let text = formatQuantity(firstQuantity)
  if (hasRange && Number.isFinite(secondQuantity)) {
    if (separator === '-') {
      text = `${text} - ${formatQuantity(secondQuantity)}`
    } else {
      text = `${text} to ${formatQuantity(secondQuantity)}`
    }
  }

  return text
}

function shouldUsePlural(quantity) {
  if (!Number.isFinite(quantity)) {
    return false
  }

  return quantity > 1.0001 || quantity === 0
}

function applyWordCasing(sourceWord, targetWord) {
  if (sourceWord.toUpperCase() === sourceWord) {
    return targetWord.toUpperCase()
  }

  if (sourceWord[0] && sourceWord[0] === sourceWord[0].toUpperCase()) {
    return `${targetWord[0].toUpperCase()}${targetWord.slice(1)}`
  }

  return targetWord
}

function resolveSingularWord(word) {
  const normalized = word.toLowerCase()
  if (SINGULAR_TO_PLURAL_WORDS[normalized]) {
    return normalized
  }

  if (PLURAL_TO_SINGULAR_WORDS[normalized]) {
    return PLURAL_TO_SINGULAR_WORDS[normalized]
  }

  return null
}

function inflectCountWord(word, quantity) {
  const singularForm = resolveSingularWord(word)
  if (!singularForm) {
    return word
  }

  const inflected = shouldUsePlural(quantity)
    ? SINGULAR_TO_PLURAL_WORDS[singularForm]
    : singularForm

  return applyWordCasing(word, inflected)
}

function inflectLeadingWordForQuantity(restText, quantity) {
  const rest = String(restText || '')
  const match = rest.match(/^([A-Za-z]+)([\s\S]*)$/)
  if (!match) {
    return rest
  }

  const [, firstWord, remainder] = match
  const inflectedWord = inflectCountWord(firstWord, quantity)
  return `${inflectedWord}${remainder}`
}

function inflectUnitTokenForQuantity(unitToken, quantity) {
  const labels = UNIT_INFLECTION_LABELS[unitToken]
  if (!labels) {
    return unitToken
  }

  return shouldUsePlural(quantity) ? labels.plural : labels.singular
}

function scaleIngredient(ingredient, factor) {
  const normalized = String(ingredient || '').trim()
  if (!normalized || factor === 1) {
    return normalized
  }

  const quantityInfo = parseLeadingQuantityInfo(normalized)
  if (!quantityInfo) {
    return normalized
  }

  const scaledFirst = quantityInfo.firstQuantity * factor
  const scaledSecond = quantityInfo.hasRange
    ? quantityInfo.secondQuantity * factor
    : Number.NaN
  const quantityText = buildQuantityText(
    scaledFirst,
    scaledSecond,
    quantityInfo.hasRange,
    quantityInfo.separator
  )
  const pluralityBasis = quantityInfo.hasRange
    ? Math.max(scaledFirst, scaledSecond)
    : scaledFirst
  const inflectedRest = inflectLeadingWordForQuantity(
    quantityInfo.rest,
    pluralityBasis
  )

  return `${quantityText} ${inflectedRest}`.trim()
}

function findLeadingUnit(restOfIngredient) {
  const trimmedRest = String(restOfIngredient || '').trimStart()
  if (!trimmedRest) {
    return null
  }

  for (const unitConfig of UNIT_ALIASES) {
    for (const alias of unitConfig.aliases) {
      const regex = new RegExp(`^${escapeRegExp(alias)}(?=\\b|\\s|$)`, 'i')
      const match = trimmedRest.match(regex)
      if (!match) {
        continue
      }

      return {
        canonical: unitConfig.canonical,
        remaining: trimmedRest.slice(match[0].length).trimStart(),
      }
    }
  }

  return null
}

function getMetricOutput(baseValue, kind) {
  if (kind === 'volume') {
    if (baseValue >= 1000) {
      return { value: baseValue / 1000, unit: 'l', divisor: 1000 }
    }

    return { value: baseValue, unit: 'ml', divisor: 1 }
  }

  if (baseValue >= 1000) {
    return { value: baseValue / 1000, unit: 'kg', divisor: 1000 }
  }

  return { value: baseValue, unit: 'g', divisor: 1 }
}

function getImperialOutput(baseValue, kind) {
  if (kind === 'volume') {
    if (baseValue >= 3785.41) {
      return { value: baseValue / 3785.41, unit: 'gal', factor: 3785.41 }
    }
    if (baseValue >= 946.353) {
      return { value: baseValue / 946.353, unit: 'qt', factor: 946.353 }
    }
    if (baseValue >= 236.588) {
      return { value: baseValue / 236.588, unit: 'cup', factor: 236.588 }
    }
    if (baseValue >= 14.7868) {
      return { value: baseValue / 14.7868, unit: 'tbsp', factor: 14.7868 }
    }

    return { value: baseValue / 4.92892, unit: 'tsp', factor: 4.92892 }
  }

  if (baseValue >= 453.592) {
    return { value: baseValue / 453.592, unit: 'lb', factor: 453.592 }
  }

  return { value: baseValue / 28.3495, unit: 'oz', factor: 28.3495 }
}

function convertIngredientUnits(ingredient, unitMode) {
  if (unitMode === 'original') {
    return ingredient
  }

  const normalized = String(ingredient || '').trim()
  if (!normalized) {
    return normalized
  }

  const quantityInfo = parseLeadingQuantityInfo(normalized)
  if (!quantityInfo) {
    return normalized
  }

  const unitInfo = findLeadingUnit(quantityInfo.rest)
  if (!unitInfo) {
    return normalized
  }

  const isImperialSource = Boolean(IMPERIAL_TO_METRIC[unitInfo.canonical])
  const isMetricSource = Boolean(METRIC_TO_BASE[unitInfo.canonical])

  if (unitMode === 'metric' && isMetricSource) {
    return normalized
  }

  if (unitMode === 'imperial' && isImperialSource) {
    return normalized
  }

  let convertedFirst = quantityInfo.firstQuantity
  let convertedSecond = quantityInfo.secondQuantity
  let nextUnit = unitInfo.canonical

  if (unitMode === 'metric' && isImperialSource) {
    const source = IMPERIAL_TO_METRIC[unitInfo.canonical]
    const firstBase = convertedFirst * source.factor
    const secondBase = quantityInfo.hasRange ? convertedSecond * source.factor : Number.NaN
    const basis = Math.max(firstBase, Number.isFinite(secondBase) ? secondBase : 0)
    const output = getMetricOutput(basis, source.kind)

    convertedFirst = firstBase / output.divisor
    if (quantityInfo.hasRange) {
      convertedSecond = secondBase / output.divisor
    }
    nextUnit = output.unit
  } else if (unitMode === 'imperial' && isMetricSource) {
    const source = METRIC_TO_BASE[unitInfo.canonical]
    const firstBase = convertedFirst * source.factor
    const secondBase = quantityInfo.hasRange ? convertedSecond * source.factor : Number.NaN
    const basis = Math.max(firstBase, Number.isFinite(secondBase) ? secondBase : 0)
    const output = getImperialOutput(basis, source.kind)

    convertedFirst = firstBase / output.factor
    if (quantityInfo.hasRange) {
      convertedSecond = secondBase / output.factor
    }
    nextUnit = output.unit
  } else {
    return normalized
  }

  const quantityText = buildQuantityText(
    convertedFirst,
    convertedSecond,
    quantityInfo.hasRange,
    quantityInfo.separator
  )
  const pluralityBasis = quantityInfo.hasRange
    ? Math.max(convertedFirst, convertedSecond)
    : convertedFirst
  const inflectedUnit = inflectUnitTokenForQuantity(nextUnit, pluralityBasis)
  const suffix = unitInfo.remaining ? ` ${unitInfo.remaining}` : ''
  return `${quantityText} ${inflectedUnit}${suffix}`.trim()
}

function RecipeShowPage({ user }) {
  usePageStylesheets(['/stylesheets/recipes/show.css'])

  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [newReview, setNewReview] = useState({ content: '', rating: 1 })
  const [desiredServings, setDesiredServings] = useState(1)
  const [unitMode, setUnitMode] = useState('original')
  const [savingServings, setSavingServings] = useState(false)
  const [saveServingsError, setSaveServingsError] = useState('')
  const [saveServingsSuccess, setSaveServingsSuccess] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRecipe() {
      try {
        const data = await api.getRecipe(recipeId)
        if (!cancelled) {
          setRecipe(data.recipe)
          setNotFound(false)
        }
      } catch (err) {
        console.log(err)
        if (!cancelled) {
          setNotFound(true)
        }
      }
    }

    loadRecipe()

    return () => {
      cancelled = true
    }
  }, [recipeId])

  const baseServings = useMemo(
    () => extractServingCount(recipe?.servings),
    [recipe?.servings]
  )

  useEffect(() => {
    setDesiredServings(baseServings)
    setUnitMode('original')
    setSaveServingsError('')
    setSaveServingsSuccess('')
  }, [baseServings, recipe?._id])

  const scaledIngredients = useMemo(() => {
    const ingredients = recipe?.ingredients || []
    const nextServings =
      Number.isFinite(Number(desiredServings)) && Number(desiredServings) > 0
        ? Number(desiredServings)
        : 1
    const factor = nextServings / baseServings

    return ingredients.map((ingredient) => scaleIngredient(ingredient, factor))
  }, [recipe?.ingredients, desiredServings, baseServings])

  const displayedIngredients = useMemo(() => {
    return scaledIngredients.map((ingredient) =>
      convertIngredientUnits(ingredient, unitMode)
    )
  }, [scaledIngredients, unitMode])

  const userProfileId = getProfileId(user)
  const isRecipeOwner = useMemo(() => {
    if (!userProfileId || !recipe?.owner?._id) {
      return false
    }

    return recipe.owner._id === userProfileId
  }, [recipe, userProfileId])

  const averageRating = useMemo(() => {
    if (!recipe?.reviews?.length) {
      return null
    }

    const total = recipe.reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    )
    return (total / recipe.reviews.length).toFixed(2)
  }, [recipe])

  async function refreshRecipe() {
    try {
      const data = await api.getRecipe(recipeId)
      setRecipe(data.recipe)
      setNotFound(false)
    } catch (err) {
      console.log(err)
      setNotFound(true)
    }
  }

  async function handleDeleteRecipe() {
    const shouldDelete = window.confirm('Delete this recipe?')
    if (!shouldDelete) {
      return
    }

    try {
      await api.deleteRecipe(recipeId)
      navigate('/recipes')
    } catch (err) {
      console.log(err)
    }
  }

  async function handleReviewSubmit(event) {
    event.preventDefault()

    try {
      const data = await api.createReview(recipeId, newReview)
      setRecipe(data.recipe)
      setNewReview({ content: '', rating: 1 })
    } catch (err) {
      console.log(err)
    }
  }

  async function handleDeleteReview(reviewId) {
    const shouldDelete = window.confirm('Delete this review?')
    if (!shouldDelete) {
      return
    }

    try {
      await api.deleteReview(recipeId, reviewId)
      await refreshRecipe()
    } catch (err) {
      console.log(err)
    }
  }

  async function handleSaveScaledServings() {
    if (!isRecipeOwner || !recipe) {
      return
    }

    setSaveServingsError('')
    setSaveServingsSuccess('')
    setSavingServings(true)

    const nextServingsLabel = buildServingsLabel(recipe.servings, desiredServings)
    const payload = {
      name: recipe.name || '',
      description: recipe.description || '',
      sourceUrl: recipe.sourceUrl || '',
      servings: nextServingsLabel,
      imageUrl: recipe.imageUrl || '',
      totalTime: Number(recipe.totalTime) || 0,
      prepTime: Number(recipe.prepTime) || 0,
      cookTime: Number(recipe.cookTime) || 0,
      ingredients: displayedIngredients,
      preparation: recipe.preparation || [],
    }

    try {
      const data = await api.updateRecipe(recipeId, payload)
      setRecipe(data.recipe)
      setUnitMode('original')
      setSaveServingsSuccess('Scaled servings saved to this recipe.')
    } catch (err) {
      console.log(err)
      setSaveServingsError(err.message || 'Unable to save scaled servings.')
    } finally {
      setSavingServings(false)
    }
  }

  if (!recipe) {
    return (
      <main className="recipe-show-page">
        <section className="recipe-shell recipe-shell--status">
          <h1>{notFound ? 'Recipe not found.' : 'Loading recipe...'}</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="recipe-show-page">
      <section className="recipe-shell">
        <div className="recipe-header">
          <h1>{recipe.name}</h1>
          <img
            src={recipe.imageUrl || '/assets/images/logo-images/logo.png'}
            alt={recipe.name}
          />
        </div>
        <p id="author" className="recipe-author">
          From the kitchen of {recipe.owner?.name || 'Unknown'}
        </p>
        {recipe.description ? (
          <p className="recipe-description">{recipe.description}</p>
        ) : null}
        <div className="recipe-meta-grid">
          <p>
            <span>Meal Category</span>
            {titleize(recipe.mealCategory || 'other')}
          </p>
          <p>
            <span>Cuisine</span>
            {titleize(recipe.cuisineType || 'other')}
          </p>
          {recipe.servings ? (
            <p>
              <span>Servings</span>
              {recipe.servings}
            </p>
          ) : null}
        </div>
        <div className="servings-adjuster">
          <label htmlFor="servings-adjust-input">Adjust Servings</label>
          <input
            id="servings-adjust-input"
            type="number"
            min="1"
            step="0.5"
            value={desiredServings}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              setDesiredServings(
                Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1
              )
            }}
          />
          <button type="button" onClick={() => setDesiredServings(baseServings)}>
            Reset
          </button>
          {isRecipeOwner ? (
            <button
              type="button"
              onClick={handleSaveScaledServings}
              disabled={savingServings}
            >
              {savingServings ? 'Saving...' : 'Save Scaled Servings'}
            </button>
          ) : null}
        </div>
        <div className="measurement-controls">
          <span>Units:</span>
          <button
            type="button"
            className={unitMode === 'imperial' ? 'active' : ''}
            onClick={() => setUnitMode('imperial')}
          >
            English
          </button>
          <button
            type="button"
            className={unitMode === 'metric' ? 'active' : ''}
            onClick={() => setUnitMode('metric')}
          >
            Metric
          </button>
          <button
            type="button"
            className={unitMode === 'original' ? 'active' : ''}
            onClick={() => setUnitMode('original')}
          >
            Original
          </button>
        </div>
        {saveServingsError ? <p className="save-servings-error">{saveServingsError}</p> : null}
        {saveServingsSuccess ? (
          <p className="save-servings-success">{saveServingsSuccess}</p>
        ) : null}
        {recipe.sourceUrl ? (
          <p className="recipe-source">
            Original Source:{' '}
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              {recipe.sourceUrl}
            </a>
          </p>
        ) : null}
        <div className="time">
          <div className="time-item">
            <h2 id="prep-time">Prep</h2>
            <p>{recipe.prepTime} min</p>
          </div>
          <div className="time-item">
            <h2 id="total-time">Total</h2>
            <p>{recipe.totalTime} min</p>
          </div>
          <div className="time-item">
            <h2 id="cook-time">Cook</h2>
            <p>{recipe.cookTime} min</p>
          </div>
        </div>
        <div className="recipe-content">
          <div className="ingredients">
            <h2>Ingredients</h2>
            <ul className="ingredients-list">
              {displayedIngredients.map((ingredient, index) => (
                <li key={`${ingredient}-${index}`} className="ingredient-item">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>
          <div className="preparation">
            <h2>Preparation</h2>
            <ol className="preparation-list">
              {(recipe.preparation || []).map((step, index) => (
                <li key={`${step}-${index}`} className="prep-step">
                  <span className="prep-step-number">Step {index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {isRecipeOwner ? (
        <div className="change-btns">
          <Link to={`/recipes/${recipe._id}/edit`}>
            <button className="btn" type="button">
              Edit Recipe
            </button>
          </Link>
          <button className="btn" type="button" onClick={handleDeleteRecipe}>
            Delete Recipe
          </button>
        </div>
      ) : null}

      <section className="recipe-shell reviews">
        <h2>Recommended Reviews</h2>
        {averageRating ? (
          <p className="average-rating">
            Average Rating: {averageRating} / 5 ({buildStarText(Math.round(Number(averageRating)))})
          </p>
        ) : (
          <p id="leave-review">No reviews yet. Be the first to leave a review!</p>
        )}
        {user ? (
          <form id="add-review-form" onSubmit={handleReviewSubmit}>
            <div className="star-rating">
              <label htmlFor="rating">Your Rating</label>
              <fieldset id="rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <span key={`star-${value}`} className="star-option">
                    <input
                      type="radio"
                      id={`star${value}`}
                      name="rating"
                      value={String(value)}
                      checked={newReview.rating === value}
                      onChange={() =>
                        setNewReview((current) => ({ ...current, rating: value }))
                      }
                    />
                    <label
                      htmlFor={`star${value}`}
                      className={newReview.rating >= value ? 'active' : ''}
                    >
                      ★
                    </label>
                  </span>
                ))}
              </fieldset>
            </div>
            <textarea
              name="content"
              id="content-textarea"
              placeholder="Tell us what you thought!"
              value={newReview.content}
              onChange={(event) =>
                setNewReview((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
            />
            <button type="submit" className="submit-review-btn">
              Submit Review
            </button>
          </form>
        ) : (
          <p className="review-login-hint">Please log in to leave a review.</p>
        )}
        {recipe.reviews?.length ? (
          <div className="review-cards">
            {recipe.reviews.map((review) => {
              const reviewAuthorId =
                typeof review.author === 'string'
                  ? review.author
                  : review.author?._id
              const isReviewOwner =
                Boolean(userProfileId) && reviewAuthorId === userProfileId

              return (
                <div key={review._id} className="review-card">
                  <header className="review-card-header">
                    <p className="review-author">{review.author?.name || 'Anonymous'}</p>
                    <p className="review-rating">{buildStarText(review.rating)}</p>
                  </header>
                  <p className="review-content">
                    {review.content || 'No written notes provided.'}
                  </p>
                  <p className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                  {isReviewOwner ? (
                    <footer className="review-actions">
                      <Link to={`/recipes/${recipe._id}/reviews/${review._id}/edit`}>
                        <button className="edit-btn" type="button">
                          📝 Edit
                        </button>
                      </Link>
                      <button
                        className="delete-btn"
                        type="button"
                        onClick={() => handleDeleteReview(review._id)}
                      >
                        ️️🗑️ Delete
                      </button>
                    </footer>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export {
  RecipeShowPage,
}
