import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'

import { EventNotFoundException } from '#exceptions/domain_exceptions'
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

    const eventId = await this.eventRepository.findEventIdByCode(eventCode)

    if (!eventId) {
      throw new EventNotFoundException()
    }

    const extended = ctx as HttpContext & { eventScope: EventScopePayload }
    extended.eventScope = {
      eventId,
      eventCode,
    }

    return next()
  }
}
