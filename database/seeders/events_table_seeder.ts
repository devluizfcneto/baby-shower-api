import { Event } from '#entities/event'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class EventsTableSeeder implements Seeder {
  name = 'events'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const existingEvent = await eventRepository.findOne({ where: {} })

    if (existingEvent) {
      return
    }

    const event = eventRepository.create({
      code: 'babyshower2026event1',
      name: 'Cha de bebe da Maria',
      date: new Date('2026-08-15T15:00:00.000Z'),
      venueAddress: 'Rua das Flores, 100 - Centro',
      deliveryAddress: 'Rua das Flores, 100 - Centro',
      mapsLink: 'https://maps.google.com/?q=Rua%20das%20Flores%2C%20100',
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })

    await eventRepository.save(event)
  }
}
