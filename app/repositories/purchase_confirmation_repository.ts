import type { EntityManager, Repository } from 'typeorm'

import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { AppDataSource } from '#services/database_service'

export type CreatePurchaseConfirmationInput = {
  giftId: number
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
}

export type PurchaseConfirmationCreateResult = {
  id: number
  giftId: number
  guestName: string
  guestEmail: string
  quantity: number
  orderNumber: string | null
  notes: string | null
  confirmedAt: Date
}

export class PurchaseConfirmationRepository {
  constructor(
    private readonly repository: Repository<PurchaseConfirmation> = AppDataSource.getRepository(
      PurchaseConfirmation
    )
  ) {}

  async createConfirmation(
    input: CreatePurchaseConfirmationInput,
    manager?: EntityManager
  ): Promise<PurchaseConfirmationCreateResult> {
    const activeRepository = manager ? manager.getRepository(PurchaseConfirmation) : this.repository

    const result = await activeRepository
      .createQueryBuilder()
      .insert()
      .into(PurchaseConfirmation)
      .values({
        giftId: input.giftId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        quantity: input.quantity,
        orderNumber: input.orderNumber,
        notes: input.notes,
        confirmedAt: new Date(),
      })
      .returning([
        'id',
        'gift_id',
        'guest_name',
        'guest_email',
        'quantity',
        'order_number',
        'notes',
        'confirmed_at',
      ])
      .execute()

    const row = result.raw[0] as {
      id: number
      gift_id?: number
      giftId?: number
      guest_name?: string
      guestName?: string
      guest_email?: string
      guestEmail?: string
      quantity: number
      order_number?: string | null
      orderNumber?: string | null
      notes?: string | null
      confirmed_at?: string | Date
      confirmedAt?: string | Date
    }

    const confirmedAtRaw = row.confirmed_at ?? row.confirmedAt

    return {
      id: Number(row.id),
      giftId: Number(row.gift_id ?? row.giftId ?? input.giftId),
      guestName: row.guest_name ?? row.guestName ?? input.guestName,
      guestEmail: row.guest_email ?? row.guestEmail ?? input.guestEmail,
      quantity: Number(row.quantity),
      orderNumber: row.order_number ?? row.orderNumber ?? input.orderNumber,
      notes: row.notes ?? input.notes,
      confirmedAt: confirmedAtRaw ? new Date(confirmedAtRaw) : new Date(),
    }
  }
}
