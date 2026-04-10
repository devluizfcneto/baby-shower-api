import { test } from '@japa/runner'

import {
  GiftHasPurchaseConfirmationsException,
  GiftMaxQuantityLowerThanConfirmedException,
  GiftNotFoundException,
} from '#exceptions/domain_exceptions'
import { AdminGiftService } from '#services/admin_gift_service'
import { GiftPayloadMapperService } from '#services/gift_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('AdminGiftService', () => {
  test('lists admin gifts with stable DTO', async ({ assert }) => {
    const service = new AdminGiftService(
      {} as any,
      {
        findAdminByLatestEvent: async () => [
          {
            id: 1,
            eventId: 10,
            name: 'Fraldas RN',
            description: null,
            imageUrl: null,
            marketplace: 'amazon',
            marketplaceUrl: 'https://example.com/a',
            asin: null,
            affiliateLinkAmazon: null,
            affiliateLinkMl: null,
            affiliateLinkShopee: null,
            maxQuantity: 3,
            confirmedQuantity: 1,
            isBlocked: false,
            sortOrder: 1,
            createdAt: new Date('2026-04-10T10:00:00.000Z'),
            updatedAt: new Date('2026-04-10T11:00:00.000Z'),
          },
        ],
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    const response = await service.list()

    assert.equal(response.meta.total, 1)
    assert.equal(response.data[0].name, 'Fraldas RN')
    assert.equal(response.data[0].status, 'available')
    assert.equal(response.data[0].remainingQuantity, 2)
  })

  test('creates a gift for latest event', async ({ assert }) => {
    const service = new AdminGiftService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        createGift: async (input: any) => ({
          id: 2,
          eventId: input.eventId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          marketplace: input.marketplace,
          marketplaceUrl: input.marketplaceUrl,
          asin: input.asin,
          affiliateLinkAmazon: input.affiliateLinkAmazon,
          affiliateLinkMl: input.affiliateLinkMl,
          affiliateLinkShopee: input.affiliateLinkShopee,
          maxQuantity: input.maxQuantity,
          confirmedQuantity: 0,
          isBlocked: false,
          sortOrder: input.sortOrder,
          createdAt: new Date('2026-04-10T10:00:00.000Z'),
          updatedAt: new Date('2026-04-10T10:00:00.000Z'),
        }),
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    const response = await service.create({
      name: 'Fraldas RN',
      marketplace: 'amazon',
      marketplaceUrl: 'https://example.com/a',
      maxQuantity: 10,
    })

    assert.equal(response.data.eventId, 10)
    assert.equal(response.data.name, 'Fraldas RN')
    assert.equal(response.data.maxQuantity, 10)
  })

  test('throws when maxQuantity is lower than confirmedQuantity', async ({ assert }) => {
    const service = new AdminGiftService(
      {} as any,
      {
        findById: async () => ({
          id: 1,
          eventId: 10,
          name: 'Fraldas RN',
          description: null,
          imageUrl: null,
          marketplace: 'amazon',
          marketplaceUrl: 'https://example.com/a',
          asin: null,
          affiliateLinkAmazon: null,
          affiliateLinkMl: null,
          affiliateLinkShopee: null,
          maxQuantity: 5,
          confirmedQuantity: 4,
          isBlocked: false,
          sortOrder: 1,
          createdAt: new Date('2026-04-10T10:00:00.000Z'),
          updatedAt: new Date('2026-04-10T10:00:00.000Z'),
        }),
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    try {
      await service.update(1, { maxQuantity: 3 })
      assert.fail('Expected GiftMaxQuantityLowerThanConfirmedException')
    } catch (error) {
      assert.instanceOf(error, GiftMaxQuantityLowerThanConfirmedException)
    }
  })

  test('toggle block is idempotent when state is already equal', async ({ assert }) => {
    const service = new AdminGiftService(
      {} as any,
      {
        findById: async () => ({
          id: 1,
          eventId: 10,
          name: 'Fraldas RN',
          description: null,
          imageUrl: null,
          marketplace: 'amazon',
          marketplaceUrl: 'https://example.com/a',
          asin: null,
          affiliateLinkAmazon: null,
          affiliateLinkMl: null,
          affiliateLinkShopee: null,
          maxQuantity: 5,
          confirmedQuantity: 0,
          isBlocked: true,
          sortOrder: 1,
          createdAt: new Date('2026-04-10T10:00:00.000Z'),
          updatedAt: new Date('2026-04-10T10:00:00.000Z'),
        }),
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    const response = await service.toggleBlock(1, true)

    assert.equal(response.data.id, 1)
    assert.equal(response.data.isBlocked, true)
    assert.equal(response.data.status, 'blocked')
  })

  test('delete prevents removing gift with confirmations', async ({ assert }) => {
    const service = new AdminGiftService(
      {} as any,
      {
        findById: async () => ({
          id: 1,
          eventId: 10,
          name: 'Fraldas RN',
          description: null,
          imageUrl: null,
          marketplace: 'amazon',
          marketplaceUrl: 'https://example.com/a',
          asin: null,
          affiliateLinkAmazon: null,
          affiliateLinkMl: null,
          affiliateLinkShopee: null,
          maxQuantity: 5,
          confirmedQuantity: 0,
          isBlocked: false,
          sortOrder: 1,
          createdAt: new Date('2026-04-10T10:00:00.000Z'),
          updatedAt: new Date('2026-04-10T10:00:00.000Z'),
        }),
        hasPurchaseConfirmations: async () => true,
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    try {
      await service.delete(1)
      assert.fail('Expected GiftHasPurchaseConfirmationsException')
    } catch (error) {
      assert.instanceOf(error, GiftHasPurchaseConfirmationsException)
    }
  })

  test('throws GIFT_NOT_FOUND when deleting missing gift', async ({ assert }) => {
    const service = new AdminGiftService(
      {} as any,
      {
        findById: async () => null,
      } as any,
      new GiftPayloadMapperService(),
      new InputSanitizerService()
    )

    try {
      await service.delete(999)
      assert.fail('Expected GiftNotFoundException')
    } catch (error) {
      assert.instanceOf(error, GiftNotFoundException)
    }
  })
})
