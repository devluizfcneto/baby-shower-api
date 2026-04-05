import type { HttpContext } from '@adonisjs/core/http'

import { GiftService } from '#services/gift_service'
import { eventCodeQueryValidator } from '#validators/event_code_query_validator'

export default class GiftController {
  constructor(private readonly giftService: GiftService = new GiftService()) {}

  async indexPublic({ request, response }: HttpContext) {
    const { eventCode } = await eventCodeQueryValidator.validate(request.params())
    const payload = await this.giftService.listPublicGifts(eventCode)
    return response.ok(payload)
  }
}
