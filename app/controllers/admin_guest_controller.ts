import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminGuestService } from '#services/admin_guest_service'
import { adminGuestListQueryValidator } from '#validators/admin_guest_list_query_validator'

@inject()
export default class AdminGuestController {
  constructor(private readonly adminGuestService: AdminGuestService) {}

  async index({ request, response }: HttpContext) {
    const query = await adminGuestListQueryValidator.validate(request.qs())

    const payload = await this.adminGuestService.list({
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
