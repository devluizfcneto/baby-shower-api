import type { HttpContext } from '@adonisjs/core/http'

import { PurchaseConfirmationService } from '#services/purchase_confirmation_service'
import { giftIdParamValidator } from '#validators/gift_id_param_validator'
import { purchaseConfirmationValidator } from '#validators/purchase_confirmation_validator'
import { inject } from '@adonisjs/core'

@inject()
export default class PurchaseConfirmationController {
  constructor(private readonly purchaseConfirmationService: PurchaseConfirmationService) {}

  async store({ request, response }: HttpContext) {
    const scopedContext = request.ctx as HttpContext & {
      eventScope: {
        eventCode: string
      }
    }
    const { giftId } = await giftIdParamValidator.validate(request.params())
    const payload = await purchaseConfirmationValidator.validate(request.all())

    const result = await this.purchaseConfirmationService.confirmPurchase(
      scopedContext.eventScope.eventCode,
      giftId,
      {
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        quantity: payload.quantity,
        orderNumber: payload.orderNumber,
        notes: payload.notes,
      }
    )

    return response.created(result)
  }
}
