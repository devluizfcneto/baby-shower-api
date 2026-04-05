import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { Gift } from '#entities/gift'

@Entity({ name: 'purchase_confirmations' })
@Check('chk_purchase_confirmations_quantity_positive', 'quantity > 0')
export class PurchaseConfirmation {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'gift_id', type: 'int' })
  declare giftId: number

  @Column({ name: 'guest_name', type: 'varchar', length: 200 })
  declare guestName: string

  @Column({ name: 'guest_email', type: 'varchar', length: 200 })
  declare guestEmail: string

  @Column({ name: 'order_number', type: 'varchar', length: 100, nullable: true })
  declare orderNumber: string | null

  @Column({ type: 'int', default: 1 })
  declare quantity: number

  @Column({ type: 'text', nullable: true })
  declare notes: string | null

  @Column({ name: 'confirmed_at', type: 'timestamp', default: () => 'NOW()' })
  declare confirmedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @ManyToOne(() => Gift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gift_id' })
  declare gift: Gift
}
