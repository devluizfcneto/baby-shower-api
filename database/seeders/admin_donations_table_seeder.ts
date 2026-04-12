import { Donation } from '#entities/donation'
import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class AdminDonationsTableSeeder implements Seeder {
  name = 'admin_donations'

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

    const donationsToSeed = [
      {
        eventId: latestEvent.id,
        donorName: 'Admin Doacao - Ana',
        donorEmail: 'admin.doacao.ana@example.com',
        amount: '80.00',
        pixDestination: 'mom' as const,
        donatedAt: new Date('2026-06-18T10:00:00.000Z'),
      },
      {
        eventId: latestEvent.id,
        donorName: 'Admin Doacao - Bruno',
        donorEmail: 'admin.doacao.bruno@example.com',
        amount: '150.00',
        pixDestination: 'dad' as const,
        donatedAt: new Date('2026-06-19T11:30:00.000Z'),
      },
    ]

    for (const item of donationsToSeed) {
      const exists = await donationRepository.findOne({
        where: {
          eventId: item.eventId,
          donorEmail: item.donorEmail,
        },
      })

      if (!exists) {
        await donationRepository.insert(item)
      }
    }
  }
}
