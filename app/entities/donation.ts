import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Event } from '#entities/event'

export type DonationPixDestination = 'dad' | 'mom'

@Entity({ name: 'donations' })
@Check('chk_donations_amount_positive', 'amount IS NULL OR amount > 0')
export class Donation {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'event_id', type: 'int' })
  declare eventId: number

  @Column({ name: 'donor_name', type: 'varchar', length: 200, nullable: true })
  declare donorName: string | null

  @Column({ name: 'donor_email', type: 'varchar', length: 200, nullable: true })
  declare donorEmail: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  declare amount: string | null

  @Column({ name: 'pix_destination', type: 'varchar', length: 10, nullable: true })
  declare pixDestination: DonationPixDestination | null

  @Column({ name: 'donated_at', type: 'timestamp', default: () => 'NOW()' })
  declare donatedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  declare event: Event
}
