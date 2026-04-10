import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeAdminGiftAccess1710000000010 implements MigrationInterface {
  name = 'OptimizeAdminGiftAccess1710000000010'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_gifts_event_availability ON gifts (event_id, is_blocked, confirmed_quantity, max_quantity)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_gifts_event_availability')
  }
}
