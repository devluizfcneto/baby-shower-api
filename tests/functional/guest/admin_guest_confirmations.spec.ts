import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Companion } from '#entities/companion'
import { Event } from '#entities/event'
import { Guest } from '#entities/guest'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Guest Confirmations', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, companions, guests, purchase_confirmations, gifts, donations, events RESTART IDENTITY CASCADE'
    )
  })

  async function createAdmin(email = 'admin@baby-shower.local', password = 'StrongPass#2026') {
    const passwordHash = await hash.make(password)

    return AppDataSource.getRepository(User).save({
      name: 'Admin',
      email,
      password: passwordHash,
    })
  }

  async function login(client: any) {
    const response = await client.post('/api/admin/login').json({
      email: 'admin@baby-shower.local',
      password: 'StrongPass#2026',
    })

    response.assertStatus(200)
    return response.body().accessToken as string
  }

  async function createEvent(adminId: number, code = 'babyshower2026event1') {
    return AppDataSource.getRepository(Event).save({
      adminId,
      code,
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: null,
      mapsLink: null,
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
    })
  }

  async function createGuest(eventId: number, input?: Partial<Guest>) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`

    return AppDataSource.getRepository(Guest).save({
      eventId,
      fullName: 'Convidado Base',
      email: `convidado-base-${suffix}@example.com`,
      confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
      ...input,
    })
  }

  async function createCompanion(eventId: number, guestId: number, input?: Partial<Companion>) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`

    return AppDataSource.getRepository(Companion).save({
      eventId,
      guestId,
      fullName: 'Acompanhante Base',
      email: `acompanhante-${suffix}@example.com`,
      ...input,
    })
  }

  test('GET /api/admin/events/:eventId/guests returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/events/1/guests')
    response.assertStatus(401)
  })

  test('GET /api/admin/events/:eventId/guests returns flattened confirmed people list', async ({ client, assert }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)

    const guest1 = await createGuest(event.id, {
      fullName: 'Ana Clara',
      email: 'ana@example.com',
      confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
    })
    await createCompanion(event.id, guest1.id, {
      fullName: 'Acompanhante Ana',
      email: 'acomp-ana@example.com',
    })

    await createGuest(event.id, {
      fullName: 'Bruno Lima',
      email: 'bruno@example.com',
      confirmedAt: new Date('2026-06-11T10:00:00.000Z'),
    })

    const accessToken = await login(client)

    const response = await client
      .get(`/api/admin/events/${event.id}/guests?page=1&perPage=20&sortBy=confirmedAt&sortDir=asc`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.meta.total, 3)
    assert.equal(body.meta.summary.guests, 2)
    assert.equal(body.meta.summary.companions, 1)
    assert.equal(body.meta.summary.totalPeople, 3)
    assert.equal(body.data.length, 3)
    assert.equal(body.data[0].personType, 'guest')
    assert.equal(body.data[0].fullName, 'Ana Clara')
    assert.equal(body.data[1].personType, 'companion')
    assert.equal(body.data[1].fullName, 'Acompanhante Ana')
    assert.equal(body.data[2].personType, 'guest')
    assert.equal(body.data[2].fullName, 'Bruno Lima')
  })

  test('GET /api/admin/events/:eventId/guests applies search filter', async ({ client, assert }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)

    await createGuest(event.id, {
      fullName: 'Joao Pedro',
      email: 'joao@example.com',
    })

    await createGuest(event.id, {
      fullName: 'Marina Souza',
      email: 'marina@example.com',
    })

    const accessToken = await login(client)

    const response = await client
      .get(`/api/admin/events/${event.id}/guests?search=joao`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].fullName, 'Joao Pedro')
  })

  test('GET /api/admin/events/:eventId/guests returns companion as a separate confirmed person', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)

    const guest = await createGuest(event.id, {
      fullName: 'Convidado Expand',
      email: 'expand@example.com',
    })

    await createCompanion(event.id, guest.id, {
      fullName: 'Acompanhante 1',
      email: 'expand-c1@example.com',
    })

    const accessToken = await login(client)

    const response = await client
      .get(`/api/admin/events/${event.id}/guests`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().data.length, 2)
    assert.equal(response.body().data[0].personType, 'guest')
    assert.equal(response.body().data[1].personType, 'companion')
  })

  test('GET /api/admin/events/:eventId/guests returns 422 for invalid filter range', async ({ client }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)
    const accessToken = await login(client)

    const response = await client
      .get(
        `/api/admin/events/${event.id}/guests?confirmedFrom=2026-06-30T23:59:59.999Z&confirmedTo=2026-06-01T00:00:00.000Z`
      )
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          code: 'INVALID_QUERY_FILTER_RANGE',
        },
      ],
    })
  })

  test('GET /api/admin/events/:eventId/guests executes predictable query count and avoids N+1', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)

    const guest1 = await createGuest(event.id, { email: 'n1-a@example.com' })
    await createCompanion(event.id, guest1.id, { email: 'n1-a-c1@example.com' })

    const guest2 = await createGuest(event.id, { email: 'n1-b@example.com' })
    await createCompanion(event.id, guest2.id, { email: 'n1-b-c1@example.com' })
    await createCompanion(event.id, guest2.id, { email: 'n1-b-c2@example.com' })

    const accessToken = await login(client)

    let queryCount = 0
    const originalCreateQueryRunner = AppDataSource.createQueryRunner.bind(AppDataSource)

    ;(AppDataSource as any).createQueryRunner = (...args: any[]) => {
      const queryRunner = originalCreateQueryRunner(...args)
      const originalQuery = queryRunner.query.bind(queryRunner)
      queryRunner.query = async (...queryArgs: any[]) => {
        queryCount += 1
        const [query, parameters, useStructuredResult] = queryArgs as [
          string,
          any[] | undefined,
          boolean | undefined,
        ]

        if (useStructuredResult === true) {
          return originalQuery(query, parameters, true)
        }

        return originalQuery(query, parameters)
      }

      return queryRunner
    }

    try {
      const response = await client
        .get(`/api/admin/events/${event.id}/guests?expand=companions`)
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 4)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
