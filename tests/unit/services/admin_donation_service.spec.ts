import { test } from '@japa/runner'

import { AdminDonationListFetchFailedException } from '#exceptions/domain_exceptions'
import { AdminDonationService } from '#services/admin_donation_service'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { DonationPayloadMapperService } from '#services/donation_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('AdminDonationService', () => {
  test('lists donations with summary and pagination metadata', async ({ assert }) => {
    const service = new AdminDonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminDonations: async () => [
          {
            donationId: 1,
            donorName: 'Maria Souza',
            donorEmail: 'maria@email.com',
            amount: 120.5,
            pixDestination: 'mom',
            donatedAt: new Date('2026-06-20T13:10:00.000Z'),
          },
        ],
        countAdminDonations: async () => 1,
        summarizeAdminDonations: async () => ({
          donations: 1,
          declaredAmountTotal: 120.5,
          declaredAmountAverage: 120.5,
          donorsUnique: 1,
        }),
      } as any,
      new DonationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({ page: 1, perPage: 20 })

    assert.equal(response.data.length, 1)
    assert.equal(response.data[0].donorName, 'Maria Souza')
    assert.equal(response.meta.total, 1)
    assert.equal(response.meta.totalPages, 1)
    assert.equal(response.meta.summary.donations, 1)
    assert.equal(response.meta.summary.declaredAmountTotal, 120.5)
    assert.equal(response.meta.summary.declaredAmountAverage, 120.5)
    assert.equal(response.meta.summary.donorsUnique, 1)
  })

  test('returns stable empty response when no event exists', async ({ assert }) => {
    const service = new AdminDonationService(
      {
        findLatestEventId: async () => null,
      } as any,
      {} as any,
      new DonationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const response = await service.list({})

    assert.deepEqual(response.data, [])
    assert.equal(response.meta.total, 0)
    assert.equal(response.meta.summary.declaredAmountTotal, 0)
  })

  test('throws 422 when donatedFrom is greater than donatedTo', async ({ assert }) => {
    const service = new AdminDonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
      new DonationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.list({
        donatedFrom: '2026-06-30T23:59:59.999Z',
        donatedTo: '2026-06-01T00:00:00.000Z',
      })
      assert.fail('Expected validation error for invalid date range')
    } catch (error) {
      assert.equal((error as { status?: number }).status, 422)
      assert.equal(
        (error as { errors?: Array<{ code?: string }> }).errors?.[0]?.code,
        'INVALID_DONATION_FILTER_RANGE'
      )
    }
  })

  test('throws ADMIN_DONATION_LIST_FETCH_FAILED when repository fails', async ({ assert }) => {
    const service = new AdminDonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminDonations: async () => {
          throw new Error('db down')
        },
        countAdminDonations: async () => 0,
        summarizeAdminDonations: async () => ({
          donations: 0,
          declaredAmountTotal: 0,
          declaredAmountAverage: 0,
          donorsUnique: 0,
        }),
      } as any,
      new DonationPayloadMapperService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.list({})
      assert.fail('Expected AdminDonationListFetchFailedException')
    } catch (error) {
      assert.instanceOf(error, AdminDonationListFetchFailedException)
      assert.equal(
        (error as AdminDonationListFetchFailedException).errors[0]?.code,
        'ADMIN_DONATION_LIST_FETCH_FAILED'
      )
    }
  })
})
