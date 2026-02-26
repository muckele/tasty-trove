const INGREDIENT_HEADER_PATTERNS = [
  /^ingredients?$/i,
  /^ingredients?:$/i,
  /^what you'll need$/i,
  /^what you will need$/i,
]

const INSTRUCTION_HEADER_PATTERNS = [
  /^instructions?$/i,
  /^directions?$/i,
  /^method$/i,
  /^steps?$/i,
  /^preparation$/i,
]

const STOP_HEADER_PATTERNS = [
  /^notes?$/i,
  /^tips?$/i,
  /^nutrition(?: facts?)?$/i,
  /^storage$/i,
  /^serving suggestions?$/i,
]

const WORD_NUMBERS = {
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
}

const ACTION_VERB_PATTERN =
  /^(?:preheat|heat|cook|add|stir|mix|combine|whisk|bake|roast|grill|smoke|bring|reduce|season|serve|rest|slice|remove|drain|simmer|boil|saute|marinate|flip|cover|uncover|transfer)\b/i

const NON_INGREDIENT_HINT_PATTERN =
  /\b(?:temp(?:erature)?|internal|target|ideal|rule of thumb|tip:|tips:|guide|preheat|smoker|setup|resting|timing|doneness|optional reverse-sear|time & temp)\b/i

const DEGREE_PATTERN = /\b\d{2,3}\s*°\s*[fc]?\b|\b\d{2,3}\s*[fc]\b/i

const AMOUNT_TOKEN_PATTERN =
  '\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve'

const INGREDIENT_UNIT_PATTERN =
  'cups?|cup|tablespoons?|tbsp|tbs|teaspoons?|tsp|pounds?|lbs?|lb|ounces?|oz|grams?|g|kilograms?|kgs?|kg|milliliters?|ml|liters?|l|cloves?|cans?|packages?|pkgs?|sticks?|slices?|pinch(?:es)?|dash(?:es)?|sprigs?|bunch(?:es)?|heads?|stalks?|fillets?|pieces?'

const MEASURED_INGREDIENT_PATTERN = new RegExp(
  `^(?:about\\s+|approximately\\s+|around\\s+)?(?:${AMOUNT_TOKEN_PATTERN})(?:\\s*(?:-|to)\\s*(?:${AMOUNT_TOKEN_PATTERN}))?\\s+(?:${INGREDIENT_UNIT_PATTERN})\\b`,
  'i'
)

const UNIT_LESS_INGREDIENT_PATTERN = new RegExp(
  `^(?:about\\s+|approximately\\s+|around\\s+)?(?:${AMOUNT_TOKEN_PATTERN})(?:\\s*(?:-|to)\\s*(?:${AMOUNT_TOKEN_PATTERN}))?\\s+(?:small|medium|large)?\\s*[a-z][a-z\\s\\-']+$`,
  'i'
)

