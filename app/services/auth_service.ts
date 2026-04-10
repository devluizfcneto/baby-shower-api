import hash from '@adonisjs/core/services/hash'
import { inject } from '@adonisjs/core'
import { randomUUID } from 'node:crypto'

import { ErrorCode } from '#constants/error_code'
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '#exceptions/http_exceptions'
import { User } from '#entities/user'
import { UserRepository } from '#repositories/user_repository'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { JwtTokenService } from '#services/jwt_token_service'
import { UserSessionService } from '#services/user_session_service'

type PublicUser = {
  id: number
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

type IssueSessionContext = {
  userAgent: string | null
  ipAddress: string | null
}

type RegisterInput = {
  name: string
  email: string
  password: string
}

type LoginInput = {
  email: string
  password: string
}

@inject()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly userSessionService: UserSessionService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async register(input: RegisterInput): Promise<{ user: PublicUser }> {
    const normalizedEmail = this.inputSanitizerService.normalizeEmail(input.email)
    const existingUser = await this.userRepository.findByEmail(normalizedEmail)

    if (existingUser) {
      throw ConflictException.single(
        'Email already in use',
        ErrorCode.EMAIL_ALREADY_IN_USE,
        'email'
      )
    }

    const hashedPassword = await hash.make(input.password)
    const user = await this.userRepository.createUser({
      name: this.inputSanitizerService.normalizeRequiredText(input.name),
      email: normalizedEmail,
      password: hashedPassword,
    })

    return { user: this.toPublicUser(user) }
  }

  async login(
    input: LoginInput,
    context: IssueSessionContext
  ): Promise<{
    user: PublicUser
    accessToken: string
    refreshToken: string
  }> {
    const normalizedEmail = this.inputSanitizerService.normalizeEmail(input.email)
    const user = await this.userRepository.findByEmailForAuth(normalizedEmail)

    if (!user || !(await hash.verify(user.password, input.password))) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    const tokens = await this.issueSessionTokens(user, context)

    return {
      user: this.toPublicUser(user),
      ...tokens,
    }
  }

  async getAuthenticatedUser(userId: number): Promise<{ user: PublicUser }> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw NotFoundException.single('User not found', ErrorCode.USER_NOT_FOUND)
    }

    return { user: this.toPublicUser(user) }
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.verifyRefreshTokenOrFail(refreshToken)

    const session = await this.userSessionService.verifySession(payload.sid, refreshToken)

    if (!session) {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'refreshToken'
      )
    }

    const user = await this.userRepository.findById(Number(payload.sub))

    if (!user) {
      throw NotFoundException.single('User not found', ErrorCode.USER_NOT_FOUND)
    }

    const rotatedRefreshToken = this.jwtTokenService.signRefreshToken({
      sub: user.id,
      email: user.email,
      sessionId: session.sessionId,
    })

    await this.userSessionService.rotateRefreshToken(
      session.sessionId,
      rotatedRefreshToken,
      this.jwtTokenService.getRefreshTokenExpirationDate()
    )

    const accessToken = this.jwtTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    })

    return {
      accessToken,
      refreshToken: rotatedRefreshToken,
    }
  }

  async logout(userId: number, refreshToken: string): Promise<void> {
    const payload = this.verifyRefreshTokenOrFail(refreshToken)

    if (userId !== Number(payload.sub)) {
      throw UnauthorizedException.single('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
    }

    await this.userSessionService.revokeSession(payload.sid)
  }

  async logoutAll(userId: number): Promise<void> {
    await this.userSessionService.revokeAllUserSessions(userId)
  }

  private verifyRefreshTokenOrFail(refreshToken: string) {
    try {
      return this.jwtTokenService.verifyRefreshToken(refreshToken)
    } catch {
      throw UnauthorizedException.single(
        'Invalid or expired token',
        ErrorCode.INVALID_OR_EXPIRED_TOKEN,
        'refreshToken'
      )
    }
  }

  private async issueSessionTokens(user: User, context: IssueSessionContext) {
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
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
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

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
