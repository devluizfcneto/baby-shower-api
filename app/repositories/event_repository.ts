import type { Repository, SelectQueryBuilder } from 'typeorm'

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
  | 'deliveryAddress2'
  | 'deliveryAddress3'
  | 'mapsLink'
  | 'coverImageUrl'
  | 'eventDetail'
  | 'pixKeyDad'
  | 'pixKeyMom'
>

export type EventConfigProjection = Pick<
  Event,
  | 'id'
  | 'code'
  | 'name'
  | 'date'
  | 'venueAddress'
  | 'deliveryAddress'
  | 'deliveryAddress2'
  | 'deliveryAddress3'
  | 'mapsLink'
  | 'coverImageUrl'
  | 'eventDetail'
  | 'pixKeyDad'
  | 'pixKeyMom'
  | 'adminId'
  | 'isArchived'
  | 'updatedAt'
>

export type AdminEventStatusFilter = 'active' | 'archived'

export type ListAdminEventsInput = {
  adminId: number
  page: number
  perPage: number
  status?: AdminEventStatusFilter
  search?: string
}

export type AdminEventListProjection = {
  id: number
  code: string
  name: string
  date: Date
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  guestsCount: number
  giftsCount: number
  donationsCount: number
}

export type AdminEventDetailProjection = EventConfigProjection & {
  createdAt: Date
  guestsCount: number
  giftsCount: number
  donationsCount: number
}

export type CreateAdminEventInput = {
  adminId: number
  code: string
  name: string
  date: Date
  venueAddress: string
  deliveryAddress: string | null
  deliveryAddress2: string | null
  deliveryAddress3: string | null
  mapsLink: string | null
  coverImageUrl: string | null
  eventDetail: string | null
  pixKeyDad: string | null
  pixKeyMom: string | null
}

export type EventMailContextProjection = {
  id: number
  code: string
  name: string
  adminEmail: string | null
  date: Date
  venueAddress: string
}

