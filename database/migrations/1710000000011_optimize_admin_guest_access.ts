import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAdminGuestAccess1710000000011 implements MigrationInterface {
  name = 'OptimizeAdminGuestAccess1710000000011'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_event_confirmed_at ON guests (event_id, confirmed_at DESC)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_event_email ON guests (event_id, email)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_event_full_name ON guests (event_id, full_name)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_event_full_name')
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_event_email')
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_event_confirmed_at')
  }
}
