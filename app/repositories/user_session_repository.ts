import type { Repository } from 'typeorm'

import { UserSession } from '#entities/user_session'
import { AppDataSource } from '#services/database_service'

type CreateUserSessionInput = {
  sessionId: string
  userId: number
  refreshTokenHash: string
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}

export class UserSessionRepository {
  constructor(
    private readonly repository: Repository<UserSession> = AppDataSource.getRepository(UserSession)
  ) {}

  async createSession(input: CreateUserSessionInput): Promise<UserSession> {
    const session = this.repository.create({
      sessionId: input.sessionId,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      revokedAt: null,
    })

    return this.repository.save(session)
  }

  async findActiveBySessionId(sessionId: string): Promise<UserSession | null> {
    return this.repository
      .createQueryBuilder('session')
      .where('session.session_id = :sessionId', { sessionId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > NOW()')
      .getOne()
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: () => 'NOW()' })
      .where('session_id = :sessionId', { sessionId })
      .andWhere('revoked_at IS NULL')
      .execute()
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute()
  }

  async rotateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(UserSession)
      .set({ refreshTokenHash, expiresAt, revokedAt: null })
      .where('session_id = :sessionId', { sessionId })
      .execute()
  }
}
