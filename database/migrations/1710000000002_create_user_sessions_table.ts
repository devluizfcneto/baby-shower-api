import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUserSessionsTable1710000000002 implements MigrationInterface {
  name = 'CreateUserSessionsTable1710000000002'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        user_agent TEXT NULL,
        ip_address VARCHAR(64) NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_user_sessions_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `)

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)'
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions (session_id)'
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_session_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_user_id')
    await queryRunner.query('DROP TABLE IF EXISTS user_sessions')
  }
}
