import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OptimizeEventConfigAccess1710000000009 implements MigrationInterface {
  name = 'OptimizeEventConfigAccess1710000000009'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_events_updated_at_desc ON events (updated_at DESC)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_events_updated_at_desc')
  }
}
