import { Companion } from '#entities/companion'
import { Event } from '#entities/event'
import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class AdminGuestConfirmationsTableSeeder implements Seeder {
  name = 'admin_guest_confirmations'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const guestRepository = AppDataSource.getRepository(Guest)
    const companionRepository = AppDataSource.getRepository(Companion)

    const latestEvent = await eventRepository
      .createQueryBuilder('event')
      .select(['event.id'])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()

    if (!latestEvent) {
      return
    }

    const guestsToSeed = [
      {
        fullName: 'Convidado Admin 01',
        email: 'admin-guest-01@baby-shower.local',
        confirmedAt: new Date('2026-06-02T10:00:00.000Z'),
      },
      {
        fullName: 'Convidado Admin 02',
        email: 'admin-guest-02@baby-shower.local',
        confirmedAt: new Date('2026-06-03T11:30:00.000Z'),
      },
      {
        fullName: 'Convidado Admin 03',
        email: 'admin-guest-03@baby-shower.local',
        confirmedAt: new Date('2026-06-04T19:15:00.000Z'),
      },
    ]

    const existingGuests = await guestRepository
      .createQueryBuilder('guest')
      .select(['guest.id', 'guest.email'])
      .where('guest.event_id = :eventId', { eventId: latestEvent.id })
      .andWhere('guest.email IN (:...emails)', { emails: guestsToSeed.map((guest) => guest.email) })
      .getMany()

    const existingByEmail = new Map(
      existingGuests.map((guest) => [guest.email.toLowerCase(), guest])
    )

    const toInsert = guestsToSeed.filter((guest) => !existingByEmail.has(guest.email.toLowerCase()))

    if (toInsert.length > 0) {
      await guestRepository.insert(
        toInsert.map((guest) => ({
          eventId: latestEvent.id,
          fullName: guest.fullName,
          email: guest.email,
          confirmedAt: guest.confirmedAt,
        }))
      )
    }

    const targetGuests = await guestRepository
      .createQueryBuilder('guest')
      .select(['guest.id', 'guest.eventId', 'guest.email'])
      .where('guest.event_id = :eventId', { eventId: latestEvent.id })
      .andWhere('guest.email IN (:...emails)', { emails: guestsToSeed.map((guest) => guest.email) })
      .getMany()

    const guestByEmail = new Map(targetGuests.map((guest) => [guest.email.toLowerCase(), guest]))

    const companionsToSeed = [
      {
        guestEmail: 'admin-guest-01@baby-shower.local',
        fullName: 'Acompanhante Admin 01-A',
        email: 'admin-companion-01a@baby-shower.local',
      },
      {
        guestEmail: 'admin-guest-01@baby-shower.local',
        fullName: 'Acompanhante Admin 01-B',
        email: 'admin-companion-01b@baby-shower.local',
      },
      {
        guestEmail: 'admin-guest-02@baby-shower.local',
        fullName: 'Acompanhante Admin 02-A',
        email: 'admin-companion-02a@baby-shower.local',
      },
    ]

    const companionEmails = companionsToSeed.map((companion) => companion.email.toLowerCase())

    const existingCompanions = await companionRepository
      .createQueryBuilder('companion')
      .select(['companion.email'])
      .where('companion.event_id = :eventId', { eventId: latestEvent.id })
      .andWhere('LOWER(companion.email) IN (:...emails)', { emails: companionEmails })
      .getMany()

    const existingCompanionEmails = new Set(
      existingCompanions
        .map((companion) => companion.email?.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )

    const companionsInsertPayload = companionsToSeed
      .filter((companion) => !existingCompanionEmails.has(companion.email.toLowerCase()))
      .map((companion) => {
        const guest = guestByEmail.get(companion.guestEmail.toLowerCase())
        if (!guest) {
          return null
        }

        return {
          eventId: guest.eventId,
          guestId: guest.id,
          fullName: companion.fullName,
          email: companion.email,
        }
      })
      .filter((companion): companion is NonNullable<typeof companion> => companion !== null)

    if (companionsInsertPayload.length > 0) {
      await companionRepository.insert(companionsInsertPayload)
    }
  }
}
