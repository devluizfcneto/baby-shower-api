import hash from '@adonisjs/core/services/hash'

import { UserSession } from '#entities/user_session'
import { AppDataSource } from '#services/database_service'

type CreateSessionInput = {
  sessionId: string
  userId: number
  refreshToken: string
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}

export class UserSessionService {
  async createSession(input: CreateSessionInput) {
    const sessionRepository = AppDataSource.getRepository(UserSession)
    const refreshTokenHash = await hash.make(input.refreshToken)

    const session = sessionRepository.create({
      sessionId: input.sessionId,
      userId: input.userId,
      refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      revokedAt: null,
    })

    return sessionRepository.save(session)
  }

  async verifySession(sessionId: string, refreshToken: string) {
    const sessionRepository = AppDataSource.getRepository(UserSession)
    const session = await sessionRepository.findOne({ where: { sessionId } })

    if (!session || session.revokedAt !== null) {
      return null
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return null
    }

    const tokenMatches = await hash.verify(session.refreshTokenHash, refreshToken)
    if (!tokenMatches) {
      return null
    }

    return session
  }

  async revokeSession(sessionId: string) {
    const sessionRepository = AppDataSource.getRepository(UserSession)
    await sessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: new Date() })
      .where('session_id = :sessionId', { sessionId })
      .andWhere('revoked_at IS NULL')
      .execute()
  }

  async revokeAllUserSessions(userId: number) {
    const sessionRepository = AppDataSource.getRepository(UserSession)
    await sessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute()
  }
}
