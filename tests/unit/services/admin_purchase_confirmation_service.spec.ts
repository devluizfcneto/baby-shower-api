import { test } from '@japa/runner'

import { AdminPurchaseConfirmationListFetchFailedException } from '#exceptions/domain_exceptions'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { AdminPurchaseConfirmationService } from '#services/admin_purchase_confirmation_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { PurchaseConfirmationPayloadMapperService } from '#services/purchase_confirmation_payload_mapper_service'

test.group('AdminPurchaseConfirmationService', () => {
  test('lists confirmations with summary and pagination metadata', async ({ assert }) => {
    const service = new AdminPurchaseConfirmationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminPurchaseConfirmations: async () => [
          {
            confirmationId: 1,
            giftId: 10,
            giftName: 'Fralda RN Premium',
            marketplace: 'amazon',
            guestName: 'Joao Silva',
            guestEmail: 'joao@email.com',
            orderNumber: 'ORD-1',
            quantity: 2,
            notes: null,
            confirmedAt: new Date('2026-06-15T14:30:00.000Z'),
          },
        ],
        countAdminPurchaseConfirmations: async () => 1,
        summarizeAdminPurchaseConfirmations: async () => ({
          confirmations: 1,
          unitsConfirmed: 2,
          buyersUnique: 1,
        }),
      } as any,
      new PurchaseConfirmationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({ page: 1, perPage: 20 })

    assert.equal(response.data.length, 1)
    assert.equal(response.data[0].giftName, 'Fralda RN Premium')
    assert.equal(response.meta.total, 1)
    assert.equal(response.meta.totalPages, 1)
    assert.equal(response.meta.summary.confirmations, 1)
    assert.equal(response.meta.summary.unitsConfirmed, 2)
    assert.equal(response.meta.summary.buyersUnique, 1)
  })

  test('returns stable empty response when no event exists', async ({ assert }) => {
    const service = new AdminPurchaseConfirmationService(
      {
        findLatestEventId: async () => null,
      } as any,
      {} as any,
      new PurchaseConfirmationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({})

    assert.deepEqual(response.data, [])
    assert.equal(response.meta.total, 0)
    assert.equal(response.meta.summary.unitsConfirmed, 0)
  })

  test('throws 422 when confirmedFrom is greater than confirmedTo', async ({ assert }) => {
    const service = new AdminPurchaseConfirmationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
      new PurchaseConfirmationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.list({
        confirmedFrom: '2026-06-30T23:59:59.999Z',
        confirmedTo: '2026-06-01T00:00:00.000Z',
      })
      assert.fail('Expected validation error for invalid date range')
    } catch (error) {
      assert.equal((error as { status?: number }).status, 422)
    }
  })

  test('throws ADMIN_PURCHASE_CONFIRMATION_LIST_FETCH_FAILED when repository fails', async ({
    assert,
  }) => {
    const service = new AdminPurchaseConfirmationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminPurchaseConfirmations: async () => {
          throw new Error('db down')
        },
        countAdminPurchaseConfirmations: async () => 0,
        summarizeAdminPurchaseConfirmations: async () => ({
          confirmations: 0,
          unitsConfirmed: 0,
          buyersUnique: 0,
        }),
      } as any,
      new PurchaseConfirmationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.list({})
      assert.fail('Expected AdminPurchaseConfirmationListFetchFailedException')
    } catch (error) {
      assert.instanceOf(error, AdminPurchaseConfirmationListFetchFailedException)
      assert.equal(
        (error as AdminPurchaseConfirmationListFetchFailedException).errors[0]?.code,
        'ADMIN_PURCHASE_CONFIRMATION_LIST_FETCH_FAILED'
      )
    }
  })
})
