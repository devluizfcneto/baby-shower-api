import { EventRepository, type EventPublicProjection } from '../repositories/event_repository.js'
import { EventFetchFailedException, EventNotFoundException } from '#exceptions/domain_exceptions'
import { inject } from '@adonisjs/core'
import { EventPayloadMapperService } from '#services/event_payload_mapper_service'

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

@inject()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventPayloadMapperService: EventPayloadMapperService
  ) {}

  async getPublicEvent(eventCode: string): Promise<PublicEventResponse> {
    let event: EventPublicProjection | null

    try {
      event = await this.eventRepository.findPublicEventByCode(eventCode)
    } catch {
      throw new EventFetchFailedException()
    }

    if (!event) {
      throw new EventNotFoundException()
    }

    return {
      data: this.eventPayloadMapperService.toPublicEventData(event),
      meta: {
        source: 'database',
      },
    }
  }
}
