import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddArchiveFlagToEvents1710000000016 implements MigrationInterface {
  name = 'AddArchiveFlagToEvents1710000000016'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_events_admin_archived_created_at
      ON events (admin_id, is_archived, created_at DESC)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_events_admin_archived_created_at')
    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS is_archived')
  }
}
