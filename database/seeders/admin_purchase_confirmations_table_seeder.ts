import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class AdminPurchaseConfirmationsTableSeeder implements Seeder {
  name = 'admin_purchase_confirmations'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const giftRepository = AppDataSource.getRepository(Gift)
    const purchaseRepository = AppDataSource.getRepository(PurchaseConfirmation)

    const latestEvent = await eventRepository
      .createQueryBuilder('event')
      .select(['event.id'])
      .orderBy('event.id', 'DESC')
      .limit(1)
      .getOne()

    if (!latestEvent) {
      return
    }

    const gifts = await giftRepository.find({
      where: { eventId: latestEvent.id },
      order: { id: 'ASC' },
      take: 2,
    })

    if (gifts.length === 0) {
      return
    }

    const confirmationsToSeed = [
      {
        giftId: gifts[0].id,
        guestName: 'Admin Compra - Ana',
        guestEmail: 'admin.compra.ana@example.com',
        quantity: 1,
        orderNumber: 'ADMIN-UC10-001',
        notes: 'Confirmacao para filtro por email',
        confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
      },
      {
        giftId: gifts[Math.min(1, gifts.length - 1)].id,
        guestName: 'Admin Compra - Bruno',
        guestEmail: 'admin.compra.bruno@example.com',
        quantity: 2,
        orderNumber: 'ADMIN-UC10-002',
        notes: 'Confirmacao para filtro por periodo',
        confirmedAt: new Date('2026-06-12T14:30:00.000Z'),
      },
    ]

    for (const item of confirmationsToSeed) {
      const exists = await purchaseRepository.findOne({
        where: {
          giftId: item.giftId,
          guestEmail: item.guestEmail,
        },
      })

      if (!exists) {
        await purchaseRepository.insert(item)
      }
    }
  }
}
