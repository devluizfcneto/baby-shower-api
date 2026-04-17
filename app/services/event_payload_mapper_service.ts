import { inject } from '@adonisjs/core'

import type { EventConfigProjection, EventPublicProjection } from '#repositories/event_repository'

@inject()
export class EventPayloadMapperService {
  toPublicEventData(event: EventPublicProjection) {
    return {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      venueAddress: event.venueAddress,
      deliveryAddress: event.deliveryAddress,
      deliveryAddress2: event.deliveryAddress2,
      deliveryAddress3: event.deliveryAddress3,
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      eventDetail: event.eventDetail,
      pix: {
        dadKey: event.pixKeyDad,
        momKey: event.pixKeyMom,
      },
    }
  }

  toAdminEventData(event: EventConfigProjection) {
    return {
      id: event.id,
      code: event.code,
      name: event.name,
      date: event.date.toISOString(),
      venueAddress: event.venueAddress,
      deliveryAddress: event.deliveryAddress,
      deliveryAddress2: event.deliveryAddress2,
      deliveryAddress3: event.deliveryAddress3,
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      eventDetail: event.eventDetail,
      pix: {
        dadKey: event.pixKeyDad,
        momKey: event.pixKeyMom,
      },
      updatedAt: event.updatedAt.toISOString(),
    }
  }
}
