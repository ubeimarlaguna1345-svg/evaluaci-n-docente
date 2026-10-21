import express from 'express'
import cors from 'cors'
import { apiRouter } from '../backend/routes/index.js'

export const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    app: 'SIARD-UdeC API (Vercel Serverless)',
    database: 'PostgreSQL',
    status: 'running',
  })
})

app.use('/api', apiRouter)
app.use('/', apiRouter)

export function handleRequest(req, res) {
  if (req.query?.path) {
    const subpath = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : req.query.path
    const queryIndex = req.url.indexOf('?')
    const queryString = queryIndex !== -1 ? req.url.slice(queryIndex) : ''
    req.url = `/${subpath}${queryString}`
  }
  return app(req, res)
}

export default app
