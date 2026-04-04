import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { ErrorCode } from '#constants/error_code'
import { UnauthorizedException } from '#exceptions/http_exceptions'
import { JwtTokenService } from '#services/jwt_token_service'

interface AuthPayload {
  userId: number
  email: string
}

export default class AuthMiddleware {
  constructor(private readonly jwtTokenService: JwtTokenService = new JwtTokenService()) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedException.single(
        'Token not found or invalid format',
        ErrorCode.MISSING_BEARER_TOKEN,
        'authorization'
      )
    }

    const [, token] = authHeader.split(' ')

    try {
      const payload = this.jwtTokenService.verifyAccessToken(token)
      this.attachUserToContext(ctx, payload)
      return next()
    } catch (error) {
      throw UnauthorizedException.single(
        'Invalid token or session expired',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'authorization'
      )
    }
  }

  private attachUserToContext(ctx: HttpContext, payload: { sub: string; email: string }) {
    const extendedContext = ctx as HttpContext & { authPayload: AuthPayload }

    extendedContext.authPayload = {
      userId: Number(payload.sub),
      email: payload.email,
    }
  }
}
