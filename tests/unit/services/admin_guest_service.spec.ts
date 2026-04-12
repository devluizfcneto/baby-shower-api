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
        findAdminGuestConfirmations: async () => [
          {
            guestId: 1,
            fullName: 'Convidado 1',
            email: 'convidado1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            companionsCount: 2,
          },
          {
            guestId: 2,
            fullName: 'Convidado 2',
            email: 'convidado2@example.com',
            confirmedAt: new Date('2026-06-11T10:00:00.000Z'),
            companionsCount: 0,
          },
        ],
        countAdminGuestConfirmations: async () => 2,
        findCompanionsByGuestIds: async () => [],
      } as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({ page: 1, perPage: 20 })

    assert.equal(response.data.length, 2)
    assert.equal(response.data[0].totalPeople, 3)
    assert.equal(response.meta.summary.guests, 2)
    assert.equal(response.meta.summary.companions, 2)
    assert.equal(response.meta.summary.totalPeople, 4)
    assert.equal(response.meta.totalPages, 1)
  })

  test('includes companions only when expand is requested', async ({ assert }) => {
    let companionsLookupCalls = 0

    const service = new AdminGuestService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminGuestConfirmations: async () => [
          {
            guestId: 1,
            fullName: 'Convidado 1',
            email: 'convidado1@example.com',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
            companionsCount: 1,
          },
        ],
        countAdminGuestConfirmations: async () => 1,
        findCompanionsByGuestIds: async () => {
          companionsLookupCalls += 1
          return [
            {
              id: 99,
              guestId: 1,
              fullName: 'Acompanhante 1',
            },
          ]
        },
      } as any,
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const withoutExpand = await service.list({})
    assert.equal(companionsLookupCalls, 0)
    assert.isUndefined(withoutExpand.data[0].companions)

    const withExpand = await service.list({ expand: 'companions' })
    assert.equal(companionsLookupCalls, 1)
    assert.equal(withExpand.data[0].companions?.length, 1)
    assert.equal(withExpand.data[0].companions?.[0].fullName, 'Acompanhante 1')
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