function stripMarkdown(line) {
  return String(line || '')
    .replace(/\r/g, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_`]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim()
}

function normalizeHeader(line) {
  return stripMarkdown(line).replace(/[:\s]+$/g, '').trim()
}

function isMatchingHeader(line, patterns) {
  const header = normalizeHeader(line)
  return patterns.some((pattern) => pattern.test(header))
}

function cleanListLine(line) {
  return stripMarkdown(line)
    .replace(/^\s*[-*+•]\s+/, '')
    .replace(/^\s*\d+\s*[\).:-]\s+/, '')
    .replace(/^\s*step\s*\d+\s*[:.-]?\s*/i, '')
    .trim()
}

function isLikelyInstructionContent(line) {
  const normalized = cleanListLine(line)
  if (!normalized) {
    return false
  }

  if (looksLikeInstructionLine(normalized)) {
    return true
  }

  return ACTION_VERB_PATTERN.test(normalized)
}

function looksLikeIngredientLine(line) {
  const normalized = cleanListLine(line)
  if (!normalized) {
    return false
  }
  const wordCount = normalized.split(/\s+/).length

  if (
    looksLikeMetadataLine(normalized) ||
    isMatchingHeader(normalized, INGREDIENT_HEADER_PATTERNS) ||
    isMatchingHeader(normalized, INSTRUCTION_HEADER_PATTERNS) ||
    isMatchingHeader(normalized, STOP_HEADER_PATTERNS)
  ) {
    return false
  }

  if (looksLikeInstructionLine(normalized) || ACTION_VERB_PATTERN.test(normalized)) {
    return false
  }

  if (
    NON_INGREDIENT_HINT_PATTERN.test(normalized) ||
    DEGREE_PATTERN.test(normalized) ||
    /[→]/.test(normalized)
  ) {
    return false
  }

  if (MEASURED_INGREDIENT_PATTERN.test(normalized) || /^(?:pinch|dash)\b/i.test(normalized)) {
    return true
  }

  if ((/[.!?]/.test(normalized) && wordCount > 6) || wordCount > 10) {
    return false
  }

  if (UNIT_LESS_INGREDIENT_PATTERN.test(normalized) && wordCount <= 6) {
    return true
  }

  if (/\b(?:to taste|for garnish|as needed|optional)\b/i.test(normalized)) {
    return true
  }

  return false
}

function parseDurationToMinutes(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return 0
  }

  const isoMatch = normalized.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  )
  if (isoMatch) {
    const days = Number(isoMatch[1] || 0)
    const hours = Number(isoMatch[2] || 0)
    const minutes = Number(isoMatch[3] || 0)
    const seconds = Number(isoMatch[4] || 0)
    return days * 1440 + hours * 60 + minutes + Math.ceil(seconds / 60)
  }

  let totalMinutes = 0
  const hourMatches = normalized.matchAll(
    /(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|h)\b/gi
  )
  for (const match of hourMatches) {
    totalMinutes += Math.round(Number(match[1]) * 60)
  }

  const minuteMatches = normalized.matchAll(
    /(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|m)\b/gi
  )
  for (const match of minuteMatches) {
    totalMinutes += Math.round(Number(match[1]))
  }

  if (totalMinutes > 0) {
    return totalMinutes
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized)
  }

  return 0
}

function parseServings(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }

  const digitMatch = normalized.match(/(\d+(?:\.\d+)?)/)
  if (digitMatch) {
    return digitMatch[1]
  }

  const lowered = normalized.toLowerCase()
  const wordMatch = Object.entries(WORD_NUMBERS).find(([word]) =>
    lowered.includes(word)
  )
  if (wordMatch) {
    return String(wordMatch[1])
  }

  return normalized
}

function unique(values) {
  const seen = new Set()
  const output = []

  values.forEach((value) => {
    const normalized = String(value || '').trim()
    if (!normalized) {
      return
    }

    if (seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    output.push(normalized)
  })

  return output
}

function findHeaderIndex(lines, patterns) {
  return lines.findIndex((line) => isMatchingHeader(line, patterns))
}

function looksLikeMetadataLine(line) {
  const normalized = stripMarkdown(line)
  return /^(prep(?:aration)? time|cook time|total time|servings?|yields?)\s*:/i.test(
    normalized
  )
}

function extractSection(lines, startIndex, endIndex) {
  if (startIndex < 0) {
    return []
  }

  const sectionLines = lines.slice(startIndex + 1, endIndex >= 0 ? endIndex : undefined)
  const cleaned = sectionLines
    .map(cleanListLine)
    .filter(Boolean)
    .filter((line) => !isMatchingHeader(line, STOP_HEADER_PATTERNS))

  return unique(cleaned)
}

function extractIngredientSection(lines, startIndex, endIndex) {
  const sectionLines = extractSection(lines, startIndex, endIndex)
  if (!sectionLines.length) {
    return []
  }

  const filtered = sectionLines.filter((line) => {
    if (looksLikeIngredientLine(line)) {
      return true
    }

    return !isLikelyInstructionContent(line) && !NON_INGREDIENT_HINT_PATTERN.test(line)
  })

  return unique(filtered)
}

function extractFallbackIngredients(lines) {
  const candidates = lines
    .map(stripMarkdown)
    .filter(Boolean)
    .filter((line) => looksLikeIngredientLine(line))
    .map(cleanListLine)

  return unique(candidates)
}

function looksLikeInstructionLine(line) {
  const normalized = stripMarkdown(line)
  return (
    /^(?:step\s*)?\d+\s*[\).:-]\s*/i.test(normalized) ||
    /^step\s*\d+\s*[:.-]?\s*/i.test(normalized)
  )
}

function extractFallbackInstructions(lines) {
  const numbered = lines
    .map(stripMarkdown)
    .filter((line) => looksLikeInstructionLine(line))
    .map(cleanListLine)

  if (numbered.length) {
    return unique(numbered)
  }

  const bulletSteps = lines
    .filter((line) => /^\s*[-*+•]\s+/.test(String(line || '')))
    .map(cleanListLine)
    .filter(Boolean)
    .filter((line) => !looksLikeIngredientLine(line))
    .filter((line) => isLikelyInstructionContent(line))

  if (bulletSteps.length) {
    return unique(bulletSteps)
  }

  const lineBased = lines
    .map(cleanListLine)
    .filter(Boolean)
    .filter((line) => !looksLikeMetadataLine(line))
    .filter((line) => !isMatchingHeader(line, INGREDIENT_HEADER_PATTERNS))
    .filter((line) => !isMatchingHeader(line, INSTRUCTION_HEADER_PATTERNS))
    .filter((line) => !isMatchingHeader(line, STOP_HEADER_PATTERNS))
    .filter((line) => !looksLikeIngredientLine(line))
    .filter((line) => isLikelyInstructionContent(line))

  if (lineBased.length) {
    return unique(lineBased)
  }

  const paragraph = lines
    .map(stripMarkdown)
    .filter(Boolean)
    .join(' ')
  const sentenceSplit = paragraph
    .split(/(?<=[.!?])\s+|(?<=:)\s+(?=[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8)
    .filter((sentence) => !looksLikeIngredientLine(sentence))
    .slice(0, 10)

  return unique(sentenceSplit)
}

function findFirstImageUrl(text) {
  const match = String(text || '').match(
    /https?:\/\/[^\s)]+?\.(?:png|jpe?g|webp|gif)/i
  )
  return match ? match[0] : ''
}

function makeStockImageUrl(recipeName) {
  const tags = String(recipeName || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.slice(0, 3)
    .join(',')

  const query = tags ? `food,${tags}` : 'food'
  return `https://loremflickr.com/1200/900/${query}`
}

function getTitle(lines) {
  const explicitTitleLine = lines
    .map(stripMarkdown)
    .find((line) => /^title\s*:/i.test(line))
  if (explicitTitleLine) {
    return explicitTitleLine.replace(/^title\s*:\s*/i, '').trim()
  }

  const firstMeaningfulLine = lines
    .map(stripMarkdown)
    .find(
      (line) =>
        line &&
        !looksLikeMetadataLine(line) &&
        !isMatchingHeader(line, INGREDIENT_HEADER_PATTERNS) &&
        !isMatchingHeader(line, INSTRUCTION_HEADER_PATTERNS)
    )

  return firstMeaningfulLine || 'Imported Recipe'
}

function getDescription(lines, title, firstHeaderIndex) {
  const titleNormalized = title.trim().toLowerCase()
  const candidateLines = lines
    .slice(0, firstHeaderIndex >= 0 ? firstHeaderIndex : lines.length)
    .map(stripMarkdown)
    .filter(Boolean)
    .filter((line) => line.trim().toLowerCase() !== titleNormalized)
    .filter((line) => !looksLikeMetadataLine(line))

  return candidateLines.slice(0, 2).join(' ').trim()
}

function parseRecipeFromText(rawText) {
  const text = String(rawText || '').trim()
  if (!text) {
    throw new Error('Please paste a recipe to import.')
  }

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\u00A0/g, ' ').trim())
    .filter((line) => line && !/^```/.test(line))

  if (!lines.length) {
    throw new Error('Unable to parse recipe text.')
  }

  const title = getTitle(lines)

  let prepTime = 0
  let cookTime = 0
  let totalTime = 0
  let servings = ''

  lines.forEach((line) => {
    const normalized = stripMarkdown(line)
    const prepMatch = normalized.match(/^prep(?:aration)? time\s*:\s*(.+)$/i)
    if (prepMatch) {
      prepTime = parseDurationToMinutes(prepMatch[1])
    }

    const cookMatch = normalized.match(/^cook time\s*:\s*(.+)$/i)
    if (cookMatch) {
      cookTime = parseDurationToMinutes(cookMatch[1])
    }

    const totalMatch = normalized.match(/^total time\s*:\s*(.+)$/i)
    if (totalMatch) {
      totalTime = parseDurationToMinutes(totalMatch[1])
    }

    const servingsMatch = normalized.match(/^(servings?|yields?)\s*:\s*(.+)$/i)
    if (servingsMatch) {
      servings = parseServings(servingsMatch[2])
    }
  })

  if (!totalTime && (prepTime || cookTime)) {
    totalTime = prepTime + cookTime
  }

  const ingredientsHeaderIndex = findHeaderIndex(lines, INGREDIENT_HEADER_PATTERNS)
  const instructionHeaderIndex = findHeaderIndex(lines, INSTRUCTION_HEADER_PATTERNS)
  const stopHeaderIndex = findHeaderIndex(lines, STOP_HEADER_PATTERNS)
  const firstStepInstructionIndex = lines.findIndex((line) =>
    looksLikeInstructionLine(line)
  )

  const firstHeaderIndex = [ingredientsHeaderIndex, instructionHeaderIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0]

  const sectionBoundaryIndexes = [
    instructionHeaderIndex > ingredientsHeaderIndex ? instructionHeaderIndex : -1,
    firstStepInstructionIndex > ingredientsHeaderIndex ? firstStepInstructionIndex : -1,
    stopHeaderIndex,
  ].filter((index) => index >= 0)
  const ingredientsEndIndex = sectionBoundaryIndexes.length
    ? Math.min(...sectionBoundaryIndexes)
    : -1
  const ingredients = ingredientsHeaderIndex >= 0
    ? extractIngredientSection(lines, ingredientsHeaderIndex, ingredientsEndIndex)
    : extractFallbackIngredients(lines)

  const instructionsEndIndex = stopHeaderIndex
  const preparation = instructionHeaderIndex >= 0
    ? extractSection(lines, instructionHeaderIndex, instructionsEndIndex)
    : extractFallbackInstructions(lines)

  if (!ingredients.length) {
    throw new Error('Could not find ingredients in the pasted recipe text.')
  }

  if (!preparation.length) {
    throw new Error('Could not find preparation steps in the pasted recipe text.')
  }

  const imageUrl = findFirstImageUrl(text) || makeStockImageUrl(title)
  const description = getDescription(lines, title, firstHeaderIndex)

  return {
    name: title,
    description,
    servings,
    imageUrl,
    totalTime,
    prepTime,
    cookTime,
    ingredients,
    preparation,
  }
}

export {
  parseRecipeFromText,
}
