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
  deliveryAddress2?: string
  deliveryAddress3?: string
  mapsLink?: string
  coverImageUrl?: string
  eventDetail?: string
  pix?: {
    dadKey?: string
    momKey?: string
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
    deliveryAddress2: string | null
    deliveryAddress3: string | null
    mapsLink: string | null
    coverImageUrl: string | null
    eventDetail: string | null
    pix: {
      dadKey: string | null
      momKey: string | null
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
    const patch: UpdateEventConfigInput = {}

    if (this.hasOwn(input, 'name') && input.name !== undefined) {
      patch.name = this.inputSanitizerService.normalizeRequiredText(input.name)
    }

    if (this.hasOwn(input, 'date') && input.date !== undefined) {
      patch.date = this.parseDate(input.date)
    }

    if (this.hasOwn(input, 'venueAddress') && input.venueAddress !== undefined) {
      patch.venueAddress = this.inputSanitizerService.normalizeRequiredText(input.venueAddress)
    }

    if (this.hasOwn(input, 'deliveryAddress')) {
      patch.deliveryAddress = this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress)
    }

    if (this.hasOwn(input, 'deliveryAddress2')) {
      patch.deliveryAddress2 = this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress2)
    }

    if (this.hasOwn(input, 'deliveryAddress3')) {
      patch.deliveryAddress3 = this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress3)
    }

    if (this.hasOwn(input, 'mapsLink')) {
      patch.mapsLink = this.inputSanitizerService.normalizeOptionalText(input.mapsLink)
    }

    if (this.hasOwn(input, 'coverImageUrl')) {
      patch.coverImageUrl = this.inputSanitizerService.normalizeOptionalText(input.coverImageUrl)
    }

    if (this.hasOwn(input, 'eventDetail')) {
      patch.eventDetail = this.inputSanitizerService.normalizeOptionalText(input.eventDetail)
    }

    if (input.pix && this.hasOwn(input.pix, 'dadKey')) {
      patch.pixKeyDad = this.inputSanitizerService.normalizeOptionalText(input.pix.dadKey)
    }

    if (input.pix && this.hasOwn(input.pix, 'momKey')) {
      patch.pixKeyMom = this.inputSanitizerService.normalizeOptionalText(input.pix.momKey)
    }

    return patch
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
      deliveryAddress2: patch.deliveryAddress2 ?? current?.deliveryAddress2 ?? null,
      deliveryAddress3: patch.deliveryAddress3 ?? current?.deliveryAddress3 ?? null,
      mapsLink: patch.mapsLink ?? current?.mapsLink ?? null,
      coverImageUrl: patch.coverImageUrl ?? current?.coverImageUrl ?? null,
      eventDetail: patch.eventDetail ?? current?.eventDetail ?? null,
      pixKeyDad: patch.pixKeyDad ?? current?.pixKeyDad ?? null,
      pixKeyMom: patch.pixKeyMom ?? current?.pixKeyMom ?? null,
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

  private hasOwn(target: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(target, key)
  }
}
