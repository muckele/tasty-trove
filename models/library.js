import mongoose from 'mongoose'

const Schema = mongoose.Schema

const collectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    recipeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Recipe',
      },
    ],
  },
  {
    timestamps: true,
  }
)

const librarySchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    favoriteRecipeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Recipe',
      },
    ],
    collections: [collectionSchema],
  },
  {
    timestamps: true,
  }
)

const Library = mongoose.model('Library', librarySchema)

export { Library }
