import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminGuestService } from '#services/admin_guest_service'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import { adminGuestListQueryValidator } from '#validators/admin_guest_list_query_validator'

@inject()
export default class AdminGuestController {
  constructor(private readonly adminGuestService: AdminGuestService) {}

  async index({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const query = await adminGuestListQueryValidator.validate(request.qs())

    const payload = await this.adminGuestService.list(eventId, {
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      confirmedFrom: query.confirmedFrom,
      confirmedTo: query.confirmedTo,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      expand: query.expand,
    })

    return response.ok(payload)
  }
}
