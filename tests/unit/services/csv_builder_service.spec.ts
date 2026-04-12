import { test } from '@japa/runner'

import { CsvBuilderService } from '#services/csv_builder_service'

test.group('CsvBuilderService', () => {
  test('builds CSV with headers and rows', async ({ assert }) => {
    const service = new CsvBuilderService()

    const csv = service.build({
      headers: ['id', 'name'],
      rows: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
      ],
      includeBom: false,
    })

    assert.equal(csv, 'id,name\n1,Ana\n2,Bruno')
  })

  test('escapes commas, quotes and new lines correctly', async ({ assert }) => {
    const service = new CsvBuilderService()

    const csv = service.build({
      headers: ['value'],
      rows: [{ value: 'A, B' }, { value: 'Texto "com aspas"' }, { value: 'linha 1\nlinha 2' }],
      includeBom: false,
    })

    assert.equal(csv, 'value\n"A, B"\n"Texto ""com aspas"""\n"linha 1\nlinha 2"')
  })
})
