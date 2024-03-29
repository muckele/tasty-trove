import mongoose from 'mongoose'

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