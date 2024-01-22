import { Recipe } from '../models/recipe.js'

function index(req, res) {
    Recipe.find({})
    .then(recipe => {
        res.render('recipes/index', {
            recipes,
            title: "Recipes"
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
    if (req.body.ingredients) {
        req.body.ingredients = req.body.ingredients.split(', ')
    }
    Recipe.create(req.body)
    .then(recipe => {
        res.redirect('/recipes/new')
    })
    .catch(err => {
        console.log(err)
        res.redirect("/recipes.new")
    })
}

export {
    index, 
    newRecipe as new, 
    create
}