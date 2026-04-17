import { test } from '@japa/runner'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { PurchaseNotificationService } from '#services/purchase_notification_service'
import { AppDataSource } from '#services/database_service'

test.group('POST /api/events/:eventCode/gifts/:giftId/confirm-purchase', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
    )
  })

  async function createEvent(code = 'purchaseeventcode123') {
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

  async function createGift(input?: Partial<Gift>) {
    const event = await createEvent()

    const gift = await AppDataSource.getRepository(Gift).save({
      eventId: event.id,
      name: 'Kit Mamadeiras',
      description: 'Kit de mamadeiras anticolica',
      imageUrl: null,
      marketplaceUrl: 'https://example.com/marketplace',
      marketplace: 'amazon',
      asin: null,
      affiliateLinkAmazon: null,
      affiliateLinkMl: null,
      affiliateLinkShopee: null,
      maxQuantity: 3,
      confirmedQuantity: 0,
      isBlocked: false,
      sortOrder: 1,
      ...input,
    })

    return { gift, event }
  }

  test('returns 201 and increments confirmed quantity with persisted confirmation', async ({
    client,
    assert,
  }) => {
    const { gift, event } = await createGift()

    const response = await client
      .post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`)
      .json({
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
        quantity: 1,
        orderNumber: 'MLB-123456',
        notes: 'Entrega no endereco do evento',
      })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        giftId: gift.id,
        quantity: 1,
      },
      meta: {
        emailDispatch: 'queued_or_best_effort',
      },
    })

    const updatedGift = await AppDataSource.getRepository(Gift).findOneByOrFail({ id: gift.id })
    assert.equal(updatedGift.confirmedQuantity, 1)

    const confirmations = await AppDataSource.getRepository(PurchaseConfirmation).find({
      where: { giftId: gift.id },
    })
    assert.equal(confirmations.length, 1)
    assert.equal(confirmations[0].guestEmail, 'convidado@email.com')
  })

  test('returns 404 with GIFT_NOT_FOUND when gift does not exist', async ({ client }) => {
    const event = await createEvent('purchasenotfound01')

    const response = await client
      .post(`/api/events/${event.code}/gifts/9999/confirm-purchase`)
      .json({
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
      })

    response.assertStatus(404)
    response.assertBodyContains({
      errors: [
        {
          code: 'GIFT_NOT_FOUND',
        },
      ],
    })
  })

  test('returns 409 with GIFT_BLOCKED when gift is blocked', async ({ client }) => {
    const { gift, event } = await createGift({ isBlocked: true })

    const response = await client
      .post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`)
      .json({
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
      })

    response.assertStatus(409)
    response.assertBodyContains({
      errors: [
        {
          code: 'GIFT_BLOCKED',
        },
      ],
    })
  })

  test('returns 409 with GIFT_LIMIT_EXCEEDED when quantity exceeds limit', async ({ client }) => {
    const { gift, event } = await createGift({ maxQuantity: 1, confirmedQuantity: 1 })

    const response = await client
      .post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`)
      .json({
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
        quantity: 1,
      })

    response.assertStatus(409)
    response.assertBodyContains({
      errors: [
        {
          code: 'GIFT_LIMIT_EXCEEDED',
        },
      ],
    })
  })

  test('returns 422 when payload is invalid', async ({ client }) => {
    const { gift, event } = await createGift()

    const response = await client
      .post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`)
      .json({
        guestName: 'X',
        guestEmail: 'invalid-email',
        quantity: 0,
      })

    response.assertStatus(422)
  })

  test('persists confirmation even when notification fails', async ({ client, assert }) => {
    const { gift, event } = await createGift()

    const originalMethod = PurchaseNotificationService.prototype.sendAdminPurchaseNotification
    PurchaseNotificationService.prototype.sendAdminPurchaseNotification = async () => {
      throw new Error('smtp failed')
    }

    try {
      const response = await client
        .post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`)
        .json({
          guestName: 'Convidado Exemplo',
          guestEmail: 'convidado@email.com',
        })

      response.assertStatus(201)

      const confirmations = await AppDataSource.getRepository(PurchaseConfirmation).find({
        where: { giftId: gift.id },
      })
      assert.equal(confirmations.length, 1)
    } finally {
      PurchaseNotificationService.prototype.sendAdminPurchaseNotification = originalMethod
    }
  })

  test('allows only one success in concurrent confirmations for the last available slot', async ({
    client,
    assert,
  }) => {
    const { gift, event } = await createGift({ maxQuantity: 1, confirmedQuantity: 0 })

    const [responseA, responseB] = await Promise.all([
      client.post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`).json({
        guestName: 'Convidado A',
        guestEmail: 'convidado.a@email.com',
        quantity: 1,
      }),
      client.post(`/api/events/${event.code}/gifts/${gift.id}/confirm-purchase`).json({
        guestName: 'Convidado B',
        guestEmail: 'convidado.b@email.com',
        quantity: 1,
      }),
    ])

    const statuses = [responseA.status(), responseB.status()].sort()
    assert.deepEqual(statuses, [201, 409])

    const updatedGift = await AppDataSource.getRepository(Gift).findOneByOrFail({ id: gift.id })
    assert.equal(updatedGift.confirmedQuantity, 1)

    const confirmations = await AppDataSource.getRepository(PurchaseConfirmation).find({
      where: { giftId: gift.id },
    })
    assert.equal(confirmations.length, 1)
  })
})
