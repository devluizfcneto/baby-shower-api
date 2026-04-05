import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGiftsTable1710000000005 implements MigrationInterface {
  name = 'CreateGiftsTable1710000000005'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        image_url TEXT NULL,
        marketplace_url TEXT NOT NULL,
        marketplace VARCHAR(50) NOT NULL,
        asin VARCHAR(20) NULL,
        affiliate_link_amazon TEXT NULL,
        affiliate_link_ml TEXT NULL,
        affiliate_link_shopee TEXT NULL,
        max_quantity INT NOT NULL,
        confirmed_quantity INT NOT NULL DEFAULT 0,
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_gifts_event_id
          FOREIGN KEY (event_id)
          REFERENCES events(id)
          ON DELETE CASCADE,
        CONSTRAINT chk_gifts_max_quantity_positive CHECK (max_quantity > 0),
        CONSTRAINT chk_gifts_confirmed_quantity_non_negative CHECK (confirmed_quantity >= 0),
        CONSTRAINT chk_gifts_confirmed_le_max CHECK (confirmed_quantity <= max_quantity),
        CONSTRAINT chk_gifts_marketplace_valid CHECK (marketplace IN ('amazon', 'mercadolivre', 'shopee'))
      )
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_gifts_event_sort_order_id ON gifts (event_id, sort_order, id)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_gifts_event_is_blocked ON gifts (event_id, is_blocked)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_gifts_event_is_blocked')
    await queryRunner.query('DROP INDEX IF EXISTS idx_gifts_event_sort_order_id')
    await queryRunner.query('DROP TABLE IF EXISTS gifts')
  }
}
