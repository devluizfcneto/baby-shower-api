import { QueryFailedError } from 'typeorm'
import { inject } from '@adonisjs/core'

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
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { RsvpNotificationService } from '#services/rsvp_notification_service'

type ConfirmPresenceInput = {
  fullName: string
  email: string
  companions: Array<{
    fullName: string
    email?: string | null
  }>
}

type NormalizedCompanionInput = {
  fullName: string
  email: string | null
}

type NormalizedConfirmPresenceInput = {
  fullName: string
  email: string
  companions: NormalizedCompanionInput[]
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

@inject()
export class RsvpService {
  private static readonly MAX_COMPANIONS_PER_GUEST = 2

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly guestRepository: GuestRepository,
    private readonly companionRepository: CompanionRepository,
    private readonly notificationService: RsvpNotificationService,
    private readonly bestEffortNotificationService: BestEffortNotificationService,
    private readonly inputSanitizerService: InputSanitizerService
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
          message: 'A maximum of 2 companions is allowed',
        },
      ])
    }

    const eventContext = await this.eventRepository.findMailContextByCode(eventCode)

    if (!eventContext?.id) {
      throw new RsvpEventUnavailableException()
    }

    try {
      const existingGuest = await this.guestRepository.findByEventAndEmail(
        eventContext.id,
        normalizedInput.email
      )

      if (!existingGuest) {
        const alreadyConfirmed = await this.guestRepository.existsByEventAndEmail(
          eventContext.id,
          normalizedInput.email
        )
        if (alreadyConfirmed) {
          throw new RsvpAlreadyConfirmedException()
        }

        const { guest: createdGuest, insertedCompanions } = await AppDataSource.transaction(
          async (manager) => {
            const guest = await this.guestRepository.createGuest(
              {
                eventId: eventContext.id,
                fullName: normalizedInput.fullName,
                email: normalizedInput.email,
              },
              manager
            )

            const companions = await this.companionRepository.createManyByGuestId(
              eventContext.id,
              guest.id,
              normalizedInput.companions,
              manager
            )

            return { guest, insertedCompanions: companions }
          }
        )

        await this.dispatchNotificationsBestEffort({
          eventName: eventContext.name,
          eventStartAt: eventContext.date,
          eventVenueAddress: eventContext.venueAddress,
          adminEmail: eventContext.adminEmail,
          guestFullName: createdGuest.fullName,
          guestEmail: createdGuest.email,
          companions: insertedCompanions,
          companionRecipients: insertedCompanions
            .filter((companion) => Boolean(companion.email))
            .map((companion) => ({
              fullName: companion.fullName,
              email: companion.email as string,
            })),
          confirmedAt: createdGuest.confirmedAt,
          includeAdmin: true,
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
      }

      const existingCompanions = await this.companionRepository.findByGuestId(existingGuest.id)
      const newCompanions = this.filterNewCompanions(normalizedInput.companions, existingCompanions)

      const availableSlots = RsvpService.MAX_COMPANIONS_PER_GUEST - existingCompanions.length
      if (newCompanions.length > availableSlots) {
        throw validationError([
          {
            code: ErrorCode.UNPROCESSABLE_ENTITY,
            field: 'companions',
            message: 'A maximum of 2 companions is allowed',
          },
        ])
      }

      const insertedCompanions =
        newCompanions.length > 0
          ? await AppDataSource.transaction(async (manager) =>
              this.companionRepository.createManyByGuestId(
                eventContext.id,
                existingGuest.id,
                newCompanions,
                manager
              )
            )
          : []

      const allCompanions = [...existingCompanions, ...insertedCompanions]
      const totalCompanionsCount = allCompanions.length
      const companionRecipients = this.resolveCompanionRecipients(
        normalizedInput.companions,
        existingCompanions,
        insertedCompanions
      )

      await this.dispatchNotificationsBestEffort({
        eventName: eventContext.name,
        eventStartAt: eventContext.date,
        eventVenueAddress: eventContext.venueAddress,
        adminEmail: eventContext.adminEmail,
        guestFullName: existingGuest.fullName,
        guestEmail: existingGuest.email,
        companions: allCompanions,
        companionRecipients,
        confirmedAt: existingGuest.confirmedAt,
        includeAdmin: insertedCompanions.length > 0,
      })

      return {
        data: {
          guestId: existingGuest.id,
          fullName: existingGuest.fullName,
          email: existingGuest.email,
          companionsCount: totalCompanionsCount,
          confirmedAt: existingGuest.confirmedAt.toISOString(),
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
    eventName?: string
    eventStartAt?: Date
    eventVenueAddress?: string
    adminEmail?: string | null
    guestFullName: string
    guestEmail: string
    companions: Array<{
      fullName: string
      email?: string | null
    }>
    companionRecipients?: Array<{
      fullName: string
      email: string
    }>
    confirmedAt: Date
    includeAdmin?: boolean
  }) {
    const tasks = [] as Array<{ label: string; execute: () => Promise<void> }>

    if (payload.guestEmail) {
      tasks.push({
        label: 'guest_confirmation',
        execute: () => this.notificationService.sendGuestConfirmation(payload),
      })
    }

    if (payload.includeAdmin && payload.adminEmail) {
      tasks.push({
        label: 'admin_notification',
        execute: () => this.notificationService.sendAdminNotification(payload),
      })
    }

    const companionRecipients = payload.companionRecipients ?? payload.companions

    for (const companion of companionRecipients) {
      const email = companion.email
      if (typeof email !== 'string' || email.length === 0) {
        continue
      }

      tasks.push({
        label: `companion_confirmation:${email}`,
        execute: () =>
          this.notificationService.sendCompanionConfirmation(payload, {
            fullName: companion.fullName,
            email,
          }),
      })
    }

    if (tasks.length === 0) {
      return
    }

    await this.bestEffortNotificationService.dispatch('rsvp_notification', tasks)
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

  private normalizeInput(input: ConfirmPresenceInput): NormalizedConfirmPresenceInput {
    const companions: CompanionCreateInput[] = input.companions.map((companion) => ({
      fullName: this.inputSanitizerService.normalizeRequiredText(companion.fullName),
      email: this.inputSanitizerService.normalizeOptionalEmail(companion.email),
    }))

    return {
      fullName: this.inputSanitizerService.normalizeRequiredText(input.fullName),
      email: this.inputSanitizerService.normalizeEmail(input.email),
      companions,
    }
  }

  private filterNewCompanions(
    incoming: NormalizedCompanionInput[],
    existing: Array<{ fullName: string; email: string | null }>
  ): NormalizedCompanionInput[] {
    if (incoming.length === 0) {
      return []
    }

    const existingEmails = new Set(
      existing
        .map((companion) => companion.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    )

    const existingNames = new Set(
      existing.map((companion) => companion.fullName.trim().toLowerCase())
    )

    const uniqueByEmail = new Set<string>()
    const uniqueByName = new Set<string>()
    const result: NormalizedCompanionInput[] = []

    for (const companion of incoming) {
      const normalizedName = companion.fullName.trim().toLowerCase()
      const normalizedEmail = companion.email?.trim().toLowerCase() ?? null

      if (normalizedEmail) {
        if (existingEmails.has(normalizedEmail) || uniqueByEmail.has(normalizedEmail)) {
          continue
        }
        uniqueByEmail.add(normalizedEmail)
      } else if (existingNames.has(normalizedName) || uniqueByName.has(normalizedName)) {
        continue
      }

      uniqueByName.add(normalizedName)
      result.push({
        fullName: companion.fullName,
        email: companion.email,
      })
    }

    return result
  }

  private resolveCompanionRecipients(
    incoming: NormalizedCompanionInput[],
    existing: Array<{ fullName: string; email: string | null }>,
    inserted: Array<{ fullName: string; email: string | null }>
  ): Array<{ fullName: string; email: string }> {
    if (incoming.length === 0) {
      return []
    }

    const existingByEmail = new Map(
      existing
        .filter((companion) => Boolean(companion.email))
        .map((companion) => [companion.email?.trim().toLowerCase() ?? '', companion])
    )
    const existingByName = new Map(
      existing.map((companion) => [companion.fullName.trim().toLowerCase(), companion])
    )
    const insertedByEmail = new Map(
      inserted
        .filter((companion) => Boolean(companion.email))
        .map((companion) => [companion.email?.trim().toLowerCase() ?? '', companion])
    )
    const insertedByName = new Map(
      inserted.map((companion) => [companion.fullName.trim().toLowerCase(), companion])
    )

    const recipients: Array<{ fullName: string; email: string }> = []
    const seenEmails = new Set<string>()

    for (const companion of incoming) {
      const normalizedEmail = companion.email?.trim().toLowerCase() ?? null
      const normalizedName = companion.fullName.trim().toLowerCase()

      const match = normalizedEmail
        ? (existingByEmail.get(normalizedEmail) ?? insertedByEmail.get(normalizedEmail))
        : (existingByName.get(normalizedName) ?? insertedByName.get(normalizedName))

      const email = match?.email?.trim().toLowerCase()
      if (!email || seenEmails.has(email)) {
        continue
      }

      seenEmails.add(email)
      recipients.push({
        fullName: match?.fullName ?? companion.fullName,
        email: match?.email ?? email,
      })
    }

    return recipients
  }
}
