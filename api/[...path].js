import app, { handleRequest } from './app.js'

export default function handler(req, res) {
  return handleRequest(req, res)
}
