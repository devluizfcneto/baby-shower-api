import { test } from '@japa/runner'

import { AdminExportReportFailedException } from '#exceptions/domain_exceptions'
import { AdminExportService } from '#services/admin_export_service'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { CsvBuilderService } from '#services/csv_builder_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

test.group('AdminExportService', () => {
  test('exports guests CSV with stable headers', async ({ assert }) => {
    const service = new AdminExportService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminGuestsForExport: async () => [
          {
            guestId: 1,
            fullName: 'Ana Guest',
            email: 'ana@example.com',
            companionsCount: 2,
            totalPeople: 3,
            companionsNames: 'Comp 1 | Comp 2',
            confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
          },
        ],
      } as any,
      {} as any,
      new CsvBuilderService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const result = await service.exportGuestsCsv({ search: 'Ana' })

    assert.match(result.filename, /^guests-report-\d{8}-\d{6}\.csv$/)
    assert.include(
      result.csv,
      'guestId,fullName,email,companionsCount,totalPeople,companionsNames,confirmedAt'
    )
    assert.include(result.csv, 'Ana Guest')
    assert.equal(result.rowCount, 1)
  })

  test('exports purchases CSV filtered by marketplace', async ({ assert }) => {
    let capturedMarketplace: string | undefined

    const service = new AdminExportService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
      {
        findAdminPurchasesForExport: async (filters: any) => {
          capturedMarketplace = filters.marketplace
          return [
            {
              confirmationId: 5,
              giftId: 8,
              giftName: 'Fralda Premium',
              marketplace: 'amazon',
              guestName: 'Comprador 1',
              guestEmail: 'buyer@example.com',
              quantity: 2,
              orderNumber: 'ORD-1',
              notes: null,
              confirmedAt: new Date('2026-06-12T12:00:00.000Z'),
            },
          ]
        },
      } as any,
      new CsvBuilderService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const result = await service.exportPurchasesCsv({ marketplace: 'amazon' })

    assert.equal(capturedMarketplace, 'amazon')
    assert.match(result.filename, /^purchases-report-\d{8}-\d{6}\.csv$/)
    assert.include(
      result.csv,
      'confirmationId,giftId,giftName,marketplace,guestName,guestEmail,quantity,orderNumber,notes,confirmedAt'
    )
    assert.include(result.csv, 'Fralda Premium')
    assert.equal(result.rowCount, 1)
  })

  test('returns CSV with only headers when event does not exist', async ({ assert }) => {
    const service = new AdminExportService(
      {
        findLatestEventId: async () => null,
      } as any,
      {} as any,
      {} as any,
      new CsvBuilderService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    const guestsResult = await service.exportGuestsCsv({})
    const purchasesResult = await service.exportPurchasesCsv({})

    assert.equal(guestsResult.rowCount, 0)
    assert.equal(purchasesResult.rowCount, 0)
    assert.include(
      guestsResult.csv,
      'guestId,fullName,email,companionsCount,totalPeople,companionsNames,confirmedAt'
    )
    assert.include(
      purchasesResult.csv,
      'confirmationId,giftId,giftName,marketplace,guestName,guestEmail,quantity,orderNumber,notes,confirmedAt'
    )
  })

  test('throws 422 when dateFrom is greater than dateTo', async ({ assert }) => {
    const service = new AdminExportService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {} as any,
      {} as any,
      new CsvBuilderService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.exportGuestsCsv({
        dateFrom: '2026-06-30T23:59:59.999Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      })
      assert.fail('Expected validation error for invalid date range')
    } catch (error) {
      assert.equal((error as { status?: number }).status, 422)
      assert.equal(
        (error as { errors?: Array<{ code?: string }> }).errors?.[0]?.code,
        'INVALID_EXPORT_FILTER_RANGE'
      )
    }
  })

  test('throws ADMIN_EXPORT_REPORT_FAILED when repository fails', async ({ assert }) => {
    const service = new AdminExportService(
      {
        findLatestEventId: async () => 10,
      } as any,
      {
        findAdminGuestsForExport: async () => {
          throw new Error('db down')
        },
      } as any,
      {} as any,
      new CsvBuilderService(),
      new AdminQueryNormalizerService(),
      new InputSanitizerService()
    )

    try {
      await service.exportGuestsCsv({})
      assert.fail('Expected AdminExportReportFailedException')
    } catch (error) {
      assert.instanceOf(error, AdminExportReportFailedException)
      assert.equal(
        (error as AdminExportReportFailedException).errors[0]?.code,
        'ADMIN_EXPORT_REPORT_FAILED'
      )
    }
  })
})
