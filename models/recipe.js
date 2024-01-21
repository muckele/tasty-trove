import mongoose from "mongoose"

const Schema = mongoose.Schema

const recipeSchema = newSchema({
    title: String,
    imageUrl: String,
    ingredients: String,
    preparation: String,
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