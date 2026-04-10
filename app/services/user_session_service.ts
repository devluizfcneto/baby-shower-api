import hash from '@adonisjs/core/services/hash'
import { inject } from '@adonisjs/core'

import { type UserSession } from '#entities/user_session'
import { UserSessionRepository } from '#repositories/user_session_repository'

type CreateSessionInput = {
  sessionId: string
  userId: number
  refreshToken: string
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}

@inject()
export class UserSessionService {
  constructor(private readonly userSessionRepository: UserSessionRepository) {}

  async createSession(input: CreateSessionInput) {
    const refreshTokenHash = await hash.make(input.refreshToken)

    return this.userSessionRepository.createSession({
      sessionId: input.sessionId,
      userId: input.userId,
      refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })
  }

  async verifySession(sessionId: string, refreshToken: string): Promise<UserSession | null> {
    const session = await this.userSessionRepository.findActiveBySessionId(sessionId)
    if (!session) {
      return null
    }

    const tokenMatches = await hash.verify(session.refreshTokenHash, refreshToken)
    if (!tokenMatches) {
      return null
    }

    return session
  }

  async revokeSession(sessionId: string) {
    await this.userSessionRepository.revokeSession(sessionId)
  }

  async revokeAllUserSessions(userId: number) {
    await this.userSessionRepository.revokeAllUserSessions(userId)
  }

  async rotateRefreshToken(sessionId: string, refreshToken: string, expiresAt: Date) {
    const refreshTokenHash = await hash.make(refreshToken)
    await this.userSessionRepository.rotateRefreshToken(sessionId, refreshTokenHash, expiresAt)
  }
}
