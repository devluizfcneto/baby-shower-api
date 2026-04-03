import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  declare id: number

  @Column({ type: 'varchar', length: 120 })
  declare name: string

  @Column({ type: 'varchar', length: 180, unique: true })
  declare email: string

  @Column({ type: 'varchar', length: 255, select: false })
  declare password: string

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date
}
