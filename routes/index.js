import { Router } from 'express';
import { Recipe } from '../models/recipe.js';

const router = Router();

function getRandomRecipes(recipes, count) {
  const shuffled = recipes.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

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

export {
  router
};
