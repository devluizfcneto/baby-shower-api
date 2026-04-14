import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminGiftService } from '#services/admin_gift_service'
import { adminGiftBlockValidator } from '#validators/admin_gift_block_validator'
import { adminGiftCreateValidator } from '#validators/admin_gift_create_validator'
import { adminEventIdParamValidator } from '#validators/admin_event_id_param_validator'
import { adminGiftIdParamValidator } from '#validators/admin_gift_id_param_validator'
import { adminGiftUpdateValidator } from '#validators/admin_gift_update_validator'

@inject()
export default class AdminGiftController {
  constructor(private readonly adminGiftService: AdminGiftService) {}

  async index({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const payload = await this.adminGiftService.list(eventId)
    return response.ok(payload)
  }

  async store({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const body = await adminGiftCreateValidator.validate(request.all())

    const payload = await this.adminGiftService.create(eventId, {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      marketplace: body.marketplace,
      marketplaceUrl: body.marketplaceUrl,
      asin: body.asin,
      affiliateLinkAmazon: body.affiliateLinkAmazon,
      affiliateLinkMl: body.affiliateLinkMl,
      affiliateLinkShopee: body.affiliateLinkShopee,
      maxQuantity: body.maxQuantity,
      sortOrder: body.sortOrder,
    })

    return response.created(payload)
  }

  async update({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const { id } = await adminGiftIdParamValidator.validate(request.params())
    const body = await adminGiftUpdateValidator.validate(request.all())

    const payload = await this.adminGiftService.update(eventId, id, {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      marketplace: body.marketplace,
      marketplaceUrl: body.marketplaceUrl,
      asin: body.asin,
      affiliateLinkAmazon: body.affiliateLinkAmazon,
      affiliateLinkMl: body.affiliateLinkMl,
      affiliateLinkShopee: body.affiliateLinkShopee,
      maxQuantity: body.maxQuantity,
      sortOrder: body.sortOrder,
    })

    return response.ok(payload)
  }

  async toggleBlock({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const { id } = await adminGiftIdParamValidator.validate(request.params())
    const body = await adminGiftBlockValidator.validate(request.all())

    const payload = await this.adminGiftService.toggleBlock(eventId, id, body.isBlocked)

    return response.ok(payload)
  }

  async destroy({ request, response }: HttpContext) {
    const { eventId } = await adminEventIdParamValidator.validate(request.params())
    const { id } = await adminGiftIdParamValidator.validate(request.params())

    await this.adminGiftService.delete(eventId, id)

    return response.noContent()
  }
}
