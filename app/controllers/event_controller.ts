import type { HttpContext } from '@adonisjs/core/http'

import { EventService } from '#services/event_service'

export default class EventController {
  constructor(private readonly eventService: EventService = new EventService()) {}

  async showPublic({ response }: HttpContext) {
    const payload = await this.eventService.getPublicEvent()
    return response.ok(payload)
  }
}
