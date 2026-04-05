import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePurchaseConfirmationsTable1710000000006 implements MigrationInterface {
  name = 'CreatePurchaseConfirmationsTable1710000000006'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_confirmations (
        id SERIAL PRIMARY KEY,
        gift_id INT NOT NULL,
        guest_name VARCHAR(200) NOT NULL,
        guest_email VARCHAR(200) NOT NULL,
        order_number VARCHAR(100) NULL,
        quantity INT NOT NULL DEFAULT 1,
        notes TEXT NULL,
        confirmed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_purchase_confirmations_gift_id
          FOREIGN KEY (gift_id)
          REFERENCES gifts(id)
          ON DELETE CASCADE,
        CONSTRAINT chk_purchase_confirmations_quantity_positive CHECK (quantity > 0)
      )
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_gift_id ON purchase_confirmations (gift_id)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_confirmed_at_desc ON purchase_confirmations (confirmed_at DESC)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_purchase_confirmations_guest_email_lower ON purchase_confirmations (LOWER(guest_email))'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_guest_email_lower')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_confirmed_at_desc')
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_confirmations_gift_id')
    await queryRunner.query('DROP TABLE IF EXISTS purchase_confirmations')
  }
}
