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

  async list(): Promise<AdminGiftListResponse> {
    try {
      const gifts = await this.giftRepository.findAdminByLatestEvent()

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

  async create(payload: CreateAdminGiftPayload) {
    const eventId = await this.eventRepository.findLatestEventId()

    if (!eventId) {
      throw new EventNotFoundException('Evento nao encontrado para associar o presente.')
    }

    const normalizedInput = this.normalizeCreatePayload(payload, eventId)

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

  async update(giftId: number, payload: UpdateAdminGiftPayload) {
    const current = await this.giftRepository.findById(giftId)

    if (!current) {
      throw new GiftNotFoundException()
    }

    const normalizedInput = this.normalizeUpdatePayload(payload)
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

  async toggleBlock(giftId: number, isBlocked: boolean) {
    const current = await this.giftRepository.findById(giftId)

    if (!current) {
      throw new GiftNotFoundException()
    }

    if (current.isBlocked === isBlocked) {
      return {
        data: this.giftPayloadMapperService.toAdminGiftData(current),
      }
    }

    try {
      const updated = await this.giftRepository.updateGiftById(giftId, { isBlocked })

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

  async delete(giftId: number): Promise<void> {
    const current = await this.giftRepository.findById(giftId)

    if (!current) {
      throw new GiftNotFoundException()
    }

    const hasConfirmations = await this.giftRepository.hasPurchaseConfirmations(giftId)

    if (hasConfirmations) {
      throw new GiftHasPurchaseConfirmationsException()
    }

    try {
      const deleted = await this.giftRepository.deleteGiftById(giftId)

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
