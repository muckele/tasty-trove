import mongoose from 'mongoose'

const Schema = mongoose.Schema

const groceryPreferencesSchema = new Schema(
  {
    weightUnit: {
      type: String,
      enum: ['lb', 'kg'],
      default: 'lb',
    },
    volumeUnit: {
      type: String,
      enum: ['cup', 'ml'],
      default: 'cup',
    },
  },
  { _id: false }
)

const profileSchema = new Schema({
  name: String,
  avatar: String,
  groceryPreferences: {
    type: groceryPreferencesSchema,
    default: () => ({
      weightUnit: 'lb',
      volumeUnit: 'cup',
    }),
  },
}, {
  timestamps: true
})

const Profile = mongoose.model('Profile', profileSchema)

export {
  Profile
}
