import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'

import { EventArchivedException, EventNotFoundException } from '#exceptions/domain_exceptions'
import { EventRepository } from '#repositories/event_repository'

type EventScopePayload = {
  eventId: number
  eventCode: string
}

@inject()
export default class EventScopeMiddleware {
  constructor(private readonly eventRepository: EventRepository) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const eventCode = String(ctx.request.param('eventCode') ?? '').trim()

    if (!eventCode) {
      throw new EventNotFoundException()
    }

    const event = await this.eventRepository.findByCode(eventCode)

    if (!event) {
      throw new EventNotFoundException()
    }

    if (event.isArchived) {
      throw new EventArchivedException()
    }

    const extended = ctx as HttpContext & { eventScope: EventScopePayload }
    extended.eventScope = {
      eventId: event.id,
      eventCode,
    }

    return next()
  }
}
