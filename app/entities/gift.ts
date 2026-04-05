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

export type GiftMarketplace = 'amazon' | 'mercadolivre' | 'shopee'

@Entity({ name: 'gifts' })
@Check('chk_gifts_max_quantity_positive', 'max_quantity > 0')
@Check('chk_gifts_confirmed_quantity_non_negative', 'confirmed_quantity >= 0')
@Check('chk_gifts_confirmed_le_max', 'confirmed_quantity <= max_quantity')
export class Gift {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'event_id', type: 'int' })
  declare eventId: number

  @Column({ type: 'varchar', length: 200 })
  declare name: string

  @Column({ type: 'text', nullable: true })
  declare description: string | null

  @Column({ name: 'image_url', type: 'text', nullable: true })
  declare imageUrl: string | null

  @Column({ name: 'marketplace_url', type: 'text' })
  declare marketplaceUrl: string

  @Column({ type: 'varchar', length: 50 })
  declare marketplace: GiftMarketplace

  @Column({ type: 'varchar', length: 20, nullable: true })
  declare asin: string | null

  @Column({ name: 'affiliate_link_amazon', type: 'text', nullable: true })
  declare affiliateLinkAmazon: string | null

  @Column({ name: 'affiliate_link_ml', type: 'text', nullable: true })
  declare affiliateLinkMl: string | null

  @Column({ name: 'affiliate_link_shopee', type: 'text', nullable: true })
  declare affiliateLinkShopee: string | null

  @Column({ name: 'max_quantity', type: 'int' })
  declare maxQuantity: number

  @Column({ name: 'confirmed_quantity', type: 'int', default: 0 })
  declare confirmedQuantity: number

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  declare isBlocked: boolean

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  declare sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  declare event: Event
}
