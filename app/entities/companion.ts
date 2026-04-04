import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { Event } from '#entities/event'
import { Guest } from '#entities/guest'

@Entity({ name: 'companions' })
export class Companion {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'guest_id', type: 'int' })
  declare guestId: number

  @Column({ name: 'event_id', type: 'int' })
  declare eventId: number

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  declare fullName: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  declare email: string | null

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @ManyToOne(() => Guest, (guest) => guest.companions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_id' })
  declare guest: Guest

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  declare event: Event
}
