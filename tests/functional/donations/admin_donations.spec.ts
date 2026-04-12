import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'

import { Donation } from '#entities/donation'
import { Event } from '#entities/event'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Donations', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, purchase_confirmations, companions, guests, gifts, donations, events RESTART IDENTITY CASCADE'
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

  async function createEvent(code = 'admindonations2026event') {
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

  async function createDonation(eventId: number, input?: Partial<Donation>) {
    return AppDataSource.getRepository(Donation).save({
      eventId,
      donorName: 'Doador Base',
      donorEmail: 'doador.base@example.com',
      amount: '120.50',
      pixDestination: 'mom',
      donatedAt: new Date('2026-06-20T13:10:00.000Z'),
      ...input,
    })
  }

  test('GET /api/admin/donations returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/donations')
    response.assertStatus(401)
  })

  test('GET /api/admin/donations returns paginated list with summary', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    await createDonation(event.id, {
      donorName: 'Ana Doa',
      donorEmail: 'ana@example.com',
      amount: '100.00',
      pixDestination: 'mom',
    })

    await createDonation(event.id, {
      donorName: 'Bruno Doa',
      donorEmail: 'bruno@example.com',
      amount: '50.00',
      pixDestination: 'dad',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/donations?page=1&perPage=20&sortBy=donatedAt&sortDir=desc')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.meta.total, 2)
    assert.equal(body.meta.summary.donations, 2)
    assert.equal(body.meta.summary.declaredAmountTotal, 150)
    assert.equal(body.meta.summary.donorsUnique, 2)
    assert.exists(body.data[0].donatedAt)
  })

  test('GET /api/admin/donations applies search filter', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()

    await createDonation(event.id, {
      donorName: 'Joao Doa',
      donorEmail: 'joao@example.com',
    })

    await createDonation(event.id, {
      donorName: 'Marina Doa',
      donorEmail: 'marina@example.com',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/donations?search=joao')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].donorName, 'Joao Doa')
  })

  test('GET /api/admin/donations applies pixDestination filter', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()

    await createDonation(event.id, {
      donorEmail: 'dad@example.com',
      pixDestination: 'dad',
    })

    await createDonation(event.id, {
      donorEmail: 'mom@example.com',
      pixDestination: 'mom',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/donations?pixDestination=dad')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].pixDestination, 'dad')
  })

  test('GET /api/admin/donations returns 422 for invalid filter range', async ({ client }) => {
    await createAdmin()
    await createEvent()
    const accessToken = await login(client)

    const response = await client
      .get(
        '/api/admin/donations?donatedFrom=2026-06-30T23:59:59.999Z&donatedTo=2026-06-01T00:00:00.000Z'
      )
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          code: 'INVALID_DONATION_FILTER_RANGE',
        },
      ],
    })
  })

  test('GET /api/admin/donations executes predictable query count and avoids N+1', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    await createDonation(event.id, {
      donorEmail: 'query-a@example.com',
      amount: '70.00',
      pixDestination: 'dad',
    })

    await createDonation(event.id, {
      donorEmail: 'query-b@example.com',
      amount: '30.00',
      pixDestination: 'mom',
    })

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
        .get('/api/admin/donations?page=1&perPage=20')
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 4)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
