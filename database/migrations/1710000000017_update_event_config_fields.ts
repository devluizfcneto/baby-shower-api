import type { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateEventConfigFields1710000000017 implements MigrationInterface {
  name = 'UpdateEventConfigFields1710000000017'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS event_detail TEXT NULL,
      ADD COLUMN IF NOT EXISTS delivery_address_2 TEXT NULL,
      ADD COLUMN IF NOT EXISTS delivery_address_3 TEXT NULL
    `)

    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS pix_qrcode_dad')
    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS pix_qrcode_mom')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS pix_qrcode_dad TEXT NULL,
      ADD COLUMN IF NOT EXISTS pix_qrcode_mom TEXT NULL
    `)

    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS event_detail')
    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS delivery_address_2')
    await queryRunner.query('ALTER TABLE events DROP COLUMN IF EXISTS delivery_address_3')
  }
}