export type UpsertEventConfigInput = {
  adminId: number | null
  name: string
  date: Date
  venueAddress: string
  deliveryAddress: string | null
  deliveryAddress2: string | null
  deliveryAddress3: string | null
  mapsLink: string | null
  coverImageUrl: string | null
  eventDetail: string | null
  pixKeyDad: string | null
  pixKeyMom: string | null
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
        'event.deliveryAddress2',
        'event.deliveryAddress3',
        'event.mapsLink',
        'event.coverImageUrl',
        'event.eventDetail',
        'event.pixKeyDad',
        'event.pixKeyMom',
      ])
      .where('event.code = :eventCode', { eventCode })
      .andWhere('event.isArchived = false')
      .getOne()
  }

  async listByAdminWithCounts(input: ListAdminEventsInput): Promise<AdminEventListProjection[]> {
    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoin('guests', 'guest', 'guest.event_id = event.id')
      .leftJoin('gifts', 'gift', 'gift.event_id = event.id')
      .leftJoin('donations', 'donation', 'donation.event_id = event.id')
      .select([
        'event.id AS id',
        'event.code AS code',
        'event.name AS name',
        'event.date AS date',
        'event.is_archived AS is_archived',
        'event.created_at AS created_at',
        'event.updated_at AS updated_at',
        'COUNT(DISTINCT guest.id) AS guests_count',
        'COUNT(DISTINCT gift.id) AS gifts_count',
        'COUNT(DISTINCT donation.id) AS donations_count',
      ])
      .where('event.admin_id = :adminId', { adminId: input.adminId })
      .groupBy('event.id')
      .orderBy('event.created_at', 'DESC')
      .offset((input.page - 1) * input.perPage)
      .limit(input.perPage)

    this.applyAdminEventFilters(qb, input)

    const rows = await qb.getRawMany<{
      id: number | string
      code: string
      name: string
      date: string | Date
      is_archived: boolean
      created_at: string | Date
      updated_at: string | Date
      guests_count: number | string
      gifts_count: number | string
      donations_count: number | string
    }>()

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      date: new Date(row.date),
      isArchived: this.toBoolean(row.is_archived),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      guestsCount: Number(row.guests_count ?? 0),
      giftsCount: Number(row.gifts_count ?? 0),
      donationsCount: Number(row.donations_count ?? 0),
    }))
  }

  async countByAdminWithFilters(input: ListAdminEventsInput): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('event')
      .select('COUNT(event.id)', 'total')
      .where('event.admin_id = :adminId', { adminId: input.adminId })

    this.applyAdminEventFilters(qb, input)

    const row = await qb.getRawOne<{ total: number | string }>()
    return Number(row?.total ?? 0)
  }

  async createForAdmin(input: CreateAdminEventInput): Promise<EventConfigProjection> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(Event)
      .values({
        adminId: input.adminId,
        code: input.code,
        name: input.name,
        date: input.date,
        venueAddress: input.venueAddress,
        deliveryAddress: input.deliveryAddress,
        deliveryAddress2: input.deliveryAddress2,
        deliveryAddress3: input.deliveryAddress3,
        mapsLink: input.mapsLink,
        coverImageUrl: input.coverImageUrl,
        eventDetail: input.eventDetail,
        pixKeyDad: input.pixKeyDad,
        pixKeyMom: input.pixKeyMom,
        isArchived: false,
      })
      .returning([
        'id',
        'code',
        'admin_id',
        'name',
        'date',
        'venue_address',
        'delivery_address',
        'delivery_address_2',
        'delivery_address_3',
        'maps_link',
        'cover_image_url',
        'event_detail',
        'pix_key_dad',
        'pix_key_mom',
        'is_archived',
        'updated_at',
      ])
      .execute()

    return this.mapRawProjection(result.raw[0])
  }

  async findByCodeAndAdminWithCounts(
    eventCode: string,
    adminId: number
  ): Promise<AdminEventDetailProjection | null> {
    const raw = await this.repository
      .createQueryBuilder('event')
      .leftJoin('guests', 'guest', 'guest.event_id = event.id')
      .leftJoin('gifts', 'gift', 'gift.event_id = event.id')
      .leftJoin('donations', 'donation', 'donation.event_id = event.id')
      .select([
        'event.id AS id',
        'event.code AS code',
        'event.admin_id AS admin_id',
        'event.name AS name',
        'event.date AS date',
        'event.venue_address AS venue_address',
        'event.delivery_address AS delivery_address',
        'event.delivery_address_2 AS delivery_address_2',
        'event.delivery_address_3 AS delivery_address_3',
        'event.maps_link AS maps_link',
        'event.cover_image_url AS cover_image_url',
        'event.event_detail AS event_detail',
        'event.pix_key_dad AS pix_key_dad',
        'event.pix_key_mom AS pix_key_mom',
        'event.is_archived AS is_archived',
        'event.created_at AS created_at',
        'event.updated_at AS updated_at',
        'COUNT(DISTINCT guest.id) AS guests_count',
        'COUNT(DISTINCT gift.id) AS gifts_count',
        'COUNT(DISTINCT donation.id) AS donations_count',
      ])
      .where('event.code = :eventCode', { eventCode })
      .andWhere('event.admin_id = :adminId', { adminId })
      .groupBy('event.id')
      .getRawOne<{
        id: number
        code: string
        admin_id: number | null
        name: string
        date: string | Date
        venue_address: string
        delivery_address: string | null
        delivery_address_2: string | null
        delivery_address_3: string | null
        maps_link: string | null
        cover_image_url: string | null
        event_detail: string | null
        pix_key_dad: string | null
        pix_key_mom: string | null
        is_archived: boolean
        created_at: string | Date
        updated_at: string | Date
        guests_count: number | string
        gifts_count: number | string
        donations_count: number | string
      }>()

    if (!raw) {
      return null
    }

    const mapped = this.mapRawProjection(raw)

    return {
      ...mapped,
      createdAt: new Date(raw.created_at),
      guestsCount: Number(raw.guests_count ?? 0),
      giftsCount: Number(raw.gifts_count ?? 0),
      donationsCount: Number(raw.donations_count ?? 0),
    }
  }

  async updateByCodeAndAdmin(
    eventCode: string,
    adminId: number,
    input: UpdateEventConfigInput
  ): Promise<EventConfigProjection | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Event)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where('code = :eventCode', { eventCode })
      .andWhere('admin_id = :adminId', { adminId })
      .returning([
        'id',
        'code',
        'admin_id',
        'name',
        'date',
        'venue_address',
        'delivery_address',
        'delivery_address_2',
        'delivery_address_3',
        'maps_link',
        'cover_image_url',
        'event_detail',
        'pix_key_dad',
        'pix_key_mom',
        'is_archived',
        'updated_at',
      ])
      .execute()

    if ((result.affected ?? 0) === 0) {
      return null
    }

    return this.mapRawProjection(result.raw[0])
  }

  async archiveByCodeAndAdmin(
    eventCode: string,
    adminId: number,
    isArchived: boolean
  ): Promise<EventConfigProjection | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Event)
      .set({ isArchived, updatedAt: new Date() })
      .where('code = :eventCode', { eventCode })
      .andWhere('admin_id = :adminId', { adminId })
      .returning([
        'id',
        'code',
        'admin_id',
        'name',
        'date',
        'venue_address',
        'delivery_address',
        'delivery_address_2',
        'delivery_address_3',
        'maps_link',
        'cover_image_url',
        'event_detail',
        'pix_key_dad',
        'pix_key_mom',
        'is_archived',
        'updated_at',
      ])
      .execute()

    if ((result.affected ?? 0) === 0) {
      return null
    }

    return this.mapRawProjection(result.raw[0])
  }

  async findByCodeAndAdmin(
    eventCode: string,
    adminId: number
  ): Promise<Pick<Event, 'id' | 'name' | 'code'> | null> {
    return this.repository
      .createQueryBuilder('event')
      .select(['event.id', 'event.name', 'event.code'])
      .where('event.code = :eventCode', { eventCode })
      .andWhere('event.adminId = :adminId', { adminId })
      .getOne()
  }

  async deleteByCodeAndAdmin(eventCode: string, adminId: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Event)
      .where('code = :eventCode', { eventCode })
      .andWhere('admin_id = :adminId', { adminId })
      .execute()

    return (result.affected ?? 0) > 0
  }

  async findByCode(eventCode: string): Promise<Pick<Event, 'id' | 'isArchived'> | null> {
    return this.repository
      .createQueryBuilder('event')
      .select(['event.id', 'event.isArchived'])
      .where('event.code = :eventCode', { eventCode })
      .getOne()
  }

  async existsByCode(eventCode: string): Promise<boolean> {
    const row = await this.repository
      .createQueryBuilder('event')
      .select('1', 'exists')
      .where('event.code = :eventCode', { eventCode })
      .limit(1)
      .getRawOne<{ exists?: string }>()

    if (row?.exists === undefined || row.exists === null) {
      return false
    }

    const normalized = String(row.exists).toLowerCase()
    return normalized === '1' || normalized === 'true'
  }

  async findMailContextByCode(eventCode: string): Promise<EventMailContextProjection | null> {
    const raw = await this.repository
      .createQueryBuilder('event')
      .leftJoin('users', 'user', 'user.id = event.admin_id')
      .select([
        'event.id AS id',
        'event.code AS code',
        'event.name AS name',
        'event.date AS date',
        'event.venue_address AS venue_address',
        'user.email AS admin_email',
      ])
      .where('event.code = :eventCode', { eventCode })
      .getRawOne<{
        id: number
        code: string
        name: string
        date: string | Date
        venue_address: string
        admin_email: string | null
      }>()

    if (!raw) {
      return null
    }

    return {
      id: Number(raw.id),
      code: raw.code,
      name: raw.name,
      date: new Date(raw.date),
      venueAddress: raw.venue_address,
      adminEmail: raw.admin_email,
    }
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
        'event.deliveryAddress2',
        'event.deliveryAddress3',
        'event.mapsLink',
        'event.coverImageUrl',
        'event.eventDetail',
        'event.pixKeyDad',
        'event.pixKeyMom',
        'event.adminId',
        'event.isArchived',
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
        'event.deliveryAddress2',
        'event.deliveryAddress3',
        'event.mapsLink',
        'event.coverImageUrl',
        'event.eventDetail',
        'event.pixKeyDad',
        'event.pixKeyMom',
        'event.adminId',
        'event.isArchived',
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
        deliveryAddress2: input.deliveryAddress2,
        deliveryAddress3: input.deliveryAddress3,
        mapsLink: input.mapsLink,
        coverImageUrl: input.coverImageUrl,
        eventDetail: input.eventDetail,
        pixKeyDad: input.pixKeyDad,
        pixKeyMom: input.pixKeyMom,
      })
      .returning([
        'id',
        'code',
        'admin_id',
        'name',
        'date',
        'venue_address',
        'delivery_address',
        'delivery_address_2',
        'delivery_address_3',
        'maps_link',
        'cover_image_url',
        'event_detail',
        'pix_key_dad',
        'pix_key_mom',
        'is_archived',
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
      delivery_address_2: string | null
      delivery_address_3: string | null
      maps_link: string | null
      cover_image_url: string | null
      event_detail: string | null
      pix_key_dad: string | null
      pix_key_mom: string | null
      is_archived: boolean
      updated_at: string | Date
    }

    return this.mapRawProjection(raw)
  }

  async updateConfigById(eventId: number, input: UpdateEventConfigInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Event)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where('id = :eventId', { eventId })
      .execute()

    if (result.affected === undefined) {
      return true
    }

    return result.affected > 0
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
    delivery_address_2?: string | null
    deliveryAddress2?: string | null
    delivery_address_3?: string | null
    deliveryAddress3?: string | null
    maps_link?: string | null
    mapsLink?: string | null
    cover_image_url?: string | null
    coverImageUrl?: string | null
    event_detail?: string | null
    eventDetail?: string | null
    pix_key_dad?: string | null
    pixKeyDad?: string | null
    pix_key_mom?: string | null
    pixKeyMom?: string | null
    updated_at?: string | Date
    updatedAt?: string | Date
    is_archived?: boolean
    isArchived?: boolean
  }): EventConfigProjection {
    const venueAddress = raw.venue_address ?? raw.venueAddress ?? ''
    const deliveryAddress = raw.delivery_address ?? raw.deliveryAddress ?? null
    const deliveryAddress2 = raw.delivery_address_2 ?? raw.deliveryAddress2 ?? null
    const deliveryAddress3 = raw.delivery_address_3 ?? raw.deliveryAddress3 ?? null
    const mapsLink = raw.maps_link ?? raw.mapsLink ?? null
    const coverImageUrl = raw.cover_image_url ?? raw.coverImageUrl ?? null
    const eventDetail = raw.event_detail ?? raw.eventDetail ?? null
    const pixKeyDad = raw.pix_key_dad ?? raw.pixKeyDad ?? null
    const pixKeyMom = raw.pix_key_mom ?? raw.pixKeyMom ?? null
    const updatedAt = raw.updated_at ?? raw.updatedAt ?? new Date()
    const adminIdRaw = raw.admin_id ?? raw.adminId ?? null
    const isArchived = this.toBoolean(raw.is_archived ?? raw.isArchived ?? false)

    return {
      id: Number(raw.id),
      code: raw.code,
      adminId: adminIdRaw === null ? null : Number(adminIdRaw),
      name: raw.name,
      date: new Date(raw.date),
      venueAddress,
      deliveryAddress,
      deliveryAddress2,
      deliveryAddress3,
      mapsLink,
      coverImageUrl,
      eventDetail,
      pixKeyDad,
      pixKeyMom,
      isArchived,
      updatedAt: new Date(updatedAt),
    }
  }

  private applyAdminEventFilters(
    qb: SelectQueryBuilder<Event>,
    input: Pick<ListAdminEventsInput, 'status' | 'search'>
  ): void {
    if (input.status === 'active') {
      qb.andWhere('event.is_archived = false')
    } else if (input.status === 'archived') {
      qb.andWhere('event.is_archived = true')
    }

    if (input.search) {
      qb.andWhere('LOWER(event.name) LIKE :search', {
        search: `%${input.search.toLowerCase()}%`,
      })
    }
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'number') {
      return value === 1
    }

    const normalized = String(value).toLowerCase()
    return normalized === 'true' || normalized === 't' || normalized === '1'
  }
}
