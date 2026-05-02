import type { EntityManager, Repository } from 'typeorm'

import { Companion } from '#entities/companion'
import { AppDataSource } from '#services/database_service'

type CompanionInput = {
  fullName: string
  email: string | null
}

export type CompanionCreateInput = CompanionInput

export class CompanionRepository {
  constructor(
    private readonly repository: Repository<Companion> = AppDataSource.getRepository(Companion)
  ) {}

  async createManyByGuestId(
    eventId: number,
    guestId: number,
    companions: CompanionCreateInput[],
    manager?: EntityManager
  ): Promise<CompanionCreateInput[]> {
    if (companions.length === 0) {
      return []
    }

    const activeRepository = manager ? manager.getRepository(Companion) : this.repository
    const emails = companions
      .map((companion) => companion.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email))

    const existingEmails = new Set<string>()

    if (emails.length > 0) {
      const existingRows = await activeRepository.query(
        `
        SELECT LOWER(companion.email) AS email
        FROM companions companion
        WHERE companion.event_id = $1
          AND companion.email IS NOT NULL
          AND LOWER(companion.email) = ANY($2)
        UNION
        SELECT LOWER(guest.email) AS email
        FROM guests guest
        WHERE guest.event_id = $1
          AND LOWER(guest.email) = ANY($2)
        `,
        [eventId, emails]
      )

      for (const row of existingRows as Array<{ email?: string | null }>) {
        if (row.email) {
          existingEmails.add(row.email)
        }
      }
    }

    const uniqueCompanions: CompanionInput[] = []
    const seenEmails = new Set<string>()
    const seenNames = new Set<string>()

    for (const companion of companions) {
      const normalizedName = companion.fullName.trim().toLowerCase()
      const normalizedEmail = companion.email?.trim().toLowerCase() ?? null

      if (normalizedEmail) {
        if (existingEmails.has(normalizedEmail) || seenEmails.has(normalizedEmail)) {
          continue
        }

        seenEmails.add(normalizedEmail)
      } else if (seenNames.has(normalizedName)) {
        continue
      }

      seenNames.add(normalizedName)
      uniqueCompanions.push({
        fullName: companion.fullName,
        email: normalizedEmail,
      })
    }

    if (uniqueCompanions.length === 0) {
      return []
    }

    await activeRepository
      .createQueryBuilder()
      .insert()
      .into(Companion)
      .values(
        uniqueCompanions.map((companion) => ({
          eventId,
          guestId,
          fullName: companion.fullName,
          email: companion.email,
        }))
      )
      .execute()

    return uniqueCompanions
  }

  async findByGuestId(
    guestId: number,
    manager?: EntityManager
  ): Promise<Array<{ id: number; fullName: string; email: string | null }>> {
    const activeRepository = manager ? manager.getRepository(Companion) : this.repository

    const rows = await activeRepository
      .createQueryBuilder('companion')
      .select(['companion.id', 'companion.fullName', 'companion.email'])
      .where('companion.guestId = :guestId', { guestId })
      .getMany()

    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
    }))
  }
}
