import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminDonationService } from '#services/admin_donation_service'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import { adminDonationListQueryValidator } from '#validators/admin_donation_list_query_validator'

@inject()
export default class AdminDonationController {
  constructor(private readonly adminDonationService: AdminDonationService) {}

  async index({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const query = await adminDonationListQueryValidator.validate(request.qs())

    const payload = await this.adminDonationService.list(eventId, {
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      pixDestination: query.pixDestination,
      donatedFrom: query.donatedFrom,
      donatedTo: query.donatedTo,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })

    return response.ok(payload)
  }
}
