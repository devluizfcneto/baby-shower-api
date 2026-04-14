import { inject } from '@adonisjs/core'

import { ErrorCode } from '#constants/error_code'
import { AdminExportReportFailedException } from '#exceptions/domain_exceptions'
import { EventRepository } from '#repositories/event_repository'
import { GuestRepository, type AdminGuestExportProjection } from '#repositories/guest_repository'
import {
  PurchaseConfirmationRepository,
  type AdminPurchaseConfirmationExportProjection,
  type AdminPurchaseConfirmationMarketplace,
} from '#repositories/purchase_confirmation_repository'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { CsvBuilderService } from '#services/csv_builder_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type ExportCommonInput = {
  search?: string
  dateFrom?: string
  dateTo?: string
}

type ExportGuestsInput = ExportCommonInput

type ExportPurchasesInput = ExportCommonInput & {
  marketplace?: AdminPurchaseConfirmationMarketplace
}

type ExportCsvPayload = {
  filename: string
  csv: string
  rowCount: number
}

type NormalizedCommonInput = {
  search: string | undefined
  dateFrom: Date | undefined
  dateTo: Date | undefined
}

const GUEST_HEADERS = [
  'guestId',
  'fullName',
  'email',
  'companionsCount',
  'totalPeople',
  'companionsNames',
  'confirmedAt',
] as const

const PURCHASE_HEADERS = [
  'confirmationId',
  'giftId',
  'giftName',
  'marketplace',
  'guestName',
  'guestEmail',
  'quantity',
  'orderNumber',
  'notes',
  'confirmedAt',
] as const

@inject()
export class AdminExportService {
  private static readonly MAX_ROWS = 10_000

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly guestRepository: GuestRepository,
    private readonly purchaseConfirmationRepository: PurchaseConfirmationRepository,
    private readonly csvBuilderService: CsvBuilderService,
    private readonly adminQueryNormalizerService: AdminQueryNormalizerService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async exportGuestsCsv(eventId: number, input: ExportGuestsInput): Promise<ExportCsvPayload>
  async exportGuestsCsv(input: ExportGuestsInput): Promise<ExportCsvPayload>
  async exportGuestsCsv(
    eventIdOrInput: number | ExportGuestsInput,
    input?: ExportGuestsInput
  ): Promise<ExportCsvPayload> {
    if (typeof eventIdOrInput === 'number') {
      return this.exportGuestsCsvByEvent(eventIdOrInput, input ?? {})
    }

    const eventId = await this.eventRepository.findLatestEventId()

    if (!eventId) {
      return this.buildGuestsResponse([])
    }

    return this.exportGuestsCsvByEvent(eventId, eventIdOrInput)
  }

  private async exportGuestsCsvByEvent(
    eventId: number,
    input: ExportGuestsInput
  ): Promise<ExportCsvPayload> {
    const normalized = this.normalizeCommonInput(input)

    try {
      const rows = await this.guestRepository.findAdminGuestsForExport({
        eventId,
        search: normalized.search,
        confirmedFrom: normalized.dateFrom,
        confirmedTo: normalized.dateTo,
        limit: AdminExportService.MAX_ROWS,
      })

      return this.buildGuestsResponse(rows)
    } catch {
      throw new AdminExportReportFailedException()
    }
  }

  async exportPurchasesCsv(eventId: number, input: ExportPurchasesInput): Promise<ExportCsvPayload>
  async exportPurchasesCsv(input: ExportPurchasesInput): Promise<ExportCsvPayload>
  async exportPurchasesCsv(
    eventIdOrInput: number | ExportPurchasesInput,
    input?: ExportPurchasesInput
  ): Promise<ExportCsvPayload> {
    if (typeof eventIdOrInput === 'number') {
      return this.exportPurchasesCsvByEvent(eventIdOrInput, input ?? {})
    }

    const eventId = await this.eventRepository.findLatestEventId()

    if (!eventId) {
      return this.buildPurchasesResponse([])
    }

    return this.exportPurchasesCsvByEvent(eventId, eventIdOrInput)
  }

  private async exportPurchasesCsvByEvent(
    eventId: number,
    input: ExportPurchasesInput
  ): Promise<ExportCsvPayload> {
    const normalized = this.normalizeCommonInput(input)

    try {
      const rows = await this.purchaseConfirmationRepository.findAdminPurchasesForExport({
        eventId,
        search: normalized.search,
        marketplace: input.marketplace,
        confirmedFrom: normalized.dateFrom,
        confirmedTo: normalized.dateTo,
        limit: AdminExportService.MAX_ROWS,
      })

      return this.buildPurchasesResponse(rows)
    } catch {
      throw new AdminExportReportFailedException()
    }
  }

  private normalizeCommonInput(input: ExportCommonInput): NormalizedCommonInput {
    const dateFrom = this.adminQueryNormalizerService.parseOptionalIsoDate(
      input.dateFrom,
      'dateFrom'
    )
    const dateTo = this.adminQueryNormalizerService.parseOptionalIsoDate(input.dateTo, 'dateTo')

    this.adminQueryNormalizerService.assertDateRange(
      dateFrom,
      dateTo,
      'dateFrom',
      'dateTo',
      ErrorCode.INVALID_EXPORT_FILTER_RANGE
    )

    return {
      search: this.inputSanitizerService.normalizeOptionalText(input.search) ?? undefined,
      dateFrom,
      dateTo,
    }
  }

  private buildGuestsResponse(rows: AdminGuestExportProjection[]): ExportCsvPayload {
    const csv = this.csvBuilderService.build({
      headers: [...GUEST_HEADERS],
      rows: rows.map((row) => ({
        guestId: row.guestId,
        fullName: row.fullName,
        email: row.email,
        companionsCount: row.companionsCount,
        totalPeople: row.totalPeople,
        companionsNames: row.companionsNames,
        confirmedAt: row.confirmedAt.toISOString(),
      })),
    })

    return {
      filename: this.buildFilename('guests-report'),
      csv,
      rowCount: rows.length,
    }
  }

  private buildPurchasesResponse(
    rows: AdminPurchaseConfirmationExportProjection[]
  ): ExportCsvPayload {
    const csv = this.csvBuilderService.build({
      headers: [...PURCHASE_HEADERS],
      rows: rows.map((row) => ({
        confirmationId: row.confirmationId,
        giftId: row.giftId,
        giftName: row.giftName,
        marketplace: row.marketplace,
        guestName: row.guestName,
        guestEmail: row.guestEmail,
        quantity: row.quantity,
        orderNumber: row.orderNumber,
        notes: row.notes,
        confirmedAt: row.confirmedAt.toISOString(),
      })),
    })

    return {
      filename: this.buildFilename('purchases-report'),
      csv,
      rowCount: rows.length,
    }
  }

  private buildFilename(prefix: string): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const hour = String(now.getUTCHours()).padStart(2, '0')
    const minute = String(now.getUTCMinutes()).padStart(2, '0')
    const second = String(now.getUTCSeconds()).padStart(2, '0')

    return `${prefix}-${year}${month}${day}-${hour}${minute}${second}.csv`
  }
}
