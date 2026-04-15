import { QueryFailedError } from 'typeorm'
import { inject } from '@adonisjs/core'

import {
  GiftBlockedException,
  GiftLimitExceededException,
  GiftNotFoundException,
  PurchaseConfirmationPersistFailedException,
} from '#exceptions/domain_exceptions'
import { EventRepository } from '#repositories/event_repository'
import { GiftRepository } from '#repositories/gift_repository'
import { PurchaseConfirmationRepository } from '#repositories/purchase_confirmation_repository'
import { BestEffortNotificationService } from '#services/best_effort_notification_service'
import { AppDataSource } from '#services/database_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import { PurchaseNotificationService } from '#services/purchase_notification_service'

type ConfirmPurchaseInput = {
  guestName: string
  guestEmail: string
  quantity?: number
  orderNumber?: string
  notes?: string
}

type ConfirmPurchaseNormalizedInput = {
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
}

type ConfirmPurchaseResponse = {
  data: {
    confirmationId: number
    giftId: number
    giftName: string
    guestName: string
    guestEmail: string
    quantity: number
    orderNumber: string | null
    confirmedAt: string
    gift: {
      maxQuantity: number
      confirmedQuantity: number
      remainingQuantity: number
      status: 'available' | 'limit_reached' | 'blocked'
    }
  }
  meta: {
    emailDispatch: 'queued_or_best_effort'
  }
}

