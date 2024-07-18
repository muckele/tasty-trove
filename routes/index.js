import { Router } from 'express';
import { Recipe } from '../models/recipe.js';

const router = Router();

router.get('/', function (req, res) {
  Recipe.find({})
    .then(recipes => {
      const randomRecipes = getRandomRecipes(recipes, 5); // Select 5 random recipes
      res.render('index', { title: 'Tasty Trove', randomRecipes, user: req.user });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/');
    });
});

router.get('/search', (req, res) => {
  const query = req.query.query;
  Recipe.find({ name: new RegExp(query, 'i') })
    .then(recipes => {
      res.render('recipes/index', { recipes, title: 'Search Results' });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/');
    });
});

function getRandomRecipes(recipes, count) {
  const shuffled = recipes.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export {
  router
};
