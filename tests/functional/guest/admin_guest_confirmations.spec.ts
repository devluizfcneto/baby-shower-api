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

  async function createEvent(code = 'babyshower2026event1') {
    return AppDataSource.getRepository(Event).save({
      code,
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: null,
      mapsLink: null,
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
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

  test('GET /api/admin/guests returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/guests')
    response.assertStatus(401)
  })

  test('GET /api/admin/guests returns paginated list with summary', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()

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
      .get('/api/admin/guests?page=1&perPage=20&sortBy=confirmedAt&sortDir=asc')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.meta.total, 2)
    assert.equal(body.meta.summary.guests, 2)
    assert.equal(body.meta.summary.companions, 1)
    assert.equal(body.meta.summary.totalPeople, 3)
    assert.equal(body.data[0].fullName, 'Ana Clara')
    assert.equal(body.data[0].companionsCount, 1)
    assert.equal(body.data[0].totalPeople, 2)
  })

  test('GET /api/admin/guests applies search filter', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()

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
      .get('/api/admin/guests?search=joao')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].fullName, 'Joao Pedro')
  })

  test('GET /api/admin/guests includes companions with expand=companions', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const guest = await createGuest(event.id, {
      fullName: 'Convidado Expand',
      email: 'expand@example.com',
    })

    await createCompanion(event.id, guest.id, {
      fullName: 'Acompanhante 1',
      email: 'expand-c1@example.com',
    })
    await createCompanion(event.id, guest.id, {
      fullName: 'Acompanhante 2',
      email: 'expand-c2@example.com',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/guests?expand=companions')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().data[0].companions.length, 2)
  })

  test('GET /api/admin/guests returns 422 for invalid filter range', async ({ client }) => {
    await createAdmin()
    await createEvent()
    const accessToken = await login(client)

    const response = await client
      .get(
        '/api/admin/guests?confirmedFrom=2026-06-30T23:59:59.999Z&confirmedTo=2026-06-01T00:00:00.000Z'
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

  test('GET /api/admin/guests executes predictable query count and avoids N+1', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

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
        .get('/api/admin/guests?expand=companions')
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 4)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