@inject()
export class PurchaseConfirmationService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly giftRepository: GiftRepository,
    private readonly purchaseConfirmationRepository: PurchaseConfirmationRepository,
    private readonly notificationService: PurchaseNotificationService,
    private readonly bestEffortNotificationService: BestEffortNotificationService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async confirmPurchase(
    eventCode: string,
    giftId: number,
    input: ConfirmPurchaseInput
  ): Promise<ConfirmPurchaseResponse>
  async confirmPurchase(
    giftId: number,
    input: ConfirmPurchaseInput
  ): Promise<ConfirmPurchaseResponse>
  async confirmPurchase(
    eventCodeOrGiftId: string | number,
    giftIdOrInput: number | ConfirmPurchaseInput,
    input?: ConfirmPurchaseInput
  ): Promise<ConfirmPurchaseResponse> {
    const isScopedByEventCode = typeof eventCodeOrGiftId === 'string'
    const giftId = isScopedByEventCode ? (giftIdOrInput as number) : eventCodeOrGiftId
    const payload = isScopedByEventCode ? input : (giftIdOrInput as ConfirmPurchaseInput)

    if (!payload) {
      throw new PurchaseConfirmationPersistFailedException()
    }

    const normalized = this.normalizeInput(payload)
    const eventContext = isScopedByEventCode
      ? await this.eventRepository.findMailContextByCode(eventCodeOrGiftId as string)
      : null

    try {
      const transactionResult = await AppDataSource.transaction(async (manager) => {
        const gift = isScopedByEventCode
          ? await this.giftRepository.findByIdForUpdateAndEventCode(
              giftId,
              eventCodeOrGiftId,
              manager
            )
          : await this.giftRepository.findByIdForUpdate(giftId, manager)

        if (!gift) {
          throw new GiftNotFoundException()
        }

        if (gift.isBlocked) {
          throw new GiftBlockedException()
        }

        const newConfirmedQuantity = gift.confirmedQuantity + normalized.quantity
        if (newConfirmedQuantity > gift.maxQuantity) {
          throw new GiftLimitExceededException()
        }

        const confirmation = await this.purchaseConfirmationRepository.createConfirmation(
          {
            giftId: gift.id,
            guestName: normalized.guestName,
            guestEmail: normalized.guestEmail,
            quantity: normalized.quantity,
            orderNumber: normalized.orderNumber,
            notes: normalized.notes,
          },
          manager
        )

        await this.giftRepository.updateConfirmedQuantity(gift.id, newConfirmedQuantity, manager)

        return {
          confirmation,
          gift: {
            id: gift.id,
            name: gift.name,
            maxQuantity: gift.maxQuantity,
            confirmedQuantity: newConfirmedQuantity,
            isBlocked: gift.isBlocked,
          },
        }
      })

      await this.dispatchNotificationsBestEffort({
        eventName: eventContext?.name,
        adminEmail: eventContext?.adminEmail,
        giftId: transactionResult.gift.id,
        giftName: transactionResult.gift.name,
        guestName: transactionResult.confirmation.guestName,
        guestEmail: transactionResult.confirmation.guestEmail,
        quantity: transactionResult.confirmation.quantity,
        orderNumber: transactionResult.confirmation.orderNumber,
        notes: transactionResult.confirmation.notes,
        confirmedAt: transactionResult.confirmation.confirmedAt,
      })

      const remainingQuantity = Math.max(
        transactionResult.gift.maxQuantity - transactionResult.gift.confirmedQuantity,
        0
      )

      return {
        data: {
          confirmationId: transactionResult.confirmation.id,
          giftId: transactionResult.gift.id,
          giftName: transactionResult.gift.name,
          guestName: transactionResult.confirmation.guestName,
          guestEmail: transactionResult.confirmation.guestEmail,
          quantity: transactionResult.confirmation.quantity,
          orderNumber: transactionResult.confirmation.orderNumber,
          confirmedAt: transactionResult.confirmation.confirmedAt.toISOString(),
          gift: {
            maxQuantity: transactionResult.gift.maxQuantity,
            confirmedQuantity: transactionResult.gift.confirmedQuantity,
            remainingQuantity,
            status: this.resolveGiftStatus(
              transactionResult.gift.isBlocked,
              transactionResult.gift.confirmedQuantity,
              transactionResult.gift.maxQuantity
            ),
          },
        },
        meta: {
          emailDispatch: 'queued_or_best_effort',
        },
      }
    } catch (error) {
      if (
        error instanceof GiftNotFoundException ||
        error instanceof GiftBlockedException ||
        error instanceof GiftLimitExceededException
      ) {
        throw error
      }

      if (this.isQueryFailedError(error)) {
        throw new PurchaseConfirmationPersistFailedException()
      }

      throw new PurchaseConfirmationPersistFailedException()
    }
  }

  private async dispatchNotificationsBestEffort(payload: {
    eventName?: string
    adminEmail?: string | null
    giftId: number
    giftName: string
    guestName: string
    guestEmail: string
    quantity: number
    orderNumber: string | null
    notes: string | null
    confirmedAt: Date
  }) {
    await this.bestEffortNotificationService.dispatch('purchase_notification', [
      {
        label: 'guest_purchase_confirmation',
        execute: () => this.notificationService.sendGuestPurchaseConfirmation(payload),
      },
      {
        label: 'admin_purchase_notification',
        execute: () => this.notificationService.sendAdminPurchaseNotification(payload),
      },
    ])
  }

  private resolveGiftStatus(
    isBlocked: boolean,
    confirmedQuantity: number,
    maxQuantity: number
  ): 'available' | 'limit_reached' | 'blocked' {
    if (isBlocked) {
      return 'blocked'
    }

    if (confirmedQuantity >= maxQuantity) {
      return 'limit_reached'
    }

    return 'available'
  }

  private normalizeInput(input: ConfirmPurchaseInput): ConfirmPurchaseNormalizedInput {
    return {
      guestName: this.inputSanitizerService.normalizeRequiredText(input.guestName),
      guestEmail: this.inputSanitizerService.normalizeEmail(input.guestEmail),
      quantity: input.quantity ?? 1,
      orderNumber: this.inputSanitizerService.normalizeOptionalText(input.orderNumber),
      notes: this.inputSanitizerService.normalizeOptionalText(input.notes),
    }
  }

  private isQueryFailedError(error: unknown): boolean {
    if (error instanceof QueryFailedError) {
      return true
    }

    if (error instanceof Error) {
      return Boolean((error as Error & { code?: string }).code)
    }

    return false
  }
}
