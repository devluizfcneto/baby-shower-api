import { test } from '@japa/runner'

import { DateTimeFormatterService } from '#services/date_time_formatter_service'

test.group('DateTimeFormatterService', () => {
  test('formats date in Brasilia timezone using dd-MM-yyyy HH:mm', async ({ assert }) => {
    const service = new DateTimeFormatterService()

    const formatted = service.formatForEndUser(new Date('2026-04-18T17:00:00.000Z'))

    assert.equal(formatted, '18-04-2026 14:00')
  })

  test('returns fallback text when date is invalid', async ({ assert }) => {
    const service = new DateTimeFormatterService()

    const formatted = service.formatForEndUser(new Date('invalid'))

    assert.equal(formatted, 'Data invalida')
  })
})
