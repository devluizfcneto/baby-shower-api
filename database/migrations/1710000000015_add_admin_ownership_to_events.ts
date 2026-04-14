import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAdminOwnershipToEvents1710000000015 implements MigrationInterface {
  name = 'AddAdminOwnershipToEvents1710000000015'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS admin_id INTEGER NULL
    `)

    await queryRunner.query(`
      UPDATE events
      SET admin_id = (
        SELECT users.id
        FROM users
        ORDER BY users.id ASC
        LIMIT 1
      )
      WHERE admin_id IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE events
      ADD CONSTRAINT fk_events_admin_id_users_id
      FOREIGN KEY (admin_id)
      REFERENCES users(id)
      ON DELETE SET NULL
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_events_admin_id_id
      ON events (admin_id, id)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_events_admin_id_id')
    await queryRunner.query(
      'ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_admin_id_users_id'
    )
    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS admin_id')
  }
}
