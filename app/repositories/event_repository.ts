import type { Repository } from 'typeorm'

import { AppDataSource } from '#services/database_service'
import { Event } from '../entities/event.js'

export type EventPublicProjection = Pick<
  Event,
  | 'id'
  | 'code'
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

  async findPublicEventByCode(eventCode: string): Promise<EventPublicProjection | null> {
    return this.repository
      .createQueryBuilder('event')
      .select([
        'event.id',
        'event.code',
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
      .where('event.code = :eventCode', { eventCode })
      .getOne()
  }

  async findEventIdByCode(eventCode: string): Promise<number | null> {
    const result = await this.repository
      .createQueryBuilder('event')
      .select('event.id', 'id')
      .where('event.code = :eventCode', { eventCode })
      .getRawOne<{ id: number }>()

    return result?.id ?? null
  }
}
