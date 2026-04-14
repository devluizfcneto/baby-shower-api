import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { EventAdminListService } from '#services/event_admin_list_service'
import { EventManagementService } from '#services/event_management_service'
import { UnauthorizedException } from '#exceptions/http_exceptions'
import { ErrorCode } from '#constants/error_code'
import { adminEventListQueryValidator } from '#validators/admin_event_list_query_validator'
import { adminEventCreateValidator } from '#validators/admin_event_create_validator'
import { adminEventCodeParamValidator } from '#validators/admin_event_code_param_validator'
import { adminEventUpdateValidator } from '#validators/admin_event_update_validator'
import { adminEventArchiveValidator } from '#validators/admin_event_archive_validator'
import { adminEventDeleteValidator } from '#validators/admin_event_delete_validator'

type AuthPayload = {
  userId: number
  email: string
}

@inject()
export default class AdminEventManagementController {
  constructor(
    private readonly eventAdminListService: EventAdminListService,
    private readonly eventManagementService: EventManagementService
  ) {}

  async index(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const query = await adminEventListQueryValidator.validate(request.qs())
    const payload = await this.eventAdminListService.list(adminId, query)
    return response.ok(payload)
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const body = await adminEventCreateValidator.validate(request.all())
    const payload = await this.eventManagementService.create(adminId, body)
    return response.created(payload)
  }

  async showByCode(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const { eventCode } = await adminEventCodeParamValidator.validate(request.params())
    const payload = await this.eventManagementService.getByCode(eventCode, adminId)
    return response.ok(payload)
  }

  async updateByCode(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const { eventCode } = await adminEventCodeParamValidator.validate(request.params())
    const body = await adminEventUpdateValidator.validate(request.all())
    const payload = await this.eventManagementService.updateByCode(eventCode, adminId, body)
    return response.ok(payload)
  }

  async archiveByCode(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const { eventCode } = await adminEventCodeParamValidator.validate(request.params())
    const body = await adminEventArchiveValidator.validate(request.all())
    const payload = await this.eventManagementService.setArchivedByCode(
      eventCode,
      adminId,
      body.isArchived
    )
    return response.ok(payload)
  }

  async destroyByCode(ctx: HttpContext) {
    const { request, response } = ctx
    const adminId = this.getAdminId(ctx)
    const { eventCode } = await adminEventCodeParamValidator.validate(request.params())
    const body = await adminEventDeleteValidator.validate(request.all())
    await this.eventManagementService.deleteByCode(eventCode, adminId, body.confirmationName)
    return response.noContent()
  }

  private getAdminId(ctx: HttpContext): number {
    const authPayload = (ctx as HttpContext & { authPayload?: AuthPayload }).authPayload

    if (!authPayload?.userId) {
      throw UnauthorizedException.single(
        'Missing authentication context',
        ErrorCode.UNAUTHORIZED,
        'authorization'
      )
    }

    return authPayload.userId
  }
}
