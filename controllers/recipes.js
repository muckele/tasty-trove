import { Recipe } from '../models/recipe.js'

function index(req, res) {
    Recipe.find({})
    .then(recipes => {
        res.render('recipes/index', {
            recipes,
            title: "All Recipes"
        })
    })
    .catch(err => {
        console.log(err)
        res.redirect("/")
    })
}

function newRecipe(req, res) {
    res.render('recipes/new', {
        title: 'Add Recipe'
    })
}

function create(req, res) {
    req.body.owner = req.user.profile._id
    if (req.body.ingredients) {
        req.body.ingredients = req.body.ingredients.split(', ')
    }
    console.log(req.body)
    Recipe.create(req.body)
    .then(recipe => {
        res.redirect('/recipes')
    })
    .catch(err => {
        console.log(err)
        res.redirect('/recipes')
    })
}

function show(req, res) {
    Recipe.findById(req.params.recipeId)
    .populate([
        {path: "owner"},
        {path: "reviews.author"}
    ])
    .then(recipe => {
        res.render('recipes/show', {
        recipe,
        title: "Recipe Show"
        })
    })
    .catch(err => {
        console.log(err)
        res.redirect('/recipes')
    })
}

function edit(req, res) {
    Recipe.findById(req.params.recipeId)
    .then(recipe => {
        res.render('recipes/edit', {
            recipe,
            title: "Edit Recipe"
        })
    })
    .catch(err => {
        console.log(err)
        res.redirect('/recipes')
    })
}

function update(req, res) {
    Recipe.findByIdAndUpdate(req.params.recipeId, req.body, {new: true})
    .then(recipe => {
        if (recipe.owner.equals(req.user.profile._id)) {
            recipe.updateOne(req.body)
            .then(()=> {
                res.redirect(`/recipes/${recipe._id}`)
            })
        } else {
            throw new Error('🚫 Not authorized 🚫')
        }
    })
    .catch(err => {
        console.log(err)
        res.redirect("/recipes")
    })
}

function deleteRecipe(req, res) {
    Recipe.findById(req.params.recipeId)
    .then(recipe => {
        if (recipe.owner.equals(req.user.profile._id)) {
        recipe.deleteOne()
        .then(() => {
            res.redirect('/recipes')
        })
        } else {
            throw new Error ('🚫 Not authorized 🚫')
        }   
    })
    .catch(err => {
        console.log(err)
        res.redirect('/recipes')
    })
}

function createReview(req, res) {
    Recipe.findById(req.params.recipeId)
    .then(recipe => {
        req.body.author = req.user.profile._id
        const review = {
            content: req.body.content,
            rating: req.body.rating
        }
        recipe.reviews.push(review)
        recipe.save()
        .then(() => {
            res.redirect(`/recipes/${recipe._id}`)
        })
        .catch(err => {
            console.log(err)
            res.redirect('/recipes')
        })
    })
    .catch(err => {
        console.log(err)
        res.redirect('/recipes')
    })
}

export {
    index, 
    newRecipe as new, 
    create, 
    show, 
    edit,
    update,
    deleteRecipe as delete,
    createReview
}