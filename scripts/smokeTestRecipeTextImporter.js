import { parseRecipeFromText } from '../services/recipeTextImporter.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function run() {
  {
    const result = parseRecipeFromText(`
Chicken Soup
Ingredients:
1 cup broth
Step 1: Heat broth
Step 2: Serve
`)

    assert(result.ingredients.length === 1, 'Ingredients should not include step lines')
    assert(result.ingredients[0] === '1 cup broth', 'Ingredient parsing failed')
    assert(
      result.preparation.length === 2 &&
        result.preparation[0] === 'Heat broth' &&
        result.preparation[1] === 'Serve',
      'Step lines should parse into preparation steps'
    )
  }

  {
    const result = parseRecipeFromText(`
Simple Pasta
Ingredients:
- 1 cup water
- 1 tsp salt
Instructions:
1) Boil water.
2) Add salt.
`)

    assert(result.ingredients.length === 2, 'Bullet ingredients should parse correctly')
    assert(result.preparation.length === 2, 'Numbered instructions should parse correctly')
  }

  {
    let threw = false
    try {
      parseRecipeFromText('   ')
    } catch (err) {
      threw = /Please paste a recipe/i.test(String(err.message || ''))
    }

    assert(threw, 'Empty text should raise expected validation error')
  }

  console.log('Recipe text importer smoke tests passed.')
}

run()
