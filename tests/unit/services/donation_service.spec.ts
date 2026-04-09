import { test } from '@japa/runner'

import {
  DonationEventUnavailableException,
  DonationPersistFailedException,
} from '#exceptions/domain_exceptions'
import { DonationService } from '#services/donation_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('DonationService', () => {
  test('registers donation and returns stable DTO', async ({ assert }) => {
    const service = new DonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        createDonation: async () => ({
          id: 901,
          donorName: 'Maria Oliveira',
          donorEmail: 'maria@email.com',
          amount: 150,
          pixDestination: 'mom',
          donatedAt: new Date('2026-04-09T20:00:00.000Z'),
        }),
      } as any,
      new InputSanitizerService()
    )

    const response = await service.registerDonation({
      donorName: '  Maria Oliveira  ',
      donorEmail: 'MARIA@EMAIL.COM',
      amount: 150,
      pixDestination: 'mom',
    })

    assert.deepEqual(response, {
      data: {
        donationId: 901,
        donorName: 'Maria Oliveira',
        donorEmail: 'maria@email.com',
        amount: 150,
        pixDestination: 'mom',
        donatedAt: '2026-04-09T20:00:00.000Z',
      },
    })
  })

  test('throws DONATION_EVENT_UNAVAILABLE when no event exists', async ({ assert }) => {
    const service = new DonationService(
      {
        findLatestEventId: async () => null,
      } as any,
      {} as any,
      new InputSanitizerService()
    )

    try {
      await service.registerDonation({
        donorName: 'Convidado sem evento',
      })
      assert.fail('Expected DonationEventUnavailableException')
    } catch (error) {
      assert.instanceOf(error, DonationEventUnavailableException)
      assert.equal(
        (error as DonationEventUnavailableException).errors[0]?.code,
        'DONATION_EVENT_UNAVAILABLE'
      )
    }
  })

  test('throws 422 when payload is semantically empty', async ({ assert }) => {
    const service = new DonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
      new InputSanitizerService()
    )

    try {
      await service.registerDonation({})
      assert.fail('Expected validation error')
    } catch (error) {
      assert.equal((error as { status?: number }).status, 422)
    }
  })

  test('maps repository failures to DONATION_PERSIST_FAILED', async ({ assert }) => {
    const service = new DonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        createDonation: async () => {
          throw new Error('db down')
        },
      } as any,
      new InputSanitizerService()
    )

    try {
      await service.registerDonation({
        donorName: 'Convidado Exemplo',
      })
      assert.fail('Expected DonationPersistFailedException')
    } catch (error) {
      assert.instanceOf(error, DonationPersistFailedException)
      assert.equal(
        (error as DonationPersistFailedException).errors[0]?.code,
        'DONATION_PERSIST_FAILED'
      )
    }
  })

  test('normalizes amount to two decimal places', async ({ assert }) => {
    let capturedAmount: number | null = null

    const service = new DonationService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        createDonation: async (input: { amount: number | null }) => {
          capturedAmount = input.amount
          return {
            id: 1,
            donorName: null,
            donorEmail: null,
            amount: input.amount,
            pixDestination: null,
            donatedAt: new Date('2026-04-09T20:00:00.000Z'),
          }
        },
      } as any,
      new InputSanitizerService()
    )

    await service.registerDonation({
      amount: 79.999,
    })

    assert.equal(capturedAmount, 80)
  })
})
