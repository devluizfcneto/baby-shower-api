import { Event } from '#entities/event'
import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class GuestsTableSeeder implements Seeder {
  name = 'guests'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const guestRepository = AppDataSource.getRepository(Guest)

    const latestEvent = await eventRepository
      .createQueryBuilder('event')
      .select(['event.id'])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()

    if (!latestEvent) {
      return
    }

    const existingGuest = await guestRepository.findOne({
      where: { eventId: latestEvent.id, email: 'guest@baby-shower.local' },
    })

    if (existingGuest) {
      return
    }

    const guest = guestRepository.create({
      eventId: latestEvent.id,
      fullName: 'Convidado Seed',
      email: 'guest@baby-shower.local',
      confirmedAt: new Date(),
    })

    await guestRepository.save(guest)
  }
}
