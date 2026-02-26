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
    const result = parseRecipeFromText(`
## Garlic Butter Pasta
Servings: 2
Prep Time: 10 minutes
Cook Time: 15 minutes

### Ingredients
- 8 oz spaghetti
- 2 tbsp butter
- 3 cloves garlic, minced
- Salt and pepper to taste

### Directions
- Boil pasta in salted water until al dente.
- Melt butter and cook garlic for 30 seconds.
- Toss pasta with garlic butter and season to taste.
`)

    assert(result.ingredients.length >= 3, 'ChatGPT-style ingredient bullets should parse')
    assert(
      result.preparation.length >= 2,
      'ChatGPT-style bullet directions should parse into preparation steps'
    )
  }

  {
    const result = parseRecipeFromText(`
Quick Eggs
2 eggs
1 tbsp butter
Heat a nonstick pan over medium heat.
Add butter and let it melt.
Cook eggs until set.
`)

    assert(
      result.ingredients.includes('2 eggs') && result.ingredients.includes('1 tbsp butter'),
      'Fallback should parse unitless and measured ingredient lines'
    )
    assert(result.preparation.length >= 2, 'Fallback should parse instruction-style lines')
  }

  {
    let threw = false
    try {
      parseRecipeFromText(`
Smoked Tri-Tip: Time & Temp Guide

A typical 2-3 lb tri-tip usually lands right in that window.
125°F = rare
130-135°F = medium-rare
140°F = medium

Rule of thumb: ~30-40 minutes per pound.
`)
    } catch (err) {
      threw = /Could not find ingredients/i.test(String(err.message || ''))
    }

    assert(
      threw,
      'Non-recipe guides should not parse as valid ingredient lists'
    )
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
