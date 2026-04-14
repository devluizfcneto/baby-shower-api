import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'

import { EventForbiddenException, EventNotFoundException } from '#exceptions/domain_exceptions'
import { EventRepository } from '#repositories/event_repository'

type AuthPayload = {
  userId: number
  email: string
}

type AdminEventScopePayload = {
  eventId: number
}

@inject()
export default class EventOwnershipMiddleware {
  constructor(private readonly eventRepository: EventRepository) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const eventIdRaw = Number(ctx.request.param('eventId'))

    if (!Number.isInteger(eventIdRaw) || eventIdRaw <= 0) {
      throw new EventNotFoundException('Evento nao encontrado para esta rota.')
    }

    const authContext = ctx as HttpContext & { authPayload?: AuthPayload }
    if (!authContext.authPayload?.userId) {
      throw new EventForbiddenException()
    }

    const ownedEventId = await this.eventRepository.findOwnedEventId(
      eventIdRaw,
      authContext.authPayload.userId
    )

    if (!ownedEventId) {
      throw new EventForbiddenException()
    }

    const scopedContext = ctx as HttpContext & { adminEventScope: AdminEventScopePayload }
    scopedContext.adminEventScope = {
      eventId: ownedEventId,
    }

    return next()
  }
}
