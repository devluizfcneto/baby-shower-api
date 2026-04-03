import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'

import env from '#start/env'

export default class AuthMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const authHeader = request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return response.unauthorized({ message: 'Missing bearer token' })
    }

    const token = authHeader.slice(7)

    try {
      jwt.verify(token, env.get('JWT_SECRET'))
      return next()
    } catch {
      return response.unauthorized({ message: 'Invalid or expired token' })
    }
  }
}
