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

export type EventConfigProjection = Pick<
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
  | 'adminId'
  | 'updatedAt'
>

export type UpsertEventConfigInput = {
  adminId: number | null
  name: string
  date: Date
  venueAddress: string
  deliveryAddress: string | null
  mapsLink: string | null
  coverImageUrl: string | null
  pixKeyDad: string | null
  pixKeyMom: string | null
  pixQrcodeDad: string | null
  pixQrcodeMom: string | null
}

export type UpdateEventConfigInput = Partial<UpsertEventConfigInput>

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

  async findOwnedEventId(eventId: number, adminId: number): Promise<number | null> {
    const result = await this.repository
      .createQueryBuilder('event')
      .select('event.id', 'id')
      .where('event.id = :eventId', { eventId })
      .andWhere('event.adminId = :adminId', { adminId })
      .getRawOne<{ id: number }>()

    return result?.id ?? null
  }

  async findLatestEventId(): Promise<number | null> {
    const result = await this.repository
      .createQueryBuilder('event')
      .select('event.id', 'id')
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getRawOne<{ id: number }>()

    return result?.id ?? null
  }

  async findCurrentConfig(): Promise<EventConfigProjection | null> {
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
        'event.adminId',
        'event.updatedAt',
      ])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()
  }

  async findConfigById(eventId: number): Promise<EventConfigProjection | null> {
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
        'event.adminId',
        'event.updatedAt',
      ])
      .where('event.id = :eventId', { eventId })
      .getOne()
  }

  async createConfig(input: UpsertEventConfigInput): Promise<EventConfigProjection> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(Event)
      .values({
        adminId: input.adminId,
        name: input.name,
        date: input.date,
        venueAddress: input.venueAddress,
        deliveryAddress: input.deliveryAddress,
        mapsLink: input.mapsLink,
        coverImageUrl: input.coverImageUrl,
        pixKeyDad: input.pixKeyDad,
        pixKeyMom: input.pixKeyMom,
        pixQrcodeDad: input.pixQrcodeDad,
        pixQrcodeMom: input.pixQrcodeMom,
      })
      .returning([
        'id',
        'code',
        'admin_id',
        'name',
        'date',
        'venue_address',
        'delivery_address',
        'maps_link',
        'cover_image_url',
        'pix_key_dad',
        'pix_key_mom',
        'pix_qrcode_dad',
        'pix_qrcode_mom',
        'updated_at',
      ])
      .execute()

    const raw = result.raw[0] as {
      id: number
      code: string
      admin_id?: number | string | null
      adminId?: number | string | null
      name: string
      date: string | Date
      venue_address: string
      delivery_address: string | null
      maps_link: string | null
      cover_image_url: string | null
      pix_key_dad: string | null
      pix_key_mom: string | null
      pix_qrcode_dad: string | null
      pix_qrcode_mom: string | null
      updated_at: string | Date
    }

    return this.mapRawProjection(raw)
  }

  async updateConfigById(eventId: number, input: UpdateEventConfigInput): Promise<boolean> {
    const updatePayload = this.removeUndefinedFields({
      ...input,
      updatedAt: new Date(),
    })

    const result = await this.repository
      .createQueryBuilder()
      .update(Event)
      .set(updatePayload)
      .where('id = :eventId', { eventId })
      .execute()

    if (result.affected === undefined) {
      return true
    }

    return result.affected > 0
  }

  private removeUndefinedFields<T extends Record<string, unknown>>(input: T): T {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T
  }

  private mapRawProjection(raw: {
    id: number
    code: string
    admin_id?: number | string | null
    adminId?: number | string | null
    name: string
    date: string | Date
    venue_address?: string
    venueAddress?: string
    delivery_address?: string | null
    deliveryAddress?: string | null
    maps_link?: string | null
    mapsLink?: string | null
    cover_image_url?: string | null
    coverImageUrl?: string | null
    pix_key_dad?: string | null
    pixKeyDad?: string | null
    pix_key_mom?: string | null
    pixKeyMom?: string | null
    pix_qrcode_dad?: string | null
    pixQrcodeDad?: string | null
    pix_qrcode_mom?: string | null
    pixQrcodeMom?: string | null
    updated_at?: string | Date
    updatedAt?: string | Date
  }): EventConfigProjection {
    const venueAddress = raw.venue_address ?? raw.venueAddress ?? ''
    const deliveryAddress = raw.delivery_address ?? raw.deliveryAddress ?? null
    const mapsLink = raw.maps_link ?? raw.mapsLink ?? null
    const coverImageUrl = raw.cover_image_url ?? raw.coverImageUrl ?? null
    const pixKeyDad = raw.pix_key_dad ?? raw.pixKeyDad ?? null
    const pixKeyMom = raw.pix_key_mom ?? raw.pixKeyMom ?? null
    const pixQrcodeDad = raw.pix_qrcode_dad ?? raw.pixQrcodeDad ?? null
    const pixQrcodeMom = raw.pix_qrcode_mom ?? raw.pixQrcodeMom ?? null
    const updatedAt = raw.updated_at ?? raw.updatedAt ?? new Date()
    const adminIdRaw = raw.admin_id ?? raw.adminId ?? null

    return {
      id: Number(raw.id),
      code: raw.code,
      adminId: adminIdRaw === null ? null : Number(adminIdRaw),
      name: raw.name,
      date: new Date(raw.date),
      venueAddress,
      deliveryAddress,
      mapsLink,
      coverImageUrl,
      pixKeyDad,
      pixKeyMom,
      pixQrcodeDad,
      pixQrcodeMom,
      updatedAt: new Date(updatedAt),
    }
  }
}
