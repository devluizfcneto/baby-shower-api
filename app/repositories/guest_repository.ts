import type { EntityManager, Repository } from 'typeorm'

import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'

export type CreateGuestInput = {
  eventId: number
  fullName: string
  email: string
}

export type GuestCreateResult = {
  id: number
  fullName: string
  email: string
  confirmedAt: Date
}

export class GuestRepository {
  constructor(
    private readonly repository: Repository<Guest> = AppDataSource.getRepository(Guest)
  ) {}

  async createGuest(input: CreateGuestInput, manager?: EntityManager): Promise<GuestCreateResult> {
    const activeRepository = manager ? manager.getRepository(Guest) : this.repository

    const result = await activeRepository
      .createQueryBuilder()
      .insert()
      .into(Guest)
      .values({
        eventId: input.eventId,
        fullName: input.fullName,
        email: input.email,
        confirmedAt: new Date(),
      })
      .returning(['id', 'full_name', 'email', 'confirmed_at'])
      .execute()

    const row = result.raw[0] as {
      id: number
      full_name?: string
      fullName?: string
      email: string
      confirmed_at?: Date | string
      confirmedAt?: Date | string
    }

    const confirmedAtRaw = row.confirmed_at ?? row.confirmedAt
    const confirmedAt = confirmedAtRaw ? new Date(confirmedAtRaw) : new Date()

    return {
      id: Number(row.id),
      fullName: row.full_name ?? row.fullName ?? input.fullName,
      email: row.email,
      confirmedAt,
    }
  }

  async existsByEventAndEmail(eventId: number, email: string): Promise<boolean> {
    const rows = await this.repository.query(
      `
      SELECT 1
      FROM (
        SELECT 1
        FROM guests guest
        WHERE guest.event_id = $1
          AND LOWER(guest.email) = LOWER($2)
        UNION ALL
        SELECT 1
        FROM companions companion
        WHERE companion.event_id = $1
          AND companion.email IS NOT NULL
          AND LOWER(companion.email) = LOWER($2)
      ) AS email_conflicts
      LIMIT 1
      `,
      [eventId, email]
    )

    return rows.length > 0
  }
}
