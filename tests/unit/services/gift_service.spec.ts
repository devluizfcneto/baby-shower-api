import { test } from '@japa/runner'

import { EventNotFoundException, GiftListFetchFailedException } from '#exceptions/domain_exceptions'
import { GiftPayloadMapperService } from '#services/gift_payload_mapper_service'
import { GiftService } from '#services/gift_service'

test.group('GiftService', () => {
  test('maps gifts to stable public DTO with status and remaining quantity', async ({ assert }) => {
    const service = new GiftService(
      {
        findPublicByEventCode: async () => ({
          eventFound: true,
          gifts: [
            {
              id: 1,
              name: 'Disponivel',
              description: null,
              imageUrl: null,
              marketplace: 'amazon',
              marketplaceUrl: 'https://example.com/a',
              maxQuantity: 3,
              confirmedQuantity: 1,
              isBlocked: false,
              sortOrder: 1,
            },
            {
              id: 2,
              name: 'Limite',
              description: null,
              imageUrl: null,
              marketplace: 'mercadolivre',
              marketplaceUrl: 'https://example.com/b',
              maxQuantity: 2,
              confirmedQuantity: 2,
              isBlocked: false,
              sortOrder: 2,
            },
            {
              id: 3,
              name: 'Bloqueado',
              description: null,
              imageUrl: null,
              marketplace: 'shopee',
              marketplaceUrl: 'https://example.com/c',
              maxQuantity: 2,
              confirmedQuantity: 0,
              isBlocked: true,
              sortOrder: 3,
            },
          ],
        }),
      } as any,
      new GiftPayloadMapperService()
    )

    const response = await service.listPublicGifts('babyshower2026event1')

    assert.equal(response.meta.eventCode, 'babyshower2026event1')
    assert.equal(response.meta.total, 3)
    assert.equal(response.data[0].status, 'available')
    assert.equal(response.data[0].remainingQuantity, 2)
    assert.equal(response.data[1].status, 'limit_reached')
    assert.equal(response.data[1].remainingQuantity, 0)
    assert.equal(response.data[2].status, 'blocked')
    assert.equal(response.data[2].remainingQuantity, 2)
  })

  test('returns empty list when event exists without gifts', async ({ assert }) => {
    const service = new GiftService(
      {
        findPublicByEventCode: async () => ({
          eventFound: true,
          gifts: [],
        }),
      } as any,
      new GiftPayloadMapperService()
    )

    const response = await service.listPublicGifts('babyshower2026event1')

    assert.deepEqual(response.data, [])
    assert.equal(response.meta.total, 0)
  })

  test('throws EVENT_NOT_FOUND when event does not exist', async ({ assert }) => {
    const service = new GiftService(
      {
        findPublicByEventCode: async () => ({
          eventFound: false,
          gifts: [],
        }),
      } as any,
      new GiftPayloadMapperService()
    )

    try {
      await service.listPublicGifts('missingeventcode')
      assert.fail('Expected EventNotFoundException to be thrown')
    } catch (error) {
      assert.instanceOf(error, EventNotFoundException)
      assert.equal((error as EventNotFoundException).errors[0]?.code, 'EVENT_NOT_FOUND')
    }
  })

  test('throws GIFT_LIST_FETCH_FAILED when repository fails', async ({ assert }) => {
    const service = new GiftService(
      {
        findPublicByEventCode: async () => {
          throw new Error('db down')
        },
      } as any,
      new GiftPayloadMapperService()
    )

    try {
      await service.listPublicGifts('babyshower2026event1')
      assert.fail('Expected GiftListFetchFailedException to be thrown')
    } catch (error) {
      assert.instanceOf(error, GiftListFetchFailedException)
      assert.equal(
        (error as GiftListFetchFailedException).errors[0]?.code,
        'GIFT_LIST_FETCH_FAILED'
      )
    }
  })

  test('forwards list filters to repository', async ({ assert }) => {
    const captured: Array<unknown> = []
    const service = new GiftService(
      {
        findPublicByEventCode: async (...args: unknown[]) => {
          captured.push(...args)

          return {
            eventFound: true,
            gifts: [],
          }
        },
      } as any,
      new GiftPayloadMapperService()
    )

    await service.listPublicGifts('babyshower2026event1', {
      search: 'fralda',
      marketplace: 'amazon',
      sortBy: 'name',
      sortDir: 'asc',
    })

    assert.equal(captured[0], 'babyshower2026event1')
    assert.deepEqual(captured[1], {
      search: 'fralda',
      marketplace: 'amazon',
      sortBy: 'name',
      sortDir: 'asc',
    })
  })
})
