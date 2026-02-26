import mongoose from 'mongoose'
import {
  MEAL_CATEGORY_OPTIONS,
  CUISINE_TYPE_OPTIONS,
} from '../services/recipeClassification.js'
import {
  DIETARY_TAG_OPTIONS,
  ALLERGEN_TAG_OPTIONS,
} from '../services/recipeTagging.js'

const Schema = mongoose.Schema

const reviewSchema = new Schema(
  {
    content: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
    },
  },
  {
    timestamps: true,
  }
)

const ownerNoteSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const versionSnapshotSchema = new Schema(
  {
    name: String,
    description: String,
    sourceUrl: String,
    servings: String,
    imageUrl: String,
    totalTime: Number,
    prepTime: Number,
    cookTime: Number,
    mealCategory: {
      type: String,
      enum: MEAL_CATEGORY_OPTIONS,
      default: 'other',
    },
    cuisineType: {
      type: String,
      enum: CUISINE_TYPE_OPTIONS,
      default: 'other',
    },
    dietaryTags: [
      {
        type: String,
        enum: DIETARY_TAG_OPTIONS,
      },
    ],
    allergenTags: [
      {
        type: String,
        enum: ALLERGEN_TAG_OPTIONS,
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    shareToken: String,
    ingredients: [String],
    preparation: [String],
  },
  { _id: false }
)

const versionSchema = new Schema(
  {
    snapshot: versionSnapshotSchema,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

const recipeSchema = new Schema(
  {
    name: String,
    description: String,
    sourceUrl: String,
    servings: String,
    mealCategory: {
      type: String,
      enum: MEAL_CATEGORY_OPTIONS,
      default: 'other',
      index: true,
    },
    cuisineType: {
      type: String,
      enum: CUISINE_TYPE_OPTIONS,
      default: 'other',
      index: true,
    },
    dietaryTags: [
      {
        type: String,
        enum: DIETARY_TAG_OPTIONS,
        index: true,
      },
    ],
    allergenTags: [
      {
        type: String,
        enum: ALLERGEN_TAG_OPTIONS,
        index: true,
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    shareToken: {
      type: String,
      default: '',
      index: true,
    },
    imageUrl: String,
    totalTime: Number,
    prepTime: Number,
    cookTime: Number,
    ingredients: [String],
    preparation: [String],
    ownerNotes: [ownerNoteSchema],
    versions: [versionSchema],
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
    },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
)

recipeSchema.index({ owner: 1, sourceUrl: 1 })
recipeSchema.index({ owner: 1, name: 1 })

const Recipe = mongoose.model('Recipe', recipeSchema)

export { Recipe }
