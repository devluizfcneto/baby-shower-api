import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Auth', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query('TRUNCATE TABLE user_sessions, users RESTART IDENTITY CASCADE')
  })

  async function createAdmin(email = 'admin@baby-shower.local', password = 'StrongPass#2026') {
    const passwordHash = await hash.make(password)

    return AppDataSource.getRepository(User).save({
      name: 'Admin',
      email,
      password: passwordHash,
    })
  }

  async function login(
    client: any,
    email = 'admin@baby-shower.local',
    password = 'StrongPass#2026'
  ) {
    const response = await client.post('/api/admin/login').json({
      email,
      password,
    })

    response.assertStatus(200)

    return {
      accessToken: response.body().accessToken as string,
      refreshToken: response.body().refreshToken as string,
    }
  }

  test('login succeeds and returns access and refresh tokens', async ({ client }) => {
    await createAdmin()

    const response = await client.post('/api/admin/login').json({
      email: 'admin@baby-shower.local',
      password: 'StrongPass#2026',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        email: 'admin@baby-shower.local',
      },
    })
  })

  test('login fails with invalid credentials', async ({ client }) => {
    await createAdmin()

    const response = await client.post('/api/admin/login').json({
      email: 'admin@baby-shower.local',
      password: 'WrongPass#2026',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      errors: [
        {
          code: 'INVALID_CREDENTIALS',
        },
      ],
    })
  })

  test('me returns authenticated admin profile', async ({ client }) => {
    await createAdmin()

    const tokens = await login(client)

    const response = await client
      .get('/api/admin/me')
      .header('authorization', `Bearer ${tokens.accessToken}`)

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        email: 'admin@baby-shower.local',
      },
    })
  })

  test('refresh rotates refresh token and keeps session valid', async ({ client, assert }) => {
    await createAdmin()

    const tokens = await login(client)

    const refreshResponse = await client.post('/api/admin/refresh').json({
      refreshToken: tokens.refreshToken,
    })

    refreshResponse.assertStatus(200)

    const rotatedRefreshToken = refreshResponse.body().refreshToken as string
    assert.notEqual(rotatedRefreshToken, tokens.refreshToken)

    const oldRefreshResponse = await client.post('/api/admin/refresh').json({
      refreshToken: tokens.refreshToken,
    })

    oldRefreshResponse.assertStatus(401)
  })

  test('logout revokes current session', async ({ client }) => {
    await createAdmin()

    const tokens = await login(client)

    const logoutResponse = await client
      .post('/api/admin/logout')
      .header('authorization', `Bearer ${tokens.accessToken}`)
      .json({
        refreshToken: tokens.refreshToken,
      })

    logoutResponse.assertStatus(200)

    const refreshResponse = await client.post('/api/admin/refresh').json({
      refreshToken: tokens.refreshToken,
    })

    refreshResponse.assertStatus(401)
  })

  test('logout-all revokes all active sessions for user', async ({ client }) => {
    await createAdmin()

    const firstSession = await login(client)
    const secondSession = await login(client)

    const logoutAllResponse = await client
      .post('/api/admin/logout-all')
      .header('authorization', `Bearer ${firstSession.accessToken}`)

    logoutAllResponse.assertStatus(200)

    const refreshFirst = await client.post('/api/admin/refresh').json({
      refreshToken: firstSession.refreshToken,
    })

    const refreshSecond = await client.post('/api/admin/refresh').json({
      refreshToken: secondSession.refreshToken,
    })

    refreshFirst.assertStatus(401)
    refreshSecond.assertStatus(401)
  })
})
