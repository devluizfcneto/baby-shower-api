import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Companion } from '#entities/companion'
import { Event } from '#entities/event'

@Entity({ name: 'guests' })
export class Guest {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'event_id', type: 'int' })
  declare eventId: number

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  declare fullName: string

  @Column({ type: 'varchar', length: 200 })
  declare email: string

  @Column({ name: 'confirmed_at', type: 'timestamp' })
  declare confirmedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  declare event: Event

  @OneToMany(() => Companion, (companion) => companion.guest)
  declare companions: Companion[]
}
