import type { EntityManager, Repository } from 'typeorm'

import { Companion } from '#entities/companion'
import { AppDataSource } from '#services/database_service'

type CompanionInput = {
  fullName: string
  email: string
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
    const emails = companions.map((companion) => companion.email)

    const existingRows = await activeRepository.query(
      `
      SELECT LOWER(companion.email) AS email
      FROM companions companion
      WHERE companion.event_id = $1
        AND LOWER(companion.email) = ANY($2)
      UNION
      SELECT LOWER(guest.email) AS email
      FROM guests guest
      WHERE guest.event_id = $1
        AND LOWER(guest.email) = ANY($2)
      `,
      [eventId, emails.map((email) => email.toLowerCase())]
    )

    const existingEmails = new Set(
      (existingRows as Array<{ email?: string | null }>)
        .map((row) => row.email)
        .filter((email): email is string => Boolean(email))
    )

    const uniqueCompanions: CompanionInput[] = []
    const seenEmails = new Set<string>()

    for (const companion of companions) {
      const normalizedEmail = companion.email.toLowerCase()
      if (existingEmails.has(normalizedEmail) || seenEmails.has(normalizedEmail)) {
        continue
      }

      seenEmails.add(normalizedEmail)
      uniqueCompanions.push(companion)
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
}
