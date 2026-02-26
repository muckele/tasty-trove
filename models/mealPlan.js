import mongoose from 'mongoose'

const Schema = mongoose.Schema

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

const mealPlanEntrySchema = new Schema(
  {
    dateKey: {
      type: String,
      required: true,
    },
    slot: {
      type: String,
      enum: MEAL_SLOTS,
      required: true,
    },
    recipe: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
  },
  { _id: true }
)

const mealPlanSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    weekStart: {
      type: String,
      required: true,
    },
    entries: [mealPlanEntrySchema],
  },
  {
    timestamps: true,
  }
)

mealPlanSchema.index({ owner: 1, weekStart: 1 }, { unique: true })

const MealPlan = mongoose.model('MealPlan', mealPlanSchema)

export { MealPlan, MEAL_SLOTS }
