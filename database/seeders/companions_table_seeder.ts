import { Companion } from '#entities/companion'
import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class CompanionsTableSeeder implements Seeder {
  name = 'companions'

  async run() {
    const guestRepository = AppDataSource.getRepository(Guest)
    const companionRepository = AppDataSource.getRepository(Companion)

    const guest = await guestRepository
      .createQueryBuilder('guest')
      .select(['guest.id', 'guest.eventId'])
      .orderBy('guest.id', 'ASC')
      .limit(1)
      .getOne()

    if (!guest) {
      return
    }

    const candidateCompanions = [
      {
        eventId: guest.eventId,
        guestId: guest.id,
        fullName: 'Acompanhante Seed 1',
        email: 'acompanhante1@baby-shower.local',
      },
      {
        eventId: guest.eventId,
        guestId: guest.id,
        fullName: 'Acompanhante Seed 2',
        email: 'acompanhante2@baby-shower.local',
      },
    ]

    const candidateEmails = candidateCompanions.map((companion) => companion.email.toLowerCase())

    const existingRows = await companionRepository.query(
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
      [guest.eventId, candidateEmails]
    )

    const existingEmails = new Set(
      (existingRows as Array<{ email?: string | null }>)
        .map((row) => row.email)
        .filter((email): email is string => Boolean(email))
    )

    const companionsToInsert = candidateCompanions.filter(
      (companion) => !existingEmails.has(companion.email.toLowerCase())
    )

    if (companionsToInsert.length === 0) {
      return
    }

    await companionRepository.insert(companionsToInsert)
  }
}
