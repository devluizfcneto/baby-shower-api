import { inject } from '@adonisjs/core'
import { QueryFailedError } from 'typeorm'

import {
  AdminGiftListFetchFailedException,
  EventNotFoundException,
  GiftCreateFailedException,
  GiftDeleteFailedException,
  GiftHasPurchaseConfirmationsException,
  GiftMaxQuantityLowerThanConfirmedException,
  GiftNotFoundException,
  GiftUpdateFailedException,
} from '#exceptions/domain_exceptions'
import { validationError } from '#exceptions/error_factory'
import { EventRepository } from '#repositories/event_repository'
import {
  GiftRepository,
  type CreateGiftInput,
  type UpdateGiftInput,
} from '#repositories/gift_repository'
import { GiftPayloadMapperService } from '#services/gift_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type AdminGiftListResponse = {
  data: Array<ReturnType<GiftPayloadMapperService['toAdminGiftData']>>
  meta: {
    total: number
    source: 'database'
  }
}

type AdminGiftMutationResponse = {
  data: ReturnType<GiftPayloadMapperService['toAdminGiftData']>
}

type CreateAdminGiftPayload = {
  name: string
  description?: string
  imageUrl?: string
  marketplace: 'amazon' | 'mercadolivre' | 'shopee'
  marketplaceUrl: string
  asin?: string
  affiliateLinkAmazon?: string
  affiliateLinkMl?: string
  affiliateLinkShopee?: string
  maxQuantity: number
  sortOrder?: number
}

type UpdateAdminGiftPayload = Partial<CreateAdminGiftPayload>

