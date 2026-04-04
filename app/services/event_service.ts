import { EventRepository, type EventPublicProjection } from '../repositories/event_repository.js'
import { EventFetchFailedException, EventNotFoundException } from '#exceptions/domain_exceptions'

type PublicEventResponse = {
  data: {
    id: number
    name: string
    date: string
    venueAddress: string
    deliveryAddress: string | null
    mapsLink: string | null
    coverImageUrl: string | null
    pix: {
      dadKey: string | null
      momKey: string | null
      dadQrCode: string | null
      momQrCode: string | null
    }
  }
  meta: {
    source: 'database'
  }
}

export class EventService {
  constructor(private readonly eventRepository: EventRepository = new EventRepository()) {}

  async getPublicEvent(): Promise<PublicEventResponse> {
    let event: EventPublicProjection | null

    try {
      event = await this.eventRepository.findLatestPublicEvent()
    } catch {
      throw new EventFetchFailedException()
    }

    if (!event) {
      throw new EventNotFoundException()
    }

    return {
      data: {
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
      },
      meta: {
        source: 'database',
      },
    }
  }
}
