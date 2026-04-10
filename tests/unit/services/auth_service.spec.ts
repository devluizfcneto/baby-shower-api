import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { UnauthorizedException } from '#exceptions/http_exceptions'
import type { User } from '#entities/user'
import { AuthService } from '#services/auth_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('AuthService', () => {
  test('login returns user and tokens for valid credentials', async ({ assert }) => {
    const passwordHash = await hash.make('StrongPass#2026')

    const user = {
      id: 1,
      name: 'Admin',
      email: 'admin@baby-shower.local',
      password: passwordHash,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as User

    const service = new AuthService(
      {
        findByEmailForAuth: async () => user,
      } as any,
      {
        signAccessToken: () => 'access-token',
        signRefreshToken: () => 'refresh-token',
        getRefreshTokenExpirationDate: () => new Date('2026-06-01T00:00:00.000Z'),
      } as any,
      {
        createSession: async () => {},
      } as any,
      new InputSanitizerService()
    )

    const result = await service.login(
      {
        email: 'ADMIN@BABY-SHOWER.LOCAL',
        password: 'StrongPass#2026',
      },
      {
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      }
    )

    assert.equal(result.user.email, 'admin@baby-shower.local')
    assert.equal(result.accessToken, 'access-token')
    assert.equal(result.refreshToken, 'refresh-token')
  })

  test('login throws INVALID_CREDENTIALS when password is invalid', async ({ assert }) => {
    const passwordHash = await hash.make('StrongPass#2026')

    const service = new AuthService(
      {
        findByEmailForAuth: async () =>
          ({
            id: 1,
            name: 'Admin',
            email: 'admin@baby-shower.local',
            password: passwordHash,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }) as User,
      } as any,
      {} as any,
      {} as any,
      new InputSanitizerService()
    )

    try {
      await service.login(
        {
          email: 'admin@baby-shower.local',
          password: 'WrongPass#2026',
        },
        {
          userAgent: null,
          ipAddress: null,
        }
      )

      assert.fail('Expected UnauthorizedException')
    } catch (error) {
      assert.instanceOf(error, UnauthorizedException)
      assert.equal((error as UnauthorizedException).errors[0]?.code, 'INVALID_CREDENTIALS')
    }
  })

  test('refresh rotates refresh token and returns new access token', async ({ assert }) => {
    let rotatedToken: string | null = null

    const service = new AuthService(
      {
        findById: async () =>
          ({
            id: 1,
            name: 'Admin',
            email: 'admin@baby-shower.local',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }) as User,
      } as any,
      {
        verifyRefreshToken: () => ({ sub: '1', sid: 'session-1', typ: 'refresh' }),
        signRefreshToken: () => 'new-refresh-token',
        signAccessToken: () => 'new-access-token',
        getRefreshTokenExpirationDate: () => new Date('2026-06-01T00:00:00.000Z'),
      } as any,
      {
        verifySession: async () => ({ sessionId: 'session-1' }),
        rotateRefreshToken: async (_sid: string, token: string) => {
          rotatedToken = token
        },
      } as any,
      new InputSanitizerService()
    )

    const result = await service.refresh('old-refresh-token')

    assert.equal(result.accessToken, 'new-access-token')
    assert.equal(result.refreshToken, 'new-refresh-token')
    assert.equal(rotatedToken, 'new-refresh-token')
  })
})
