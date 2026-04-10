import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { ErrorCode } from '#constants/error_code'
import { UnauthorizedException } from '#exceptions/http_exceptions'
import { AuthService } from '#services/auth_service'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { logoutSessionValidator, refreshSessionValidator } from '#validators/auth_session_validator'

type AuthPayload = {
  userId: number
  email: string
}

@inject()
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register({ request, response }: HttpContext) {
    const { name, email, password } = await registerValidator.validate(request.all())
    const result = await this.authService.register({ name, email, password })

    return response.created(result)
  }

  async login(ctx: HttpContext) {
    const { request, response } = ctx
    const { email, password } = await loginValidator.validate(request.all())
    const result = await this.authService.login(
      { email, password },
      {
        userAgent: request.header('user-agent') ?? null,
        ipAddress: request.ip(),
      }
    )

    return response.ok(result)
  }

  async show(ctx: HttpContext) {
    const authPayload = (ctx as HttpContext & { authPayload?: AuthPayload }).authPayload

    if (!authPayload) {
      throw UnauthorizedException.single(
        'Missing authentication context',
        ErrorCode.UNAUTHORIZED,
        'authorization'
      )
    }

    const result = await this.authService.getAuthenticatedUser(authPayload.userId)
    return ctx.response.ok(result)
  }

  async refresh(ctx: HttpContext) {
    const { refreshToken } = await refreshSessionValidator.validate(ctx.request.all())
    const result = await this.authService.refresh(refreshToken)

    return ctx.response.ok(result)
  }

  async logout(ctx: HttpContext) {
    const { refreshToken } = await logoutSessionValidator.validate(ctx.request.all())

    const authPayload = (ctx as HttpContext & { authPayload?: AuthPayload }).authPayload
    if (!authPayload) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    await this.authService.logout(authPayload.userId, refreshToken)

    return ctx.response.ok({ message: 'Session revoked successfully' })
  }

  async logoutAll(ctx: HttpContext) {
    const authPayload = (ctx as HttpContext & { authPayload?: AuthPayload }).authPayload

    if (!authPayload) {
      throw UnauthorizedException.single(
        'Missing authentication context',
        ErrorCode.UNAUTHORIZED,
        'authorization'
      )
    }

    await this.authService.logoutAll(authPayload.userId)

    return ctx.response.ok({ message: 'All sessions revoked successfully' })
  }
}
