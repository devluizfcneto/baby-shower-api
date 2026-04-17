import { inject } from '@adonisjs/core'

import { EventNotFoundException } from '#exceptions/domain_exceptions'
import { ConflictException } from '#exceptions/http_exceptions'
import { ErrorCode } from '#constants/error_code'
import { validationError } from '#exceptions/error_factory'
import {
  EventRepository,
  type UpdateEventConfigInput,
  type EventConfigProjection,
} from '#repositories/event_repository'
import { EventCodeGeneratorService } from '#services/event_code_generator_service'
import { BestEffortNotificationService } from '#services/best_effort_notification_service'
import { EventCreatedNotificationService } from '#services/event_created_notification_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type CreateEventInput = {
  name: string
  date: string
  venueAddress: string
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

type UpdateEventInput = Partial<CreateEventInput>

@inject()
export class EventManagementService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventCodeGeneratorService: EventCodeGeneratorService,
    private readonly bestEffortNotificationService: BestEffortNotificationService,
    private readonly eventCreatedNotificationService: EventCreatedNotificationService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async create(adminId: number, input: CreateEventInput) {
    const normalizedDate = this.parseDate(input.date)
    const code = await this.eventCodeGeneratorService.generateUniqueCode(input.name)

    const created = await this.eventRepository.createForAdmin({
      adminId,
      code,
      name: this.inputSanitizerService.normalizeRequiredText(input.name),
      date: normalizedDate,
      venueAddress: this.inputSanitizerService.normalizeRequiredText(input.venueAddress),
      deliveryAddress: this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress),
      deliveryAddress2: this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress2),
      deliveryAddress3: this.inputSanitizerService.normalizeOptionalText(input.deliveryAddress3),
      mapsLink: this.inputSanitizerService.normalizeOptionalText(input.mapsLink),
      coverImageUrl: this.inputSanitizerService.normalizeOptionalText(input.coverImageUrl),
      eventDetail: this.inputSanitizerService.normalizeOptionalText(input.eventDetail),
      pixKeyDad: this.inputSanitizerService.normalizeOptionalText(input.pix?.dadKey),
      pixKeyMom: this.inputSanitizerService.normalizeOptionalText(input.pix?.momKey),
    })

    await this.bestEffortNotificationService.dispatch('event_created_notification', [
      {
        label: 'admin_event_created',
        execute: () =>
          this.eventCreatedNotificationService.sendAdminEventCreated({
            eventCode: created.code,
            eventName: created.name,
            eventDate: created.date,
          }),
      },
    ])

    return {
      data: this.toEventPayload(created),
    }
  }

  async getByCode(eventCode: string, adminId: number) {
    const event = await this.eventRepository.findByCodeAndAdminWithCounts(eventCode, adminId)

    if (!event) {
      throw new EventNotFoundException('Evento nao encontrado para este administrador.')
    }

    return {
      data: {
        ...this.toEventPayload(event),
        createdAt: event.createdAt.toISOString(),
        counters: {
          guests: event.guestsCount,
          gifts: event.giftsCount,
          donations: event.donationsCount,
        },
      },
    }
  }

  async updateByCode(eventCode: string, adminId: number, input: UpdateEventInput) {
    const patch = this.toUpdatePatch(input)
    const updated = await this.eventRepository.updateByCodeAndAdmin(eventCode, adminId, patch)

    if (!updated) {
      throw new EventNotFoundException('Evento nao encontrado para este administrador.')
    }

    return {
      data: this.toEventPayload(updated),
    }
  }

  async setArchivedByCode(eventCode: string, adminId: number, isArchived: boolean) {
    const updated = await this.eventRepository.archiveByCodeAndAdmin(eventCode, adminId, isArchived)

    if (!updated) {
      throw new EventNotFoundException('Evento nao encontrado para este administrador.')
    }

    return {
      data: this.toEventPayload(updated),
    }
  }

  async deleteByCode(eventCode: string, adminId: number, confirmationName: string) {
    const event = await this.eventRepository.findByCodeAndAdmin(eventCode, adminId)

    if (!event) {
      throw new EventNotFoundException('Evento nao encontrado para este administrador.')
    }

    const normalizedExpected = event.name.trim().toLowerCase()
    const normalizedReceived = confirmationName.trim().toLowerCase()

    if (normalizedExpected !== normalizedReceived) {
      throw ConflictException.single(
        'O nome informado nao corresponde ao nome do evento',
        ErrorCode.EVENT_DELETE_CONFIRMATION_MISMATCH,
        'confirmationName'
      )
    }

    const deleted = await this.eventRepository.deleteByCodeAndAdmin(eventCode, adminId)

    if (!deleted) {
      throw new EventNotFoundException('Evento nao encontrado para este administrador.')
    }
  }

  private toUpdatePatch(input: UpdateEventInput): UpdateEventConfigInput {
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
      patch.deliveryAddress = this.inputSanitizerService.normalizeOptionalText(
        input.deliveryAddress
      )
    }

    if (this.hasOwn(input, 'deliveryAddress2')) {
      patch.deliveryAddress2 = this.inputSanitizerService.normalizeOptionalText(
        input.deliveryAddress2
      )
    }

    if (this.hasOwn(input, 'deliveryAddress3')) {
      patch.deliveryAddress3 = this.inputSanitizerService.normalizeOptionalText(
        input.deliveryAddress3
      )
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

    if (Object.values(patch).every((value) => value === undefined)) {
      throw validationError([
        {
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          field: 'body',
          message: 'Informe ao menos um campo para atualizar',
        },
      ])
    }

    return patch
  }

  private hasOwn(target: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(target, key)
  }

  private parseDate(input: string): Date {
    const parsed = new Date(input)

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

  private toEventPayload(event: EventConfigProjection) {
    return {
      id: event.id,
      code: event.code,
      name: event.name,
      date: event.date.toISOString(),
      venueAddress: event.venueAddress,
      deliveryAddress: event.deliveryAddress,
      deliveryAddress2: event.deliveryAddress2,
      deliveryAddress3: event.deliveryAddress3,
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      eventDetail: event.eventDetail,
      isArchived: event.isArchived,
      pix: {
        dadKey: event.pixKeyDad,
        momKey: event.pixKeyMom,
      },
      updatedAt: event.updatedAt.toISOString(),
    }
  }
}
