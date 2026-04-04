import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'

import { ErrorCode } from '#constants/error_code'
import { UnauthorizedException } from '#exceptions/http_exceptions'
import env from '#start/env'

export default class AuthMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const authHeader = request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw UnauthorizedException.single(
        'Missing bearer token',
        ErrorCode.MISSING_BEARER_TOKEN,
        'authorization'
      )
    }

    const token = authHeader.slice(7)

    try {
      jwt.verify(token, env.get('JWT_SECRET'))
      return next()
    } catch {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'authorization'
      )
    }
  }
}
