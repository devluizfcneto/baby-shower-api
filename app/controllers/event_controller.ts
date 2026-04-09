import type { HttpContext } from '@adonisjs/core/http'

import { EventService } from '#services/event_service'
import { eventCodeQueryValidator } from '#validators/event_code_query_validator'
import { inject } from '@adonisjs/core'

@inject()
export default class EventController {
  constructor(private readonly eventService: EventService) {}

  async showPublic({ request, response }: HttpContext) {
    const { eventCode } = await eventCodeQueryValidator.validate(request.params())
    const payload = await this.eventService.getPublicEvent(eventCode)
    return response.ok(payload)
  }
}
