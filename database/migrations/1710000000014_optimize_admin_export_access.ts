import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAdminExportAccess1710000000014 implements MigrationInterface {
  name = 'OptimizeAdminExportAccess1710000000014'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_event_confirmed_at ON guests (event_id, confirmed_at DESC)'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_guests_event_email_lower ON guests (event_id, LOWER(email))'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_guest_name_lower ON purchase_confirmations (LOWER(guest_name))'
    )

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_gifts_name_lower ON gifts (LOWER(name))'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_gifts_name_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_guest_name_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_event_email_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_guests_event_confirmed_at')
  }
}
