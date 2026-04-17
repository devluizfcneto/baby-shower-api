import { test } from '@japa/runner'

import { AdminGuestListFetchFailedException } from '#exceptions/domain_exceptions'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { AdminGuestService } from '#services/admin_guest_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('AdminGuestService', () => {
  test('lists guests with summary and pagination metadata', async ({ assert }) => {
    const service = new AdminGuestService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminConfirmedPeople: async () => [
          {
            personId: 1,
            guestId: 1,
            fullName: 'Convidado 1',
            email: 'convidado1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            personType: 'guest',
          },
          {
            personId: 2,
            guestId: 1,
            fullName: 'Acompanhante 1',
            email: 'acompanhante1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            personType: 'companion',
          },
          {
            personId: 3,
            guestId: 2,
            fullName: 'Convidado 2',
            email: 'convidado2@example.com',
            confirmedAt: new Date('2026-06-11T10:00:00.000Z'),
            personType: 'guest',
          },
        ],
        countAdminConfirmedPeople: async () => 3,
      } as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({ page: 1, perPage: 20 })

    assert.equal(response.data.length, 3)
    assert.equal(response.data[0].personType, 'guest')
    assert.equal(response.data[1].personType, 'companion')
    assert.equal(response.data[1].guestId, 1)
    assert.equal(response.meta.summary.guests, 2)
    assert.equal(response.meta.summary.companions, 1)
    assert.equal(response.meta.summary.totalPeople, 3)
    assert.equal(response.meta.totalPages, 1)
  })

  test('returns flattened confirmed people without needing expand', async ({ assert }) => {
    const service = new AdminGuestService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminConfirmedPeople: async () => [
          {
            personId: 1,
            guestId: 1,
            fullName: 'Convidado 1',
            email: 'convidado1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            personType: 'guest',
          },
          {
            personId: 2,
            guestId: 1,
            fullName: 'Acompanhante 1',
            email: 'acompanhante1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            personType: 'companion',
          },
        ],
        countAdminConfirmedPeople: async () => 2,
      } as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({})

    assert.equal(response.data.length, 2)
    assert.equal(response.data[0].personType, 'guest')
    assert.equal(response.data[1].personType, 'companion')
  })

  test('returns stable empty response when no event exists', async ({ assert }) => {
    const service = new AdminGuestService(
      {
        findLatestEventId: async () => null,
      } as any,
      {} as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({})

    assert.deepEqual(response.data, [])
    assert.equal(response.meta.total, 0)
    assert.equal(response.meta.summary.totalPeople, 0)
  })

  test('throws 422 when confirmedFrom is greater than confirmedTo', async ({ assert }) => {
    const service = new AdminGuestService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
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

  test('throws ADMIN_GUEST_LIST_FETCH_FAILED when repository fails', async ({ assert }) => {
    const service = new AdminGuestService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminGuestConfirmations: async () => {
          throw new Error('db down')
        },
        countAdminGuestConfirmations: async () => 0,
      } as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.list({})
      assert.fail('Expected AdminGuestListFetchFailedException')
    } catch (error) {
      assert.instanceOf(error, AdminGuestListFetchFailedException)
      assert.equal(
        (error as AdminGuestListFetchFailedException).errors[0]?.code,
        'ADMIN_GUEST_LIST_FETCH_FAILED'
      )
    }
  })
})
