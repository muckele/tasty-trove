import 'dotenv/config.js'
import mongoose from 'mongoose'
import '../config/database.js'
import { Recipe } from '../models/recipe.js'
import {
  classifyRecipeMetadata,
  normalizeMealCategory,
  normalizeCuisineType,
} from '../services/recipeClassification.js'

async function reclassifyRecipes() {
  const recipes = await Recipe.find({})
  let updatedCount = 0

  for (const recipe of recipes) {
    const classified = classifyRecipeMetadata(recipe)
    const currentMealCategory = normalizeMealCategory(recipe.mealCategory) || 'other'
    const currentCuisineType = normalizeCuisineType(recipe.cuisineType) || 'other'

    if (
      currentMealCategory === classified.mealCategory &&
      currentCuisineType === classified.cuisineType
    ) {
      continue
    }

    recipe.mealCategory = classified.mealCategory
    recipe.cuisineType = classified.cuisineType
    await recipe.save()
    updatedCount += 1
  }

  console.log(
    `Reclassified ${updatedCount} recipes out of ${recipes.length} total recipes.`
  )
}

reclassifyRecipes()
  .then(async () => {
    await mongoose.connection.close()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await mongoose.connection.close()
    process.exit(1)
  })
