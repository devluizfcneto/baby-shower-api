import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Gift Management', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
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

  async function createGift(eventId: number, input?: Partial<Gift>) {
    return AppDataSource.getRepository(Gift).save({
      eventId,
      name: 'Fraldas RN',
      description: 'Pacote com 36 unidades',
      imageUrl: null,
      marketplaceUrl: 'https://example.com/gift',
      marketplace: 'amazon',
      asin: 'B000000001',
      affiliateLinkAmazon: null,
      affiliateLinkMl: null,
      affiliateLinkShopee: null,
      maxQuantity: 5,
      confirmedQuantity: 0,
      isBlocked: false,
      sortOrder: 1,
      ...input,
    })
  }

  test('GET /api/admin/gifts returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/gifts')
    response.assertStatus(401)
  })

  test('GET /api/admin/gifts returns ordered admin list', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()

    await createGift(event.id, {
      name: 'Item B',
      sortOrder: 2,
      confirmedQuantity: 1,
      maxQuantity: 1,
    })

    await createGift(event.id, {
      name: 'Item A',
      sortOrder: 1,
      isBlocked: true,
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/gifts')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.meta.total, 2)
    assert.equal(body.data[0].name, 'Item A')
    assert.equal(body.data[0].status, 'blocked')
    assert.equal(body.data[1].name, 'Item B')
    assert.equal(body.data[1].status, 'limit_reached')
  })

  test('GET /api/admin/gifts executes one SQL query on nominal path', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()
    await createGift(event.id)

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
        .get('/api/admin/gifts')
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 1)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })

  test('POST /api/admin/gifts creates gift', async ({ client, assert }) => {
    await createAdmin()
    const event = await createEvent()
    const accessToken = await login(client)

    const response = await client
      .post('/api/admin/gifts')
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Banheira Bebe',
        description: 'Banheira ergonomica',
        marketplace: 'mercadolivre',
        marketplaceUrl: 'https://example.com/banheira',
        maxQuantity: 2,
        sortOrder: 3,
      })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        name: 'Banheira Bebe',
        marketplace: 'mercadolivre',
      },
    })

    const saved = await AppDataSource.getRepository(Gift).findOne({
      where: { eventId: event.id, name: 'Banheira Bebe' },
    })
    assert.isNotNull(saved)
  })

  test('PUT /api/admin/gifts/:id updates gift', async ({ client }) => {
    await createAdmin()
    const event = await createEvent()
    const gift = await createGift(event.id, { name: 'Presente Antigo', maxQuantity: 2 })
    const accessToken = await login(client)

    const response = await client
      .put(`/api/admin/gifts/${gift.id}`)
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Presente Atualizado',
        maxQuantity: 4,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: gift.id,
        name: 'Presente Atualizado',
        maxQuantity: 4,
      },
    })
  })

  test('PUT /api/admin/gifts/:id/block toggles blocked flag', async ({ client }) => {
    await createAdmin()
    const event = await createEvent()
    const gift = await createGift(event.id, { isBlocked: false })
    const accessToken = await login(client)

    const response = await client
      .put(`/api/admin/gifts/${gift.id}/block`)
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        isBlocked: true,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: gift.id,
        isBlocked: true,
        status: 'blocked',
      },
    })
  })

  test('DELETE /api/admin/gifts/:id removes gift when no confirmations', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()
    const gift = await createGift(event.id)
    const accessToken = await login(client)

    const response = await client
      .delete(`/api/admin/gifts/${gift.id}`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(204)

    const deleted = await AppDataSource.getRepository(Gift).findOneBy({ id: gift.id })
    assert.isNull(deleted)
  })

  test('DELETE /api/admin/gifts/:id returns 409 when gift has confirmations', async ({
    client,
  }) => {
    await createAdmin()
    const event = await createEvent()
    const gift = await createGift(event.id)
    const accessToken = await login(client)

    await AppDataSource.getRepository(PurchaseConfirmation).save({
      giftId: gift.id,
      guestName: 'Convidado Exemplo',
      guestEmail: 'convidado@email.com',
      quantity: 1,
      orderNumber: null,
      notes: null,
      confirmedAt: new Date('2026-04-10T10:00:00.000Z'),
    })

    const response = await client
      .delete(`/api/admin/gifts/${gift.id}`)
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(409)
    response.assertBodyContains({
      errors: [
        {
          code: 'GIFT_HAS_PURCHASE_CONFIRMATIONS',
        },
      ],
    })
  })
})
