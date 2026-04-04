import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'

import { ErrorCode } from '#constants/error_code'
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '#exceptions/http_exceptions'
import { AppDataSource } from '#services/database_service'
import { JwtTokenService } from '#services/jwt_token_service'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { logoutSessionValidator, refreshSessionValidator } from '#validators/auth_session_validator'
import { UserSessionService } from '#services/user_session_service'

import { User } from '../entities/user.js'

type AuthPayload = {
  userId: number
  email: string
}

export default class AuthController {
  constructor(
    private readonly jwtTokenService: JwtTokenService = new JwtTokenService(),
    private readonly userSessionService: UserSessionService = new UserSessionService()
  ) {}

  async register({ request, response }: HttpContext) {
    const { name, email, password } = await registerValidator.validate(request.all())

    const userRepository = AppDataSource.getRepository(User)
    const existingUser = await userRepository.findOne({ where: { email } })

    if (existingUser) {
      throw ConflictException.single(
        'Email already in use',
        ErrorCode.EMAIL_ALREADY_IN_USE,
        'email'
      )
    }

    const hashedPassword = await hash.make(password)
    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
    })

    await userRepository.save(user)

    return response.created({
      user: this.toPublicUser(user),
    })
  }

  async login(ctx: HttpContext) {
    const { request, response } = ctx
    const { email, password } = await loginValidator.validate(request.all())

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne()

    if (!user) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    const passwordMatches = await hash.verify(user.password, password)

    if (!passwordMatches) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    const tokens = await this.issueSessionTokens(user, ctx)

    return response.ok({ user: this.toPublicUser(user), ...tokens })
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

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: authPayload.userId } })

    if (!user) {
      throw NotFoundException.single('User not found', ErrorCode.USER_NOT_FOUND)
    }

    return ctx.response.ok({ user: this.toPublicUser(user) })
  }

  async refresh(ctx: HttpContext) {
    const { refreshToken } = await refreshSessionValidator.validate(ctx.request.all())

    let payload: ReturnType<JwtTokenService['verifyRefreshToken']>
    try {
      payload = this.jwtTokenService.verifyRefreshToken(refreshToken)
    } catch {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'refreshToken'
      )
    }

    const session = await this.userSessionService.verifySession(payload.sid, refreshToken)

    if (!session) {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'refreshToken'
      )
    }

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: Number(payload.sub) } })

    if (!user) {
      throw NotFoundException.single('User not found', ErrorCode.USER_NOT_FOUND)
    }

    const accessToken = this.jwtTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    })

    return ctx.response.ok({ accessToken })
  }

  async logout(ctx: HttpContext) {
    const { refreshToken } = await logoutSessionValidator.validate(ctx.request.all())

    let payload: ReturnType<JwtTokenService['verifyRefreshToken']>
    try {
      payload = this.jwtTokenService.verifyRefreshToken(refreshToken)
    } catch {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'refreshToken'
      )
    }

    const authPayload = (ctx as HttpContext & { authPayload?: AuthPayload }).authPayload
    if (!authPayload || authPayload.userId !== Number(payload.sub)) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    await this.userSessionService.revokeSession(payload.sid)

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

    await this.userSessionService.revokeAllUserSessions(authPayload.userId)

    return ctx.response.ok({ message: 'All sessions revoked successfully' })
  }

  private async issueSessionTokens(user: User, ctx: HttpContext) {
    const sessionId = randomUUID()
    const refreshToken = this.jwtTokenService.signRefreshToken({
      sub: user.id,
      email: user.email,
      sessionId,
    })

    await this.userSessionService.createSession({
      sessionId,
      userId: user.id,
      refreshToken,
      expiresAt: this.jwtTokenService.getRefreshTokenExpirationDate(),
      userAgent: ctx.request.header('user-agent') ?? null,
      ipAddress: ctx.request.ip(),
    })

    const accessToken = this.jwtTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
