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
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      pix: {
        dadKey: event.pixKeyDad,
        momKey: event.pixKeyMom,
        dadQrCode: event.pixQrcodeDad,
        momQrCode: event.pixQrcodeMom,
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
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      pix: {
        dadKey: event.pixKeyDad,
        momKey: event.pixKeyMom,
        dadQrCode: event.pixQrcodeDad,
        momQrCode: event.pixQrcodeMom,
      },
      updatedAt: event.updatedAt.toISOString(),
    }
  }
}
