import mongoose from 'mongoose'

const Schema = mongoose.Schema

const recipeSchema = new Schema({
    name: String,
    imageUrl: String,
    totalTime: Number,
    prepTime: Number,
    cookTime: Number,
    ingredients: [String],
    preparation: [String],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "Profile"
    }
}, {
    timestamps: true
})

const Recipe = mongoose.model('Recipe', recipeSchema)

export {
    Recipe
}