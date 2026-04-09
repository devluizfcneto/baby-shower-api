import { QueryFailedError } from 'typeorm'
import { inject } from '@adonisjs/core'

import { ErrorCode } from '#constants/error_code'
import {
  DonationEventUnavailableException,
  DonationPersistFailedException,
} from '#exceptions/domain_exceptions'
import { validationError } from '#exceptions/error_factory'
import { DonationRepository, type CreateDonationInput } from '#repositories/donation_repository'
import { EventRepository } from '#repositories/event_repository'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type RegisterDonationInput = {
  donorName?: string
  donorEmail?: string
  amount?: number
  pixDestination?: 'dad' | 'mom'
}

type RegisterDonationResponse = {
  data: {
    donationId: number
    donorName: string | null
    donorEmail: string | null
    amount: number | null
    pixDestination: 'dad' | 'mom' | null
    donatedAt: string
  }
}

@inject()
export class DonationService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly donationRepository: DonationRepository,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async registerDonation(input: RegisterDonationInput): Promise<RegisterDonationResponse> {
    const normalized = this.normalizeInput(input)

    if (!this.hasMeaningfulPayload(normalized)) {
      throw validationError([
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: 'donorName|donorEmail|amount|pixDestination',
          message: 'At least one donation field must be informed',
        },
      ])
    }

    const eventId = await this.eventRepository.findLatestEventId()
    if (!eventId) {
      throw new DonationEventUnavailableException()
    }

    try {
      const donation = await this.donationRepository.createDonation({
        eventId,
        donorName: normalized.donorName,
        donorEmail: normalized.donorEmail,
        amount: normalized.amount,
        pixDestination: normalized.pixDestination,
      })

      return {
        data: {
          donationId: donation.id,
          donorName: donation.donorName,
          donorEmail: donation.donorEmail,
          amount: donation.amount,
          pixDestination: donation.pixDestination,
          donatedAt: donation.donatedAt.toISOString(),
        },
      }
    } catch (error) {
      if (this.isPersistenceError(error)) {
        throw new DonationPersistFailedException()
      }

      throw new DonationPersistFailedException()
    }
  }

  private normalizeInput(input: RegisterDonationInput): Omit<CreateDonationInput, 'eventId'> {
    return {
      donorName: this.inputSanitizerService.normalizeOptionalText(input.donorName),
      donorEmail: this.inputSanitizerService.normalizeOptionalEmail(input.donorEmail),
      amount: this.normalizeAmount(input.amount),
      pixDestination: input.pixDestination ?? null,
    }
  }

  private normalizeAmount(amount?: number): number | null {
    if (amount === undefined || amount === null) {
      return null
    }

    return Math.round(amount * 100) / 100
  }

  private hasMeaningfulPayload(input: Omit<CreateDonationInput, 'eventId'>): boolean {
    return Boolean(
      input.donorName || input.donorEmail || input.amount !== null || input.pixDestination
    )
  }

  private isPersistenceError(error: unknown): boolean {
    if (error instanceof QueryFailedError) {
      return true
    }

    if (error instanceof Error) {
      return Boolean((error as Error & { code?: string }).code)
    }

    return false
  }
}
