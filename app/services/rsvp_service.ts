import { QueryFailedError } from 'typeorm'

import { ErrorCode } from '#constants/error_code'
import {
  RsvpAlreadyConfirmedException,
  RsvpEventUnavailableException,
  RsvpPersistFailedException,
} from '#exceptions/domain_exceptions'
import { validationError } from '#exceptions/error_factory'
import { EventRepository } from '#repositories/event_repository'
import { GuestRepository } from '#repositories/guest_repository'
import { BestEffortNotificationService } from '#services/best_effort_notification_service'
import { CompanionRepository, type CompanionCreateInput } from '#repositories/companion_repository'
import { AppDataSource } from '#services/database_service'
import { RsvpNotificationService } from '#services/rsvp_notification_service'

type ConfirmPresenceInput = {
  fullName: string
  email: string
  companions: Array<{
    fullName: string
    email: string
  }>
}

type ConfirmPresenceResponse = {
  data: {
    guestId: number
    fullName: string
    email: string
    companionsCount: number
    confirmedAt: string
  }
  meta: {
    emailDispatch: 'queued_or_best_effort'
  }
}

export class RsvpService {
  private static readonly MAX_COMPANIONS_PER_GUEST = 2

  constructor(
    private readonly eventRepository: EventRepository = new EventRepository(),
    private readonly guestRepository: GuestRepository = new GuestRepository(),
    private readonly companionRepository: CompanionRepository = new CompanionRepository(),
    private readonly notificationService: RsvpNotificationService = new RsvpNotificationService(),
    private readonly bestEffortNotificationService: BestEffortNotificationService =
      new BestEffortNotificationService()
  ) {}

  async confirmPresence(
    eventCode: string,
    input: ConfirmPresenceInput
  ): Promise<ConfirmPresenceResponse> {
    const normalizedInput = this.normalizeInput(input)
    if (normalizedInput.companions.length > RsvpService.MAX_COMPANIONS_PER_GUEST) {
      throw validationError([
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: 'companions',
          message: `A maximum of ${RsvpService.MAX_COMPANIONS_PER_GUEST} companions is allowed`,
        },
      ])
    }

    const eventId = await this.eventRepository.findEventIdByCode(eventCode)

    if (!eventId) {
      throw new RsvpEventUnavailableException()
    }

    const alreadyConfirmed = await this.guestRepository.existsByEventAndEmail(
      eventId,
      normalizedInput.email
    )
    if (alreadyConfirmed) {
      throw new RsvpAlreadyConfirmedException()
    }

    try {
      const { guest: createdGuest, insertedCompanions } = await AppDataSource.transaction(
        async (manager) => {
          const guest = await this.guestRepository.createGuest(
            {
              eventId,
              fullName: normalizedInput.fullName,
              email: normalizedInput.email,
            },
            manager
          )

          const companions = await this.companionRepository.createManyByGuestId(
            eventId,
            guest.id,
            normalizedInput.companions,
            manager
          )

          return { guest, insertedCompanions: companions }
        }
      )

      await this.dispatchNotificationsBestEffort({
        guestFullName: createdGuest.fullName,
        guestEmail: createdGuest.email,
        companions: insertedCompanions,
        confirmedAt: createdGuest.confirmedAt,
      })

      return {
        data: {
          guestId: createdGuest.id,
          fullName: createdGuest.fullName,
          email: createdGuest.email,
          companionsCount: insertedCompanions.length,
          confirmedAt: createdGuest.confirmedAt.toISOString(),
        },
        meta: {
          emailDispatch: 'queued_or_best_effort',
        },
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new RsvpAlreadyConfirmedException()
      }

      if (error instanceof RsvpAlreadyConfirmedException) {
        throw error
      }

      throw new RsvpPersistFailedException()
    }
  }

  private async dispatchNotificationsBestEffort(payload: {
    guestFullName: string
    guestEmail: string
    companions: Array<{
      fullName: string
      email: string
    }>
    confirmedAt: Date
  }) {
    await this.bestEffortNotificationService.dispatch('rsvp_notification', [
      {
        label: 'guest_confirmation',
        execute: () => this.notificationService.sendGuestConfirmation(payload),
      },
      {
        label: 'admin_notification',
        execute: () => this.notificationService.sendAdminNotification(payload),
      },
      ...payload.companions.map((companion) => ({
        label: `companion_confirmation:${companion.email}`,
        execute: () => this.notificationService.sendCompanionConfirmation(payload, companion),
      })),
    ])
  }

  private isUniqueViolation(error: unknown): boolean {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as { code?: string } | undefined
      return driverError?.code === '23505'
    }

    if (error instanceof Error) {
      const maybeCode = (error as Error & { code?: string }).code
      return maybeCode === '23505'
    }

    return false
  }

  private normalizeInput(input: ConfirmPresenceInput): ConfirmPresenceInput {
    const companions: CompanionCreateInput[] = input.companions.map((companion) => ({
      fullName: companion.fullName.trim(),
      email: companion.email.trim().toLowerCase(),
    }))

    return {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      companions,
    }
  }
}
