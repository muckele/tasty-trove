import mongoose from 'mongoose'
import {
    MEAL_CATEGORY_OPTIONS,
    CUISINE_TYPE_OPTIONS
} from '../services/recipeClassification.js'

const Schema = mongoose.Schema

const reviewSchema = new Schema({
    content: String,
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "Profile"
    }
}, {
    timestamps: true
})

const recipeSchema = new Schema({
    name: String,
    description: String,
    sourceUrl: String,
    servings: String,
    mealCategory: {
        type: String,
        enum: MEAL_CATEGORY_OPTIONS,
        default: 'other',
        index: true
    },
    cuisineType: {
        type: String,
        enum: CUISINE_TYPE_OPTIONS,
        default: 'other',
        index: true
    },
    imageUrl: String,
    totalTime: Number,
    prepTime: Number,
    cookTime: Number,
    ingredients: [String],
    preparation: [String],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "Profile"
    },
    reviews: [reviewSchema]
}, {
    timestamps: true
})


const Recipe = mongoose.model('Recipe', recipeSchema)

export {
    Recipe
}
