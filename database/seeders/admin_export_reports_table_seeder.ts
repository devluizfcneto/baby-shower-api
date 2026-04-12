import { Companion } from '#entities/companion'
import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { Guest } from '#entities/guest'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class AdminExportReportsTableSeeder implements Seeder {
  name = 'admin_export_reports'

  async run() {
    const eventRepository = AppDataSource.getRepository(Event)
    const guestRepository = AppDataSource.getRepository(Guest)
    const companionRepository = AppDataSource.getRepository(Companion)
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

    const guestsToSeed = [
      {
        fullName: 'Export Guest Ana',
        email: 'export.guest.ana@example.com',
        confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
      },
      {
        fullName: 'Export Guest Bruno',
        email: 'export.guest.bruno@example.com',
        confirmedAt: new Date('2026-06-12T11:30:00.000Z'),
      },
    ]

    const existingGuests = await guestRepository.find({
      where: {
        eventId: latestEvent.id,
      },
    })

    const existingGuestByEmail = new Map(
      existingGuests.map((guest) => [guest.email.toLowerCase(), guest])
    )

    for (const guest of guestsToSeed) {
      if (!existingGuestByEmail.has(guest.email.toLowerCase())) {
        const inserted = await guestRepository.save({
          eventId: latestEvent.id,
          fullName: guest.fullName,
          email: guest.email,
          confirmedAt: guest.confirmedAt,
        })

        existingGuestByEmail.set(inserted.email.toLowerCase(), inserted)
      }
    }

    const companionsToSeed = [
      {
        guestEmail: 'export.guest.ana@example.com',
        fullName: 'Export Companion Ana 1',
        email: 'export.companion.ana.1@example.com',
      },
      {
        guestEmail: 'export.guest.ana@example.com',
        fullName: 'Export Companion Ana 2',
        email: 'export.companion.ana.2@example.com',
      },
    ]

    for (const companion of companionsToSeed) {
      const guest = existingGuestByEmail.get(companion.guestEmail)
      if (!guest) {
        continue
      }

      const exists = await companionRepository.findOne({
        where: {
          guestId: guest.id,
          email: companion.email,
        },
      })

      if (!exists) {
        await companionRepository.insert({
          eventId: latestEvent.id,
          guestId: guest.id,
          fullName: companion.fullName,
          email: companion.email,
        })
      }
    }

    const gifts = await giftRepository.find({
      where: { eventId: latestEvent.id },
      order: { id: 'ASC' },
      take: 2,
    })

    if (gifts.length === 0) {
      return
    }

    const purchasesToSeed = [
      {
        giftId: gifts[0].id,
        guestName: 'Export Buyer Ana',
        guestEmail: 'export.buyer.ana@example.com',
        quantity: 1,
        orderNumber: 'EXP-001',
        notes: 'Seed para export purchases',
        confirmedAt: new Date('2026-06-13T14:10:00.000Z'),
      },
      {
        giftId: gifts[Math.min(1, gifts.length - 1)].id,
        guestName: 'Export Buyer Bruno',
        guestEmail: 'export.buyer.bruno@example.com',
        quantity: 2,
        orderNumber: 'EXP-002',
        notes: 'Seed para filtros de export purchases',
        confirmedAt: new Date('2026-06-14T15:20:00.000Z'),
      },
    ]

    for (const purchase of purchasesToSeed) {
      const exists = await purchaseRepository.findOne({
        where: {
          giftId: purchase.giftId,
          guestEmail: purchase.guestEmail,
        },
      })

      if (!exists) {
        await purchaseRepository.insert(purchase)
      }
    }
  }
}
