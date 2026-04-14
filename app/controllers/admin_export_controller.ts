import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminExportService } from '#services/admin_export_service'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import {
  adminExportGuestsQueryValidator,
  adminExportPurchasesQueryValidator,
} from '#validators/admin_export_query_validator'

@inject()
export default class AdminExportController {
  constructor(private readonly adminExportService: AdminExportService) {}

  async guests({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const query = await adminExportGuestsQueryValidator.validate(request.qs())
    const payload = await this.adminExportService.exportGuestsCsv(eventId, query)

    response.header('content-type', 'text/csv; charset=utf-8')
    response.header('content-disposition', `attachment; filename="${payload.filename}"`)

    return response.ok(payload.csv)
  }

  async purchases({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const query = await adminExportPurchasesQueryValidator.validate(request.qs())
    const payload = await this.adminExportService.exportPurchasesCsv(eventId, query)

    response.header('content-type', 'text/csv; charset=utf-8')
    response.header('content-disposition', `attachment; filename="${payload.filename}"`)

    return response.ok(payload.csv)
  }
}
