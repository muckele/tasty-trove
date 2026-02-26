import dns from 'node:dns/promises'
import net from 'node:net'

const REQUEST_HEADERS = {
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (compatible; TastyTroveBot/1.0; +https://tasty-trove.fly.dev)',
}

function cleanString(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim()
}

function parseDurationToMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  const duration = cleanString(String(value || ''))
  if (!duration) {
    return 0
  }

  const isoMatch = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  )
  if (isoMatch) {
    const days = Number(isoMatch[1] || 0)
    const hours = Number(isoMatch[2] || 0)
    const minutes = Number(isoMatch[3] || 0)
    const seconds = Number(isoMatch[4] || 0)
    return Math.max(0, days * 1440 + hours * 60 + minutes + Math.ceil(seconds / 60))
  }

  let totalMinutes = 0
  const hourMatches = duration.matchAll(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|h)\b/gi)
  for (const match of hourMatches) {
    totalMinutes += Math.round(Number(match[1]) * 60)
  }

  const minuteMatches = duration.matchAll(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|m)\b/gi)
  for (const match of minuteMatches) {
    totalMinutes += Math.round(Number(match[1]))
  }

  if (totalMinutes > 0) {
    return totalMinutes
  }

  if (/^\d+$/.test(duration)) {
    return Number(duration)
  }

  return 0
}

function parseImageUrl(imageValue) {
  if (!imageValue) {
    return ''
  }

  if (typeof imageValue === 'string') {
    return cleanString(imageValue)
  }

  if (Array.isArray(imageValue)) {
    for (const item of imageValue) {
      const parsed = parseImageUrl(item)
      if (parsed) {
        return parsed
      }
    }
    return ''
  }

  if (typeof imageValue === 'object') {
    return (
      cleanString(imageValue.url) ||
      cleanString(imageValue.contentUrl) ||
      cleanString(imageValue.thumbnailUrl) ||
      ''
    )
  }

  return ''
}

function splitInstructionText(text) {
  const normalized = cleanString(text)
  if (!normalized) {
    return []
  }

  const lineSplit = normalized
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)

  if (lineSplit.length > 1) {
    return lineSplit
  }

  if (normalized.length > 160 && normalized.includes('. ')) {
    return normalized
      .split(/\.(?=\s+[A-Z])/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.endsWith('.') ? line : `${line}.`))
  }

  return [normalized]
}

function uniqueStrings(values) {
  const seen = new Set()
  const results = []

  values.forEach((value) => {
    const normalized = cleanString(value)
    if (!normalized) {
      return
    }

    if (seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    results.push(normalized)
  })

  return results
}

function collectIngredients(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    const values = value.flatMap((item) => collectIngredients(item))
    return uniqueStrings(values)
  }

  if (typeof value === 'string') {
    return uniqueStrings([value])
  }

  if (typeof value === 'object') {
    return uniqueStrings([value.text, value.name].filter(Boolean))
  }

  return []
}

function collectInstructions(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap((item) => collectInstructions(item)))
  }

  if (typeof value === 'string') {
    return uniqueStrings(splitInstructionText(value))
  }

  if (typeof value === 'object') {
    const nested = []
    if (value.text) {
      nested.push(...collectInstructions(value.text))
    }

    if (Array.isArray(value.itemListElement)) {
      nested.push(...collectInstructions(value.itemListElement))
    }

    if (Array.isArray(value.steps)) {
      nested.push(...collectInstructions(value.steps))
    }

    return uniqueStrings(nested)
  }

  return []
}

function isRecipeType(typeValue) {
  if (!typeValue) {
    return false
  }

  if (typeof typeValue === 'string') {
    const normalizedType = typeValue.toLowerCase()
    return (
      normalizedType === 'recipe' ||
      normalizedType.endsWith('/recipe') ||
      normalizedType.endsWith(':recipe')
    )
  }

  if (Array.isArray(typeValue)) {
    return typeValue.some((entry) => isRecipeType(entry))
  }

  return false
}

function safeParseJson(value) {
  const normalized = String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/^\s*<!--/, '')
    .replace(/-->\s*$/, '')
    .trim()

  if (!normalized) {
    return null
  }

  try {
    return JSON.parse(normalized)
  } catch (_err) {
    return null
  }
}

function extractJsonLdBlocks(html) {
  const blocks = []
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi

  let match = scriptRegex.exec(html)
  while (match) {
    blocks.push(match[1])
    match = scriptRegex.exec(html)
  }

  return blocks
}

function collectRecipeNodes(node, results = []) {
  if (!node) {
    return results
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectRecipeNodes(item, results))
    return results
  }

  if (typeof node !== 'object') {
    return results
  }

  if (isRecipeType(node['@type'])) {
    results.push(node)
  }

  Object.values(node).forEach((value) => collectRecipeNodes(value, results))
  return results
}

function scoreRecipeNode(node) {
  const ingredientsScore = collectIngredients(
    node.recipeIngredient || node.ingredients
  ).length
  const instructionsScore = collectInstructions(node.recipeInstructions).length
  const imageScore = parseImageUrl(node.image) ? 1 : 0

  return ingredientsScore * 3 + instructionsScore * 3 + imageScore
}

