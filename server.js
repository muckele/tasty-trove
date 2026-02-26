import 'dotenv/config.js'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import session from 'express-session'
import logger from 'morgan'
import passport from 'passport'

import './config/database.js'
import './config/passport.js'

import { router as indexRouter } from './routes/index.js'
import { router as authRouter } from './routes/auth.js'
import { router as recipesRouter } from './routes/recipes.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'lax',
    },
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.use('/api', indexRouter)
app.use('/api/recipes', recipesRouter)
app.use('/auth', authRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, 'client', 'dist')
  app.use(express.static(clientDistPath))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next()
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(404).json({ error: 'Not found' })
  }

  return res.status(404).send('Not found')
})

app.use((err, req, res, _next) => {
  console.log(err)

  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
    })
  }

  return res.status(err.status || 500).send(err.message || 'Server error')
})

export {
  app,
}
