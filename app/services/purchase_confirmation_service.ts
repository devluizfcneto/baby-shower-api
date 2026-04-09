import { QueryFailedError } from 'typeorm'
import { inject } from '@adonisjs/core'

import {
  GiftBlockedException,
  GiftLimitExceededException,
  GiftNotFoundException,
  PurchaseConfirmationPersistFailedException,
} from '#exceptions/domain_exceptions'
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
    private readonly giftRepository: GiftRepository,
    private readonly purchaseConfirmationRepository: PurchaseConfirmationRepository,
    private readonly notificationService: PurchaseNotificationService,
    private readonly bestEffortNotificationService: BestEffortNotificationService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async confirmPurchase(
    giftId: number,
    input: ConfirmPurchaseInput
  ): Promise<ConfirmPurchaseResponse> {
    const normalized = this.normalizeInput(input)

    try {
      const transactionResult = await AppDataSource.transaction(async (manager) => {
        const gift = await this.giftRepository.findByIdForUpdate(giftId, manager)

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
        giftId: transactionResult.gift.id,
        giftName: transactionResult.gift.name,
        guestName: transactionResult.confirmation.guestName,
        guestEmail: transactionResult.confirmation.guestEmail,
        quantity: transactionResult.confirmation.quantity,
        orderNumber: transactionResult.confirmation.orderNumber,
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
    giftId: number
    giftName: string
    guestName: string
    guestEmail: string
    quantity: number
    orderNumber: string | null
    confirmedAt: Date
  }) {
    await this.bestEffortNotificationService.dispatch('purchase_notification', [
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
