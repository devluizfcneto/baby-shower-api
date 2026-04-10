import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import { AdminGiftService } from '#services/admin_gift_service'
import { adminGiftBlockValidator } from '#validators/admin_gift_block_validator'
import { adminGiftCreateValidator } from '#validators/admin_gift_create_validator'
import { adminGiftIdParamValidator } from '#validators/admin_gift_id_param_validator'
import { adminGiftUpdateValidator } from '#validators/admin_gift_update_validator'

@inject()
export default class AdminGiftController {
  constructor(private readonly adminGiftService: AdminGiftService) {}

  async index({ response }: HttpContext) {
    const payload = await this.adminGiftService.list()
    return response.ok(payload)
  }

  async store({ request, response }: HttpContext) {
    const body = await adminGiftCreateValidator.validate(request.all())

    const payload = await this.adminGiftService.create({
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
    const { id } = await adminGiftIdParamValidator.validate(request.params())
    const body = await adminGiftUpdateValidator.validate(request.all())

    const payload = await this.adminGiftService.update(id, {
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
    const { id } = await adminGiftIdParamValidator.validate(request.params())
    const body = await adminGiftBlockValidator.validate(request.all())

    const payload = await this.adminGiftService.toggleBlock(id, body.isBlocked)

    return response.ok(payload)
  }

  async destroy({ request, response }: HttpContext) {
    const { id } = await adminGiftIdParamValidator.validate(request.params())

    await this.adminGiftService.delete(id)

    return response.noContent()
  }
}
