import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminPurchaseConfirmationService } from '#services/admin_purchase_confirmation_service'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import { adminPurchaseConfirmationListQueryValidator } from '#validators/admin_purchase_confirmation_list_query_validator'

@inject()
export default class AdminPurchaseConfirmationController {
  constructor(
    private readonly adminPurchaseConfirmationService: AdminPurchaseConfirmationService
  ) {}

  async index({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const query = await adminPurchaseConfirmationListQueryValidator.validate(request.qs())

    const payload = await this.adminPurchaseConfirmationService.list(eventId, {
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      giftId: query.giftId,
      marketplace: query.marketplace,
      confirmedFrom: query.confirmedFrom,
      confirmedTo: query.confirmedTo,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })

    return response.ok(payload)
  }
}
