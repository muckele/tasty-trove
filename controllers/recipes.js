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
    Recipe.findById(req.params.tacoId)
    .populate("owner")
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

export {
    index, 
    newRecipe as new, 
    create, 
    show
}