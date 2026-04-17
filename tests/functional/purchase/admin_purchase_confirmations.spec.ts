import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Purchase Confirmations', (group) => {
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

  async function createEvent(code = 'purchaseadmin2026event') {
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
    })
  }

  async function createGift(eventId: number, input?: Partial<Gift>) {
    return AppDataSource.getRepository(Gift).save({
      eventId,
      name: 'Kit Mamadeiras',
      description: null,
      imageUrl: null,
      marketplace: 'amazon',
      marketplaceUrl: 'https://example.com/kit-mamadeiras',
      asin: null,
      affiliateLinkAmazon: null,
      affiliateLinkMl: null,
      affiliateLinkShopee: null,
      maxQuantity: 10,
      confirmedQuantity: 0,
      isBlocked: false,
      sortOrder: 1,
      ...input,
    })
  }

  async function createConfirmation(giftId: number, input?: Partial<PurchaseConfirmation>) {
    const random = Math.floor(Math.random() * 100000)

    return AppDataSource.getRepository(PurchaseConfirmation).save({
      giftId,
      guestName: `Convidado ${random}`,
      guestEmail: `convidado.${random}@example.com`,
      quantity: 1,
      orderNumber: `ORD-${random}`,
      notes: null,
      confirmedAt: new Date('2026-06-15T14:30:00.000Z'),
      ...input,
    })
  }

  test('GET /api/admin/purchase-confirmations returns 401 without authentication', async ({
    client,
  }) => {
    const response = await client.get('/api/admin/purchase-confirmations')
    response.assertStatus(401)
  })

  test('GET /api/admin/purchase-confirmations returns paginated list with summary', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const giftA = await createGift(event.id, {
      name: 'Fralda RN Premium',
      marketplace: 'amazon',
    })

    const giftB = await createGift(event.id, {
      name: 'Toalha de Banho',
      marketplace: 'mercadolivre',
      marketplaceUrl: 'https://example.com/toalha',
    })

    await createConfirmation(giftA.id, {
      guestName: 'Ana Compra',
      guestEmail: 'ana.compra@example.com',
      quantity: 2,
      orderNumber: 'ANA-123',
    })

    await createConfirmation(giftB.id, {
      guestName: 'Bruno Compra',
      guestEmail: 'bruno.compra@example.com',
      quantity: 1,
      orderNumber: 'BRUNO-456',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/purchase-confirmations?page=1&perPage=20&sortBy=confirmedAt&sortDir=desc')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.meta.total, 2)
    assert.equal(body.meta.summary.confirmations, 2)
    assert.equal(body.meta.summary.unitsConfirmed, 3)
    assert.equal(body.meta.summary.buyersUnique, 2)
    assert.exists(body.data[0].giftName)
    assert.exists(body.data[0].marketplace)
  })

  test('GET /api/admin/purchase-confirmations applies search filter', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()
    const gift = await createGift(event.id)

    await createConfirmation(gift.id, {
      guestName: 'Joao Mercado',
      guestEmail: 'joao.mercado@example.com',
      orderNumber: 'MLB-999',
    })

    await createConfirmation(gift.id, {
      guestName: 'Marina Presente',
      guestEmail: 'marina.presente@example.com',
      orderNumber: 'MLB-1000',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/purchase-confirmations?search=joao')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].guestName, 'Joao Mercado')
  })

  test('GET /api/admin/purchase-confirmations applies marketplace and giftId filters', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const amazonGift = await createGift(event.id, {
      name: 'Amazon Gift',
      marketplace: 'amazon',
    })

    const mlGift = await createGift(event.id, {
      name: 'ML Gift',
      marketplace: 'mercadolivre',
      marketplaceUrl: 'https://example.com/ml-gift',
    })

    await createConfirmation(amazonGift.id, { guestEmail: 'amazon-buyer@example.com' })
    await createConfirmation(mlGift.id, { guestEmail: 'ml-buyer@example.com' })

    const accessToken = await login(client)

    const response = await client
      .get(`/api/admin/purchase-confirmations?marketplace=amazon&giftId=${amazonGift.id}`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().data[0].giftId, amazonGift.id)
    assert.equal(response.body().data[0].marketplace, 'amazon')
  })

  test('GET /api/admin/purchase-confirmations returns 422 for invalid filter range', async ({
    client,
  }) => {
    await createAdmin()
    await createEvent()
    const accessToken = await login(client)

    const response = await client
      .get(
        '/api/admin/purchase-confirmations?confirmedFrom=2026-06-30T23:59:59.999Z&confirmedTo=2026-06-01T00:00:00.000Z'
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

  test('GET /api/admin/purchase-confirmations executes predictable query count and avoids N+1', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const gift1 = await createGift(event.id, {
      name: 'Gift Query 1',
      marketplace: 'amazon',
    })

    const gift2 = await createGift(event.id, {
      name: 'Gift Query 2',
      marketplace: 'mercadolivre',
      marketplaceUrl: 'https://example.com/gift-query-2',
    })

    await createConfirmation(gift1.id, { guestEmail: 'query-a@example.com', quantity: 1 })
    await createConfirmation(gift2.id, { guestEmail: 'query-b@example.com', quantity: 2 })

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
        .get('/api/admin/purchase-confirmations?page=1&perPage=20')
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 4)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