function parseTagAttributes(tag) {
  const attributes = {}
  const attrRegex = /([:@\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g
  let match = attrRegex.exec(tag)

  while (match) {
    const name = String(match[1] || '').toLowerCase()
    const value = match[3] ?? match[4] ?? ''
    attributes[name] = decodeHtmlEntities(value)
    match = attrRegex.exec(tag)
  }

  return attributes
}

function extractMetaContent(html, keyName, keyValue) {
  const metaRegex = /<meta\s+[^>]*>/gi
  let match = metaRegex.exec(html)

  while (match) {
    const attributes = parseTagAttributes(match[0])
    if (
      String(attributes[keyName] || '').toLowerCase() === keyValue.toLowerCase() &&
      attributes.content
    ) {
      return attributes.content
    }

    match = metaRegex.exec(html)
  }

  return ''
}

function extractHtmlTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!titleMatch) {
    return ''
  }

  return decodeHtmlEntities(titleMatch[1])
}

function normalizeRecipeData(recipeNode, sourceUrl, html) {
  const prepTime = parseDurationToMinutes(recipeNode.prepTime)
  const cookTime = parseDurationToMinutes(recipeNode.cookTime)
  const totalTimeFromNode = parseDurationToMinutes(recipeNode.totalTime)

  const totalTime =
    totalTimeFromNode || (prepTime || cookTime ? prepTime + cookTime : 0)

  const sourceCandidate =
    cleanString(recipeNode.url) ||
    cleanString(
      typeof recipeNode.mainEntityOfPage === 'string'
        ? recipeNode.mainEntityOfPage
        : ''
    ) ||
    cleanString(recipeNode.mainEntityOfPage?.['@id']) ||
    cleanString(recipeNode.mainEntityOfPage?.url) ||
    sourceUrl

  const description =
    cleanString(recipeNode.description) ||
    extractMetaContent(html, 'property', 'og:description') ||
    extractMetaContent(html, 'name', 'description')

  const servingsValue = Array.isArray(recipeNode.recipeYield)
    ? recipeNode.recipeYield[0]
    : recipeNode.recipeYield

  const servings = cleanString(servingsValue)

  return {
    name:
      cleanString(recipeNode.name) ||
      extractMetaContent(html, 'property', 'og:title') ||
      extractHtmlTitle(html),
    description,
    sourceUrl: sourceCandidate,
    servings,
    imageUrl:
      parseImageUrl(recipeNode.image) ||
      extractMetaContent(html, 'property', 'og:image'),
    prepTime,
    cookTime,
    totalTime,
    ingredients: collectIngredients(recipeNode.recipeIngredient || recipeNode.ingredients),
    preparation: collectInstructions(recipeNode.recipeInstructions),
  }
}

function isPrivateIPv4Address(address) {
  const octets = address.split('.').map((entry) => Number(entry))
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return false
  }

  const [a, b] = octets
  if (a === 10 || a === 127 || a === 0) {
    return true
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }

  if (a === 192 && b === 168) {
    return true
  }

  if (a === 169 && b === 254) {
    return true
  }

  if (a === 100 && b >= 64 && b <= 127) {
    return true
  }

  return false
}

function isPrivateIPv6Address(address) {
  const normalized = address.toLowerCase()

  if (normalized === '::1') {
    return true
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true
  }

  if (normalized.startsWith('fe80:')) {
    return true
  }

  if (normalized.startsWith('::ffff:')) {
    const potentialIPv4 = normalized.split(':').pop()
    if (potentialIPv4 && net.isIPv4(potentialIPv4)) {
      return isPrivateIPv4Address(potentialIPv4)
    }
  }

  return false
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    return isPrivateIPv4Address(address)
  }

  if (net.isIPv6(address)) {
    return isPrivateIPv6Address(address)
  }

  return false
}

async function assertSafeExternalUrl(rawUrl) {
  const normalizedInput = cleanString(rawUrl)
  if (!normalizedInput) {
    throw new Error('Please provide a recipe URL.')
  }

  let parsed
  try {
    parsed = new URL(normalizedInput)
  } catch (_err) {
    throw new Error('Please provide a valid URL.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https recipe URLs are supported.')
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with credentials are not allowed.')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Local network URLs are not allowed.')
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error('Private network URLs are not allowed.')
    }
    return parsed
  }

  let records
  try {
    records = await dns.lookup(hostname, { all: true })
  } catch (_err) {
    throw new Error('Unable to resolve that recipe URL hostname.')
  }

  if (!records.length) {
    throw new Error('Unable to resolve that recipe URL hostname.')
  }

  if (records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('Private network URLs are not allowed.')
  }

  return parsed
}

async function scrapeRecipeFromUrl(rawUrl) {
  const url = await assertSafeExternalUrl(rawUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  let response
  try {
    response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Fetching recipe URL timed out.')
    }
    throw new Error('Unable to fetch recipe URL.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`Recipe URL returned status ${response.status}.`)
  }

  const contentType = String(response.headers.get('content-type') || '')
  if (!contentType.toLowerCase().includes('text/html')) {
    throw new Error('Recipe URL did not return an HTML page.')
  }

  const html = await response.text()
  const recipeNodes = []

  extractJsonLdBlocks(html).forEach((block) => {
    const parsedBlock = safeParseJson(block)
    if (parsedBlock) {
      collectRecipeNodes(parsedBlock, recipeNodes)
    }
  })

  if (!recipeNodes.length) {
    throw new Error('Could not find a recipe schema on that page.')
  }

  const bestRecipeNode = [...recipeNodes].sort(
    (left, right) => scoreRecipeNode(right) - scoreRecipeNode(left)
  )[0]

  const recipeData = normalizeRecipeData(bestRecipeNode, url.toString(), html)

  if (!recipeData.name) {
    throw new Error('Could not determine the recipe name from that URL.')
  }

  if (!recipeData.ingredients.length) {
    throw new Error('Could not find ingredients at that URL.')
  }

  if (!recipeData.preparation.length) {
    throw new Error('Could not find preparation steps at that URL.')
  }

  return recipeData
}

export {
  scrapeRecipeFromUrl,
}
