import { test } from '@japa/runner'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { GiftRepository } from '#repositories/gift_repository'
import { AppDataSource } from '#services/database_service'

test.group('GET /api/events/:eventCode/gifts', (group) => {
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

    const response = await client.get(`/api/events/${event.code}/gifts`)

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

    const response = await client.get(`/api/events/${event.code}/gifts`)

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
    const response = await client.get('/api/events/missingeventcode/gifts')

    response.assertStatus(404)
    response.assertBodyContains({
      errors: [
        {
          code: 'EVENT_NOT_FOUND',
        },
      ],
    })
  })

  test('returns 404 when eventCode path param is invalid', async ({ client }) => {
    const response = await client.get('/api/events/abc/gifts')

    response.assertStatus(404)
  })

  test('returns 500 with GIFT_LIST_FETCH_FAILED when repository fails', async ({ client }) => {
    await createEvent('babyshower2026event1')

    const originalMethod = GiftRepository.prototype.findPublicByEventCode
    GiftRepository.prototype.findPublicByEventCode = async () => {
      throw new Error('forced failure')
    }

    try {
      const response = await client.get('/api/events/babyshower2026event1/gifts')
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

  test('executes two SQL queries per request in nominal path', async ({ client, assert }) => {
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
      const response = await client.get(`/api/events/${event.code}/gifts`)
      response.assertStatus(200)
      assert.equal(queryCount, 2)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })

  test('prioritizes non-blocked gifts even when blocked has lower sortOrder', async ({
    client,
    assert,
  }) => {
    const event = await createEvent('giftspriority123')

    await AppDataSource.getRepository(Gift).insert([
      {
        eventId: event.id,
        name: 'Bloqueado Primeiro',
        description: 'Deve ficar depois dos ativos',
        imageUrl: null,
        marketplaceUrl: 'https://example.com/blocked-first',
        marketplace: 'amazon',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: true,
        sortOrder: 0,
      },
      {
        eventId: event.id,
        name: 'Disponivel Depois',
        description: 'Mesmo com sort maior precisa vir antes',
        imageUrl: null,
        marketplaceUrl: 'https://example.com/available-after',
        marketplace: 'mercadolivre',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 10,
      },
    ])

    const response = await client.get(`/api/events/${event.code}/gifts`)

    response.assertStatus(200)
    assert.equal(response.body().data[0].name, 'Disponivel Depois')
    assert.equal(response.body().data[1].name, 'Bloqueado Primeiro')
  })

  test('filters by search across name, description and marketplace', async ({ client, assert }) => {
    const event = await createEvent('giftsfiltersearch')

    await AppDataSource.getRepository(Gift).insert([
      {
        eventId: event.id,
        name: 'Kit Higiene Premium',
        description: 'Com shampoo e sabonete',
        imageUrl: null,
        marketplaceUrl: 'https://example.com/higiene',
        marketplace: 'amazon',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 2,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 1,
      },
      {
        eventId: event.id,
        name: 'Fralda RN',
        description: 'Pacote economico',
        imageUrl: null,
        marketplaceUrl: 'https://example.com/fralda',
        marketplace: 'shopee',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 3,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 2,
      },
    ])

    const byName = await client.get(`/api/events/${event.code}/gifts?search=higiene`)
    byName.assertStatus(200)
    assert.equal(byName.body().meta.total, 1)
    assert.equal(byName.body().data[0].name, 'Kit Higiene Premium')

    const byDescription = await client.get(`/api/events/${event.code}/gifts?search=economico`)
    byDescription.assertStatus(200)
    assert.equal(byDescription.body().meta.total, 1)
    assert.equal(byDescription.body().data[0].name, 'Fralda RN')

    const byMarketplace = await client.get(`/api/events/${event.code}/gifts?search=shopee`)
    byMarketplace.assertStatus(200)
    assert.equal(byMarketplace.body().meta.total, 1)
    assert.equal(byMarketplace.body().data[0].marketplace, 'shopee')
  })

  test('filters by marketplace and supports secondary ordering', async ({ client, assert }) => {
    const event = await createEvent('giftsfiltermarket')

    await AppDataSource.getRepository(Gift).insert([
      {
        eventId: event.id,
        name: 'Produto B',
        description: null,
        imageUrl: null,
        marketplaceUrl: 'https://example.com/produto-b',
        marketplace: 'amazon',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 1,
      },
      {
        eventId: event.id,
        name: 'Produto A',
        description: null,
        imageUrl: null,
        marketplaceUrl: 'https://example.com/produto-a',
        marketplace: 'amazon',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 2,
      },
      {
        eventId: event.id,
        name: 'Produto ML',
        description: null,
        imageUrl: null,
        marketplaceUrl: 'https://example.com/produto-ml',
        marketplace: 'mercadolivre',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: false,
        sortOrder: 3,
      },
    ])

    const response = await client.get(
      `/api/events/${event.code}/gifts?marketplace=amazon&sortBy=name&sortDir=asc`
    )

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 2)
    assert.equal(response.body().data[0].name, 'Produto A')
    assert.equal(response.body().data[1].name, 'Produto B')
  })
})
