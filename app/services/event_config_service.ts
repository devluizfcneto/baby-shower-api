import { QueryFailedError } from 'typeorm'
import { inject } from '@adonisjs/core'

import { ErrorCode } from '#constants/error_code'
import {
  EventConfigNotFoundException,
  EventConfigUpdateFailedException,
} from '#exceptions/domain_exceptions'
import { requiredFieldsValidationError, validationError } from '#exceptions/error_factory'
import {
  EventRepository,
  type EventConfigProjection,
  type UpdateEventConfigInput,
  type UpsertEventConfigInput,
} from '#repositories/event_repository'
import { EventPayloadMapperService } from '#services/event_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type EventConfigPayload = {
  name?: string
  date?: string
  venueAddress?: string
  deliveryAddress?: string
  mapsLink?: string
  coverImageUrl?: string
  pix?: {
    dadKey?: string
    momKey?: string
    dadQrCode?: string
    momQrCode?: string
  }
}

type EventConfigResponse = {
  data: {
    id: number
    code: string
    name: string
    date: string
    venueAddress: string
    deliveryAddress: string | null
    mapsLink: string | null
    coverImageUrl: string | null
    pix: {
      dadKey: string | null
      momKey: string | null
      dadQrCode: string | null
      momQrCode: string | null
    }
    updatedAt: string
  }
}

@inject()
export class EventConfigService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPayloadMapperService: EventPayloadMapperService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async getConfigById(eventId: number): Promise<EventConfigResponse> {
    let event: EventConfigProjection | null

    try {
      event = await this.eventRepository.findConfigById(eventId)
    } catch {
      throw new EventConfigUpdateFailedException(
        'Nao foi possivel carregar as configuracoes do evento agora.'
      )
    }

    if (!event) {
      throw new EventConfigNotFoundException()
    }

    return {
      data: this.eventPayloadMapperService.toAdminEventData(event),
    }
  }

  async getCurrentConfig(): Promise<EventConfigResponse> {
    const current = await this.eventRepository.findCurrentConfig()

    if (!current) {
      throw new EventConfigNotFoundException()
    }

    return this.getConfigById(current.id)
  }

  async updateConfig(eventId: number, input: EventConfigPayload): Promise<EventConfigResponse>
  async updateConfig(input: EventConfigPayload): Promise<EventConfigResponse>
  async updateConfig(
    eventIdOrInput: number | EventConfigPayload,
    input?: EventConfigPayload
  ): Promise<EventConfigResponse> {
    const currentConfig =
      typeof eventIdOrInput === 'number' ? null : await this.eventRepository.findCurrentConfig()

    const eventId = typeof eventIdOrInput === 'number' ? eventIdOrInput : currentConfig?.id
    const scopedInput = (typeof eventIdOrInput === 'number' ? input : eventIdOrInput) ?? {}

    if (!eventId) {
      throw new EventConfigNotFoundException()
    }

    const current = await this.eventRepository.findConfigById(eventId)

    if (!current) {
      throw new EventConfigNotFoundException()
    }

    const normalizedPatch = this.normalizePatch(scopedInput)
    const hasPatch = this.hasPatch(normalizedPatch)

    if (!hasPatch) {
      throw requiredFieldsValidationError(
        ['name', 'date', 'venueAddress'],
        'At least one field must be informed'
      )
    }

    const next = this.buildNextState(current, normalizedPatch)
    this.validateRequiredFields(next)

    try {
      const updated = await this.updateExistingConfig(current, normalizedPatch)

      return {
        data: this.eventPayloadMapperService.toAdminEventData(updated),
      }
    } catch (error) {
      if (error instanceof EventConfigUpdateFailedException) {
        throw error
      }

      if (this.isPersistenceError(error)) {
        throw new EventConfigUpdateFailedException()
      }

      throw error
    }
  }

  private normalizePatch(input: EventConfigPayload): UpdateEventConfigInput {
    const date = this.parseDate(input.date)

    return {
      name: input.name ? this.inputSanitizerService.normalizeRequiredText(input.name) : undefined,
      date,
      venueAddress: input.venueAddress
        ? this.inputSanitizerService.normalizeRequiredText(input.venueAddress)
        : undefined,
      deliveryAddress:
        input.deliveryAddress !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress)
          : undefined,
      mapsLink:
        input.mapsLink !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.mapsLink)
          : undefined,
      coverImageUrl:
        input.coverImageUrl !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.coverImageUrl)
          : undefined,
      pixKeyDad:
        input.pix?.dadKey !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.pix.dadKey)
          : undefined,
      pixKeyMom:
        input.pix?.momKey !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.pix.momKey)
          : undefined,
      pixQrcodeDad:
        input.pix?.dadQrCode !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.pix.dadQrCode)
          : undefined,
      pixQrcodeMom:
        input.pix?.momQrCode !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(input.pix.momQrCode)
          : undefined,
    }
  }

  private parseDate(date?: string): Date | undefined {
    if (date === undefined) {
      return undefined
    }

    const parsed = new Date(date)

    if (Number.isNaN(parsed.getTime())) {
      throw validationError([
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: 'date',
          message: 'The date field must be a valid ISO date string',
        },
      ])
    }

    return parsed
  }

  private buildNextState(
    current: EventConfigProjection | null,
    patch: UpdateEventConfigInput
  ): UpsertEventConfigInput {
    return {
      adminId: current?.adminId ?? null,
      name: patch.name ?? current?.name ?? '',
      date: patch.date ?? current?.date ?? new Date(''),
      venueAddress: patch.venueAddress ?? current?.venueAddress ?? '',
      deliveryAddress: patch.deliveryAddress ?? current?.deliveryAddress ?? null,
      mapsLink: patch.mapsLink ?? current?.mapsLink ?? null,
      coverImageUrl: patch.coverImageUrl ?? current?.coverImageUrl ?? null,
      pixKeyDad: patch.pixKeyDad ?? current?.pixKeyDad ?? null,
      pixKeyMom: patch.pixKeyMom ?? current?.pixKeyMom ?? null,
      pixQrcodeDad: patch.pixQrcodeDad ?? current?.pixQrcodeDad ?? null,
      pixQrcodeMom: patch.pixQrcodeMom ?? current?.pixQrcodeMom ?? null,
    }
  }

  private hasPatch(input: UpdateEventConfigInput): boolean {
    return Object.values(input).some((value) => value !== undefined)
  }

  private validateRequiredFields(input: UpsertEventConfigInput): void {
    const missing: string[] = []

    if (!input.name) {
      missing.push('name')
    }

    if (!input.venueAddress) {
      missing.push('venueAddress')
    }

    if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) {
      missing.push('date')
    }

    if (missing.length > 0) {
      throw requiredFieldsValidationError(missing, 'Required fields are missing')
    }
  }

  private async updateExistingConfig(
    current: EventConfigProjection,
    patch: UpdateEventConfigInput
  ): Promise<EventConfigProjection> {
    const persisted = await this.eventRepository.updateConfigById(current.id, patch)

    if (!persisted) {
      throw new EventConfigUpdateFailedException()
    }

    const patchWithoutUndefined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    ) as UpdateEventConfigInput

    return {
      ...current,
      ...patchWithoutUndefined,
      updatedAt: new Date(),
    }
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
