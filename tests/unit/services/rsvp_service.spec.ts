import { test } from '@japa/runner'

import {
  RsvpAlreadyConfirmedException,
  RsvpEventUnavailableException,
} from '#exceptions/domain_exceptions'
import { BestEffortNotificationService } from '#services/best_effort_notification_service'
import { AppDataSource } from '#services/database_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { RsvpService } from '#services/rsvp_service'

test.group('RsvpService', () => {
  test('confirms presence with companion batch insert and stable response payload', async ({
    assert,
  }) => {
    let createManyCallCount = 0

    const service = new RsvpService(
      { findMailContextByCode: async () => ({ id: 10, name: 'Evento', adminEmail: null }) } as any,
      {
        existsByEventAndEmail: async () => false,
        createGuest: async () => ({
          id: 99,
          fullName: 'Convidado Exemplo',
          email: 'convidado@example.com',
          confirmedAt: new Date('2026-04-04T12:00:00.000Z'),
        }),
      } as any,
      {
        createManyByGuestId: async (
          _eventId: number,
          _guestId: number,
          companions: Array<{ fullName: string; email: string }>
        ) => {
          createManyCallCount += 1
          assert.deepEqual(companions, [
            { fullName: 'Acompanhante 1', email: 'acompanhante1@example.com' },
            { fullName: 'Acompanhante 2', email: 'acompanhante2@example.com' },
          ])

          return companions
        },
      } as any,
      {
        sendGuestConfirmation: async () => {},
        sendAdminNotification: async () => {},
        sendCompanionConfirmation: async () => {},
      } as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => {
      return callback({})
    }

    try {
      const response = await service.confirmPresence('eventcode123', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [
          { fullName: 'Acompanhante 1', email: 'acompanhante1@example.com' },
          { fullName: 'Acompanhante 2', email: 'acompanhante2@example.com' },
        ],
      })

      assert.equal(createManyCallCount, 1)
      assert.deepEqual(response, {
        data: {
          guestId: 99,
          fullName: 'Convidado Exemplo',
          email: 'convidado@example.com',
          companionsCount: 2,
          confirmedAt: '2026-04-04T12:00:00.000Z',
        },
        meta: {
          emailDispatch: 'queued_or_best_effort',
        },
      })
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('throws RSVP_EVENT_UNAVAILABLE when no active event exists', async ({ assert }) => {
    const service = new RsvpService(
      { findMailContextByCode: async () => null } as any,
      { existsByEventAndEmail: async () => false } as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    try {
      await service.confirmPresence('missingcode', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [],
      })
      assert.fail('Expected RsvpEventUnavailableException')
    } catch (error) {
      assert.instanceOf(error, RsvpEventUnavailableException)
      assert.equal(
        (error as RsvpEventUnavailableException).errors[0]?.code,
        'RSVP_EVENT_UNAVAILABLE'
      )
    }
  })

  test('maps unique violation to RSVP_ALREADY_CONFIRMED', async ({ assert }) => {
    const service = new RsvpService(
      { findMailContextByCode: async () => ({ id: 10, name: 'Evento', adminEmail: null }) } as any,
      { existsByEventAndEmail: async () => false } as any,
      {} as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async () => {
      const error = new Error('duplicate key') as Error & { code: string }
      error.code = '23505'
      throw error
    }

    try {
      await service.confirmPresence('eventcode123', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [],
      })
      assert.fail('Expected RsvpAlreadyConfirmedException')
    } catch (error) {
      assert.instanceOf(error, RsvpAlreadyConfirmedException)
      assert.equal(
        (error as RsvpAlreadyConfirmedException).errors[0]?.code,
        'RSVP_ALREADY_CONFIRMED'
      )
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('does not fail confirmation when notification dispatch fails', async ({ assert }) => {
    const service = new RsvpService(
      { findMailContextByCode: async () => ({ id: 10, name: 'Evento', adminEmail: null }) } as any,
      {
        existsByEventAndEmail: async () => false,
        createGuest: async () => ({
          id: 100,
          fullName: 'Convidado Exemplo',
          email: 'convidado@example.com',
          confirmedAt: new Date('2026-04-04T15:00:00.000Z'),
        }),
      } as any,
      { createManyByGuestId: async () => [] } as any,
      {
        sendGuestConfirmation: async () => {
          throw new Error('smtp failed')
        },
        sendAdminNotification: async () => {
          throw new Error('smtp failed')
        },
        sendCompanionConfirmation: async () => {
          throw new Error('smtp failed')
        },
      } as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    const originalTransaction = AppDataSource.transaction.bind(AppDataSource)
    ;(AppDataSource as any).transaction = async (
      callback: (manager: unknown) => Promise<unknown>
    ) => {
      return callback({})
    }

    try {
      const response = await service.confirmPresence('eventcode123', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [],
      })

      assert.equal(response.data.guestId, 100)
      assert.equal(response.meta.emailDispatch, 'queued_or_best_effort')
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })

  test('limits companions to max 2 in service layer', async ({ assert }) => {
    const service = new RsvpService(
      { findMailContextByCode: async () => ({ id: 10, name: 'Evento', adminEmail: null }) } as any,
      { existsByEventAndEmail: async () => false } as any,
      { createManyByGuestId: async () => [] } as any,
      {} as any,
      new BestEffortNotificationService(),
      new InputSanitizerService()
    )

    try {
      await service.confirmPresence('eventcode123', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [
          { fullName: 'Comp 1', email: 'comp1@example.com' },
          { fullName: 'Comp 2', email: 'comp2@example.com' },
          { fullName: 'Comp 3', email: 'comp3@example.com' },
        ],
      })
      assert.fail('Expected validation error for max companions')
    } catch (error) {
      assert.equal((error as { status?: number }).status, 422)
    }
  })

  test('sends companion email only for newly inserted companions', async ({ assert }) => {
    const sentCompanions: string[] = []

    const service = new RsvpService(
      { findMailContextByCode: async () => ({ id: 10, name: 'Evento', adminEmail: null }) } as any,
      {
        existsByEventAndEmail: async () => false,
        createGuest: async () => ({
          id: 99,
          fullName: 'Convidado Exemplo',
          email: 'convidado@example.com',
          confirmedAt: new Date('2026-04-04T12:00:00.000Z'),
        }),
      } as any,
      {
        createManyByGuestId: async () => [
          { fullName: 'Acompanhante 2', email: 'comp2@example.com' },
        ],
      } as any,
      {
        sendGuestConfirmation: async () => {},
        sendAdminNotification: async () => {},
        sendCompanionConfirmation: async (_payload: unknown, companion: { email: string }) => {
          sentCompanions.push(companion.email)
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
      const response = await service.confirmPresence('eventcode123', {
        fullName: 'Convidado Exemplo',
        email: 'convidado@example.com',
        companions: [
          { fullName: 'Acompanhante 1', email: 'comp1@example.com' },
          { fullName: 'Acompanhante 2', email: 'comp2@example.com' },
        ],
      })

      assert.deepEqual(sentCompanions, ['comp2@example.com'])
      assert.equal(response.data.companionsCount, 1)
    } finally {
      ;(AppDataSource as any).transaction = originalTransaction
    }
  })
})
