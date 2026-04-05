import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class GiftsTableSeeder implements Seeder {
  name = 'gifts'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const giftRepository = AppDataSource.getRepository(Gift)

    const latestEvent = await eventRepository
      .createQueryBuilder('event')
      .select(['event.id'])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()

    if (!latestEvent) {
      return
    }

    const existingGift = await giftRepository.findOne({
      where: { eventId: latestEvent.id, name: 'Kit Mamadeiras Anticolica' },
    })

    if (existingGift) {
      return
    }

    await giftRepository.insert([
      {
        eventId: latestEvent.id,
        name: 'Kit Mamadeiras Anticolica',
        description: 'Kit com 3 mamadeiras para recem-nascido.',
        imageUrl: null,
        marketplaceUrl: 'https://www.amazon.com.br/dp/B000TESTE01',
        marketplace: 'amazon',
        asin: 'B000TESTE01',
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 3,
        confirmedQuantity: 1,
        isBlocked: false,
        sortOrder: 1,
      },
      {
        eventId: latestEvent.id,
        name: 'Toalha de Banho Bebe',
        description: 'Toalha com capuz em algodao.',
        imageUrl: null,
        marketplaceUrl: 'https://www.mercadolivre.com.br/p/MLBTESTE01',
        marketplace: 'mercadolivre',
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 2,
        confirmedQuantity: 2,
        isBlocked: false,
        sortOrder: 2,
      },
    ])
  }
}
