import { test } from '@japa/runner'

import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'
import { EventRepository } from '#repositories/event_repository'

test.group('GET /api/event', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.getRepository(Event).clear()
  })

  test('returns 200 with public event payload when event exists', async ({ client, assert }) => {
    await AppDataSource.getRepository(Event).save({
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: 'Rua Entrega, 456 - Sao Paulo/SP',
      mapsLink: 'https://maps.google.com/test',
      coverImageUrl: 'https://cdn.example.com/capa.jpg',
      pixKeyDad: 'dad@example.com',
      pixKeyMom: 'mom@example.com',
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })

    const response = await client.get('/api/event')

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.data.name, 'Cha da Helena')
    assert.equal(body.data.venueAddress, 'Rua Exemplo, 123 - Sao Paulo/SP')
    assert.equal(body.meta.source, 'database')
  })

  test('returns 404 with EVENT_NOT_FOUND when no event exists', async ({ client }) => {
    const response = await client.get('/api/event')

    response.assertStatus(404)
    response.assertBodyContains({
      errors: [
        {
          message: 'Em breve!',
          code: 'EVENT_NOT_FOUND',
        },
      ],
    })
  })

  test('returns 500 with EVENT_FETCH_FAILED when repository fails', async ({ client }) => {
    const originalMethod = EventRepository.prototype.findLatestPublicEvent
    EventRepository.prototype.findLatestPublicEvent = async () => {
      throw new Error('forced failure')
    }

    try {
      const response = await client.get('/api/event')
      response.assertStatus(500)
      response.assertBodyContains({
        errors: [
          {
            code: 'EVENT_FETCH_FAILED',
          },
        ],
      })
    } finally {
      EventRepository.prototype.findLatestPublicEvent = originalMethod
    }
  })

  test('executes only one SQL query per request', async ({ client, assert }) => {
    await AppDataSource.getRepository(Event).save({
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
      const response = await client.get('/api/event')
      response.assertStatus(200)
      assert.equal(queryCount, 1)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })

  test('keeps p95 latency at or below 250ms in light local load', async ({ client, assert }) => {
    await AppDataSource.getRepository(Event).save({
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

    const durations: number[] = []

    for (let i = 0; i < 30; i++) {
      const start = performance.now()
      const response = await client.get('/api/event')
      response.assertStatus(200)
      durations.push(performance.now() - start)
    }

    durations.sort((a, b) => a - b)
    const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1)
    const p95 = durations[p95Index]

    assert.isAtMost(p95, 250)
  })
})
