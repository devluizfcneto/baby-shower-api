import { Donation } from '#entities/donation'
import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class DonationsTableSeeder implements Seeder {
  name = 'donations'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const donationRepository = AppDataSource.getRepository(Donation)

    const latestEvent = await eventRepository
      .createQueryBuilder('event')
      .select(['event.id'])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()

    if (!latestEvent) {
      return
    }

    const existingDonation = await donationRepository.findOne({
      where: {
        eventId: latestEvent.id,
        donorEmail: 'doador.seed@baby-shower.local',
      },
    })

    if (existingDonation) {
      return
    }

    await donationRepository.insert({
      eventId: latestEvent.id,
      donorName: 'Doador Seed',
      donorEmail: 'doador.seed@baby-shower.local',
      amount: '150.00',
      pixDestination: 'mom',
      donatedAt: new Date(),
    })
  }
}
