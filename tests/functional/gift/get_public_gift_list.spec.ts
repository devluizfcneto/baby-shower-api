import { test } from '@japa/runner'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { GiftRepository } from '#repositories/gift_repository'
import { AppDataSource } from '#services/database_service'

test.group('GET /api/gifts/:eventCode', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE companions, guests, gifts, events RESTART IDENTITY CASCADE'
    )
  })

  async function createEvent(code = 'giftseventcode123') {
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

  test('returns 200 with ordered gifts and computed status fields', async ({ client, assert }) => {
    const event = await createEvent()

    await AppDataSource.getRepository(Gift).insert([
      {
        eventId: event.id,
        name: 'Presente Bloqueado',
        description: null,
        imageUrl: null,
        marketplaceUrl: 'https://example.com/blocked',
        marketplace: 'amazon',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 2,
        confirmedQuantity: 0,
        isBlocked: true,
        sortOrder: 3,
      },
      {
        eventId: event.id,
        name: 'Presente Disponivel',
        description: 'Descricao',
        imageUrl: null,
        marketplaceUrl: 'https://example.com/available',
        marketplace: 'mercadolivre',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 3,
        confirmedQuantity: 1,
        isBlocked: false,
        sortOrder: 1,
      },
      {
        eventId: event.id,
        name: 'Presente Limite',
        description: null,
        imageUrl: null,
        marketplaceUrl: 'https://example.com/limit',
        marketplace: 'shopee',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 2,
        confirmedQuantity: 2,
        isBlocked: false,
        sortOrder: 2,
      },
    ])

    const response = await client.get(`/api/gifts/${event.code}`)

    response.assertStatus(200)
    const body = response.body()

    assert.equal(body.meta.eventCode, event.code)
    assert.equal(body.meta.total, 3)
    assert.equal(body.data[0].name, 'Presente Disponivel')
    assert.equal(body.data[0].status, 'available')
    assert.equal(body.data[0].remainingQuantity, 2)
    assert.equal(body.data[1].name, 'Presente Limite')
    assert.equal(body.data[1].status, 'limit_reached')
    assert.equal(body.data[1].remainingQuantity, 0)
    assert.equal(body.data[2].name, 'Presente Bloqueado')
    assert.equal(body.data[2].status, 'blocked')
  })

  test('returns 200 with empty data when event exists without gifts', async ({
    client,
    assert,
  }) => {
    const event = await createEvent('giftsempty1234')

    const response = await client.get(`/api/gifts/${event.code}`)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [],
      meta: {
        eventCode: event.code,
        total: 0,
      },
    })

    assert.deepEqual(response.body().data, [])
  })

  test('returns 404 with EVENT_NOT_FOUND when event does not exist', async ({ client }) => {
    const response = await client.get('/api/gifts/missingeventcode')

    response.assertStatus(404)
    response.assertBodyContains({
      errors: [
        {
          code: 'EVENT_NOT_FOUND',
        },
      ],
    })
  })

  test('returns 422 when eventCode path param is invalid', async ({ client }) => {
    const response = await client.get('/api/gifts/abc')

    response.assertStatus(422)
  })

  test('returns 500 with GIFT_LIST_FETCH_FAILED when repository fails', async ({ client }) => {
    const originalMethod = GiftRepository.prototype.findPublicByEventCode
    GiftRepository.prototype.findPublicByEventCode = async () => {
      throw new Error('forced failure')
    }

    try {
      const response = await client.get('/api/gifts/babyshower2026event1')
      response.assertStatus(500)
      response.assertBodyContains({
        errors: [
          {
            code: 'GIFT_LIST_FETCH_FAILED',
          },
        ],
      })
    } finally {
      GiftRepository.prototype.findPublicByEventCode = originalMethod
    }
  })

  test('executes only one SQL query per request in nominal path', async ({ client, assert }) => {
    const event = await createEvent('giftsquerycount123')

    await AppDataSource.getRepository(Gift).insert({
      eventId: event.id,
      name: 'Presente Query',
      description: null,
      imageUrl: null,
      marketplaceUrl: 'https://example.com/query',
      marketplace: 'amazon',
      asin: null,
      affiliateLinkAmazon: null,
      affiliateLinkMl: null,
      affiliateLinkShopee: null,
      maxQuantity: 1,
      confirmedQuantity: 0,
      isBlocked: false,
      sortOrder: 1,
    })

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
      const response = await client.get(`/api/gifts/${event.code}`)
      response.assertStatus(200)
      assert.equal(queryCount, 1)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
