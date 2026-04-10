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

    const giftsToSeed = [
      {
        eventId: latestEvent.id,
        name: 'Kit Mamadeiras Anticolica',
        description: 'Kit com 3 mamadeiras para recem-nascido.',
        imageUrl: null,
        marketplaceUrl: 'https://www.amazon.com.br/dp/B000TESTE01',
        marketplace: 'amazon' as const,
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
        marketplace: 'mercadolivre' as const,
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 2,
        confirmedQuantity: 2,
        isBlocked: false,
        sortOrder: 2,
      },
      {
        eventId: latestEvent.id,
        name: 'Canguru Ergonomico',
        description: 'Canguru com suporte para recem-nascido.',
        imageUrl: null,
        marketplaceUrl: 'https://shopee.com.br/product/TESTE-ERGONOMICO',
        marketplace: 'shopee' as const,
        asin: null,
        affiliateLinkAmazon: null,
        affiliateLinkMl: null,
        affiliateLinkShopee: null,
        maxQuantity: 1,
        confirmedQuantity: 0,
        isBlocked: true,
        sortOrder: 3,
      },
    ]

    const existing = await giftRepository
      .createQueryBuilder('gift')
      .select(['gift.name'])
      .where('gift.event_id = :eventId', { eventId: latestEvent.id })
      .getMany()

    const existingNames = new Set(existing.map((gift) => gift.name))
    const missing = giftsToSeed.filter((gift) => !existingNames.has(gift.name))

    if (missing.length > 0) {
      await giftRepository.insert(missing)
    }
  }
}
