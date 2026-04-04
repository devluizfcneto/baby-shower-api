import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'user_sessions' })
export class UserSession {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ name: 'session_id', type: 'varchar', length: 64, unique: true })
  declare sessionId: string

  @Column({ name: 'user_id', type: 'int' })
  declare userId: number

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255 })
  declare refreshTokenHash: string

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  declare userAgent: string | null

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  declare ipAddress: string | null

  @Column({ name: 'expires_at', type: 'timestamp' })
  declare expiresAt: Date

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  declare revokedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date
}
