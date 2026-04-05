import { Gift } from '#entities/gift'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { AppDataSource } from '#services/database_service'

import type { Seeder } from './contracts.js'

export default class PurchaseConfirmationsTableSeeder implements Seeder {
  name = 'purchase_confirmations'

  async run() {
    const giftRepository = AppDataSource.getRepository(Gift)
    const purchaseRepository = AppDataSource.getRepository(PurchaseConfirmation)

    const seedGift = await giftRepository.findOne({
      where: { name: 'Kit Mamadeiras Anticolica' },
      order: { id: 'DESC' },
    })

    if (!seedGift) {
      return
    }

    const existingConfirmation = await purchaseRepository.findOne({
      where: {
        giftId: seedGift.id,
        guestEmail: 'convidado.presente@example.com',
      },
    })

    if (existingConfirmation) {
      return
    }

    await purchaseRepository.insert({
      giftId: seedGift.id,
      guestName: 'Convidado Presente',
      guestEmail: 'convidado.presente@example.com',
      quantity: 1,
      orderNumber: 'ORDER-SEEDED-001',
      notes: 'Confirmacao criada via seeder',
      confirmedAt: new Date(),
    })
  }
}
