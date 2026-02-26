import { Router } from 'express'
import passport from 'passport'

const router = Router()

router.post(
  '/google',
  passport.authenticate('google-one-tap', {
    failureRedirect: '/',
    successRedirect: '/',
  })
)

router.get('/session', (req, res) => {
  if (!req.user) {
    return res.json({
      user: null,
      googleClientID: process.env.GOOGLE_CLIENT_ID,
    })
  }

  return res.json({
    user: {
      _id: req.user._id,
      email: req.user.email,
      profile: req.user.profile,
    },
    googleClientID: process.env.GOOGLE_CLIENT_ID,
  })
})

router.post('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }

    req.session.destroy(() => {
      res.status(204).end()
    })
  })
})

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }

    res.redirect('/')
  })
})

export {
  router
}
