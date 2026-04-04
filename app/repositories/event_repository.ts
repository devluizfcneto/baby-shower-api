import type { Repository } from 'typeorm'

import { AppDataSource } from '#services/database_service'
import { Event } from '../entities/event.js'

export type EventPublicProjection = Pick<
  Event,
  | 'id'
  | 'name'
  | 'date'
  | 'venueAddress'
  | 'deliveryAddress'
  | 'mapsLink'
  | 'coverImageUrl'
  | 'pixKeyDad'
  | 'pixKeyMom'
  | 'pixQrcodeDad'
  | 'pixQrcodeMom'
>

export class EventRepository {
  constructor(
    private readonly repository: Repository<Event> = AppDataSource.getRepository(Event)
  ) {}

  async findLatestPublicEvent(): Promise<EventPublicProjection | null> {
    return this.repository
      .createQueryBuilder('event')
      .select([
        'event.id',
        'event.name',
        'event.date',
        'event.venueAddress',
        'event.deliveryAddress',
        'event.mapsLink',
        'event.coverImageUrl',
        'event.pixKeyDad',
        'event.pixKeyMom',
        'event.pixQrcodeDad',
        'event.pixQrcodeMom',
      ])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()
  }
}
