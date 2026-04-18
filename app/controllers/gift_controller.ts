import type { HttpContext } from '@adonisjs/core/http'

import { GiftService } from '#services/gift_service'
import { eventCodeQueryValidator } from '#validators/event_code_query_validator'
import { giftPublicListQueryValidator } from '#validators/gift_public_list_query_validator'
import { inject } from '@adonisjs/core'

@inject()
export default class GiftController {
  constructor(private readonly giftService: GiftService) {}

  async indexPublic({ request, response }: HttpContext) {
    const { eventCode } = await eventCodeQueryValidator.validate(request.params())
    const filters = await giftPublicListQueryValidator.validate(request.qs())
    const payload = await this.giftService.listPublicGifts(eventCode, filters)
    return response.ok(payload)
  }
}
