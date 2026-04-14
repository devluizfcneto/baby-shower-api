import { test } from '@japa/runner'

import {
  GiftBlockedException,
  GiftLimitExceededException,
  GiftNotFoundException,
  PurchaseConfirmationPersistFailedException,
} from '#exceptions/domain_exceptions'
import { BestEffortNotificationService } from '#services/best_effort_notification_service'
import { AppDataSource } from '#services/database_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { PurchaseConfirmationService } from '#services/purchase_confirmation_service'

test.group('PurchaseConfirmationService', () => {
  test('confirms purchase and returns stable DTO', async ({ assert }) => {
    let updatedQuantity = 0

    const service = new PurchaseConfirmationService(
      {} as any,
      {
        findByIdForUpdate: async () => ({
          id: 10,
          name: 'Kit Mamadeiras',
          maxQuantity: 3,
          confirmedQuantity: 1,
          isBlocked: false,
        }),
        updateConfirmedQuantity: async (_giftId: number, quantity: number) => {
          updatedQuantity = quantity
        },
      } as any,
      {
        createConfirmation: async () => ({
          id: 321,
          giftId: 10,
          guestName: 'Convidado Exemplo',
          guestEmail: 'convidado@email.com',
          quantity: 1,
          orderNumber: 'MLB-123456',
          notes: null,
          confirmedAt: new Date('2026-04-04T18:00:00.000Z'),
        }),
      } as any,
      {
        sendAdminPurchaseNotification: async () => {},
      } as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => callback({})

    try {
      const response = await service.confirmPurchase(10, {
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
        quantity: 1,
        orderNumber: 'MLB-123456',
      })

      assert.equal(updatedQuantity, 2)
      assert.deepEqual(response, {
        data: {
          confirmationId: 321,
          giftId: 10,
          giftName: 'Kit Mamadeiras',
          guestName: 'Convidado Exemplo',
          guestEmail: 'convidado@email.com',
          quantity: 1,
          orderNumber: 'MLB-123456',
          confirmedAt: '2026-04-04T18:00:00.000Z',
          gift: {
            maxQuantity: 3,
            confirmedQuantity: 2,
            remainingQuantity: 1,
            status: 'available',
          },
        },
        meta: {
          emailDispatch: 'queued_or_best_effort',
        },
      })
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('throws GIFT_NOT_FOUND when gift does not exist', async ({ assert }) => {
    const service = new PurchaseConfirmationService(
      {} as any,
      {
        findByIdForUpdate: async () => null,
      } as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => callback({})

    try {
      await service.confirmPurchase(999, {
        guestName: 'Convidado',
        guestEmail: 'convidado@email.com',
      })
      assert.fail('Expected GiftNotFoundException')
    } catch (error) {
      assert.instanceOf(error, GiftNotFoundException)
      assert.equal((error as GiftNotFoundException).errors[0]?.code, 'GIFT_NOT_FOUND')
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('throws GIFT_BLOCKED when gift is blocked', async ({ assert }) => {
    const service = new PurchaseConfirmationService(
      {} as any,
      {
        findByIdForUpdate: async () => ({
          id: 10,
          name: 'Kit',
          maxQuantity: 3,
          confirmedQuantity: 0,
          isBlocked: true,
        }),
      } as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => callback({})

    try {
      await service.confirmPurchase(10, {
        guestName: 'Convidado',
        guestEmail: 'convidado@email.com',
      })
      assert.fail('Expected GiftBlockedException')
    } catch (error) {
      assert.instanceOf(error, GiftBlockedException)
      assert.equal((error as GiftBlockedException).errors[0]?.code, 'GIFT_BLOCKED')
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('throws GIFT_LIMIT_EXCEEDED when requested quantity exceeds limit', async ({ assert }) => {
    const service = new PurchaseConfirmationService(
      {} as any,
      {
        findByIdForUpdate: async () => ({
          id: 10,
          name: 'Kit',
          maxQuantity: 2,
          confirmedQuantity: 2,
          isBlocked: false,
        }),
      } as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => callback({})

    try {
      await service.confirmPurchase(10, {
        guestName: 'Convidado',
        guestEmail: 'convidado@email.com',
        quantity: 1,
      })
      assert.fail('Expected GiftLimitExceededException')
    } catch (error) {
      assert.instanceOf(error, GiftLimitExceededException)
      assert.equal((error as GiftLimitExceededException).errors[0]?.code, 'GIFT_LIMIT_EXCEEDED')
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('does not fail when notification dispatch fails', async ({ assert }) => {
    const service = new PurchaseConfirmationService(
      {} as any,
      {
        findByIdForUpdate: async () => ({
          id: 10,
          name: 'Kit Mamadeiras',
          maxQuantity: 3,
          confirmedQuantity: 1,
          isBlocked: false,
        }),
        updateConfirmedQuantity: async () => {},
      } as any,
      {
        createConfirmation: async () => ({
          id: 111,
          giftId: 10,
          guestName: 'Convidado Exemplo',
          guestEmail: 'convidado@email.com',
          quantity: 1,
          orderNumber: null,
          notes: null,
          confirmedAt: new Date('2026-04-04T18:00:00.000Z'),
        }),
      } as any,
      {
        sendAdminPurchaseNotification: async () => {
          throw new Error('smtp failed')
        },
      } as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => callback({})

    try {
      const response = await service.confirmPurchase(10, {
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
      })

      assert.equal(response.data.confirmationId, 111)
      assert.equal(response.meta.emailDispatch, 'queued_or_best_effort')
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('maps unknown persistence failures to PURCHASE_CONFIRMATION_PERSIST_FAILED', async ({
    assert,
  }) => {
    const service = new PurchaseConfirmationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async () => {
      throw new Error('db down')
    }

    try {
      await service.confirmPurchase(10, {
        guestName: 'Convidado Exemplo',
        guestEmail: 'convidado@email.com',
      })
      assert.fail('Expected PurchaseConfirmationPersistFailedException')
    } catch (error) {
      assert.instanceOf(error, PurchaseConfirmationPersistFailedException)
      assert.equal(
        (error as PurchaseConfirmationPersistFailedException).errors[0]?.code,
        'PURCHASE_CONFIRMATION_PERSIST_FAILED'
      )
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })
})
