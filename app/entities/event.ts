import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ type: 'varchar', length: 200 })
  declare name: string

  @Column({ type: 'timestamp' })
  declare date: Date

  @Column({ name: 'venue_address', type: 'text' })
  declare venueAddress: string

  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  declare deliveryAddress: string | null

  @Column({ name: 'maps_link', type: 'text', nullable: true })
  declare mapsLink: string | null

  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  declare coverImageUrl: string | null

  @Column({ name: 'pix_key_dad', type: 'varchar', length: 200, nullable: true })
  declare pixKeyDad: string | null

  @Column({ name: 'pix_key_mom', type: 'varchar', length: 200, nullable: true })
  declare pixKeyMom: string | null

  @Column({ name: 'pix_qrcode_dad', type: 'text', nullable: true })
  declare pixQrcodeDad: string | null

  @Column({ name: 'pix_qrcode_mom', type: 'text', nullable: true })
  declare pixQrcodeMom: string | null

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date
}