@inject()
export class AdminGiftService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly giftRepository: GiftRepository,
    private readonly giftPayloadMapperService: GiftPayloadMapperService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async list(eventId: number): Promise<AdminGiftListResponse>
  async list(): Promise<AdminGiftListResponse>
  async list(eventId?: number): Promise<AdminGiftListResponse> {
    const scopedEventId = eventId ?? (await this.eventRepository.findLatestEventId())

    if (!scopedEventId) {
      return {
        data: [],
        meta: {
          total: 0,
          source: 'database',
        },
      }
    }

    try {
      const gifts = await this.giftRepository.findAdminByEventId(scopedEventId)

      return {
        data: gifts.map((gift) => this.giftPayloadMapperService.toAdminGiftData(gift)),
        meta: {
          total: gifts.length,
          source: 'database',
        },
      }
    } catch {
      throw new AdminGiftListFetchFailedException()
    }
  }

  async create(eventId: number, payload: CreateAdminGiftPayload): Promise<AdminGiftMutationResponse>
  async create(payload: CreateAdminGiftPayload): Promise<AdminGiftMutationResponse>
  async create(
    eventIdOrPayload: number | CreateAdminGiftPayload,
    payload?: CreateAdminGiftPayload
  ): Promise<AdminGiftMutationResponse> {
    const scopedEventId =
      typeof eventIdOrPayload === 'number'
        ? eventIdOrPayload
        : await this.eventRepository.findLatestEventId()

    const resolvedPayload = typeof eventIdOrPayload === 'number' ? payload : eventIdOrPayload

    if (!scopedEventId || !resolvedPayload) {
      throw new EventNotFoundException('Evento nao encontrado para associar o presente.')
    }

    const normalizedInput = this.normalizeCreatePayload(resolvedPayload, scopedEventId)

    try {
      const created = await this.giftRepository.createGift(normalizedInput)
      return {
        data: this.giftPayloadMapperService.toAdminGiftData(created),
      }
    } catch (error) {
      if (this.isPersistenceError(error)) {
        throw new GiftCreateFailedException()
      }

      throw error
    }
  }

  async update(
    eventId: number,
    giftId: number,
    payload: UpdateAdminGiftPayload
  ): Promise<AdminGiftMutationResponse>
  async update(giftId: number, payload: UpdateAdminGiftPayload): Promise<AdminGiftMutationResponse>
  async update(
    eventIdOrGiftId: number,
    giftIdOrPayload: number | UpdateAdminGiftPayload,
    payload?: UpdateAdminGiftPayload
  ): Promise<AdminGiftMutationResponse> {
    const isScopedCall = payload !== undefined
    const eventId = isScopedCall ? eventIdOrGiftId : await this.eventRepository.findLatestEventId()
    const giftId = isScopedCall ? (giftIdOrPayload as number) : eventIdOrGiftId
    const patch = isScopedCall ? payload : (giftIdOrPayload as UpdateAdminGiftPayload)

    if (!eventId) {
      throw new EventNotFoundException('Evento nao encontrado para atualizar o presente.')
    }

    const current = await this.giftRepository.findById(giftId)

    if (!current || current.eventId !== eventId) {
      throw new GiftNotFoundException()
    }

    const normalizedInput = this.normalizeUpdatePayload(patch)
    this.validateNonEmptyPatch(normalizedInput)

    const nextMaxQuantity = normalizedInput.maxQuantity ?? current.maxQuantity
    if (nextMaxQuantity < current.confirmedQuantity) {
      throw new GiftMaxQuantityLowerThanConfirmedException()
    }

    try {
      const updated = await this.giftRepository.updateGiftById(giftId, normalizedInput)

      if (!updated) {
        throw new GiftNotFoundException()
      }

      return {
        data: this.giftPayloadMapperService.toAdminGiftData(updated),
      }
    } catch (error) {
      if (error instanceof GiftNotFoundException) {
        throw error
      }

      if (this.isPersistenceError(error)) {
        throw new GiftUpdateFailedException()
      }

      throw error
    }
  }

  async toggleBlock(
    eventId: number,
    giftId: number,
    isBlocked: boolean
  ): Promise<AdminGiftMutationResponse>
  async toggleBlock(giftId: number, isBlocked: boolean): Promise<AdminGiftMutationResponse>
  async toggleBlock(
    eventIdOrGiftId: number,
    giftIdOrIsBlocked: number | boolean,
    isBlocked?: boolean
  ): Promise<AdminGiftMutationResponse> {
    const isScopedCall = isBlocked !== undefined
    const eventId = isScopedCall ? eventIdOrGiftId : await this.eventRepository.findLatestEventId()
    const giftId = isScopedCall ? (giftIdOrIsBlocked as number) : eventIdOrGiftId
    const blocked = isScopedCall ? isBlocked : (giftIdOrIsBlocked as boolean)

    if (!eventId) {
      throw new EventNotFoundException('Evento nao encontrado para atualizar o presente.')
    }

    const current = await this.giftRepository.findById(giftId)

    if (!current || current.eventId !== eventId) {
      throw new GiftNotFoundException()
    }

    if (current.isBlocked === blocked) {
      return {
        data: this.giftPayloadMapperService.toAdminGiftData(current),
      }
    }

    try {
      const updated = await this.giftRepository.updateGiftById(giftId, { isBlocked: blocked })

      if (!updated) {
        throw new GiftNotFoundException()
      }

      return {
        data: this.giftPayloadMapperService.toAdminGiftData(updated),
      }
    } catch (error) {
      if (error instanceof GiftNotFoundException) {
        throw error
      }

      if (this.isPersistenceError(error)) {
        throw new GiftUpdateFailedException()
      }

      throw error
    }
  }

  async delete(eventId: number, giftId: number): Promise<void>
  async delete(giftId: number): Promise<void>
  async delete(eventIdOrGiftId: number, giftId?: number): Promise<void> {
    const isScopedCall = giftId !== undefined
    const eventId = isScopedCall ? eventIdOrGiftId : await this.eventRepository.findLatestEventId()
    const scopedGiftId = isScopedCall ? giftId : eventIdOrGiftId

    if (!eventId) {
      throw new EventNotFoundException('Evento nao encontrado para remover o presente.')
    }

    const current = await this.giftRepository.findById(scopedGiftId)

    if (!current || current.eventId !== eventId) {
      throw new GiftNotFoundException()
    }

    const hasConfirmations = await this.giftRepository.hasPurchaseConfirmations(scopedGiftId)

    if (hasConfirmations) {
      throw new GiftHasPurchaseConfirmationsException()
    }

    try {
      const deleted = await this.giftRepository.deleteGiftById(scopedGiftId)

      if (!deleted) {
        throw new GiftDeleteFailedException()
      }
    } catch (error) {
      if (error instanceof GiftDeleteFailedException) {
        throw error
      }

      if (this.isPersistenceError(error)) {
        throw new GiftDeleteFailedException()
      }

      throw error
    }
  }

  private normalizeCreatePayload(
    payload: CreateAdminGiftPayload,
    eventId: number
  ): CreateGiftInput {
    return {
      eventId,
      name: this.inputSanitizerService.normalizeRequiredText(payload.name),
      description: this.inputSanitizerService.normalizeOptionalText(payload.description),
      imageUrl: this.inputSanitizerService.normalizeOptionalText(payload.imageUrl),
      marketplace: payload.marketplace,
      marketplaceUrl: this.inputSanitizerService.normalizeRequiredText(payload.marketplaceUrl),
      asin: this.inputSanitizerService.normalizeOptionalText(payload.asin),
      affiliateLinkAmazon: this.inputSanitizerService.normalizeOptionalText(
        payload.affiliateLinkAmazon
      ),
      affiliateLinkMl: this.inputSanitizerService.normalizeOptionalText(payload.affiliateLinkMl),
      affiliateLinkShopee: this.inputSanitizerService.normalizeOptionalText(
        payload.affiliateLinkShopee
      ),
      maxQuantity: payload.maxQuantity,
      sortOrder: payload.sortOrder ?? 0,
    }
  }

  private normalizeUpdatePayload(payload: UpdateAdminGiftPayload): UpdateGiftInput {
    return {
      name: payload.name
        ? this.inputSanitizerService.normalizeRequiredText(payload.name)
        : undefined,
      description:
        payload.description !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.description)
          : undefined,
      imageUrl:
        payload.imageUrl !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.imageUrl)
          : undefined,
      marketplace: payload.marketplace,
      marketplaceUrl:
        payload.marketplaceUrl !== undefined
          ? this.inputSanitizerService.normalizeRequiredText(payload.marketplaceUrl)
          : undefined,
      asin:
        payload.asin !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.asin)
          : undefined,
      affiliateLinkAmazon:
        payload.affiliateLinkAmazon !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.affiliateLinkAmazon)
          : undefined,
      affiliateLinkMl:
        payload.affiliateLinkMl !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.affiliateLinkMl)
          : undefined,
      affiliateLinkShopee:
        payload.affiliateLinkShopee !== undefined
          ? this.inputSanitizerService.normalizeOptionalText(payload.affiliateLinkShopee)
          : undefined,
      maxQuantity: payload.maxQuantity,
      sortOrder: payload.sortOrder,
    }
  }

  private validateNonEmptyPatch(payload: UpdateGiftInput): void {
    if (Object.values(payload).every((value) => value === undefined)) {
      throw validationError([
        {
          field: 'body',
          message: 'At least one field must be informed',
        },
      ])
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
