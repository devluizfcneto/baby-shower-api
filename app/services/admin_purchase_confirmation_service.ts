import { inject } from '@adonisjs/core'

import { AdminPurchaseConfirmationListFetchFailedException } from '#exceptions/domain_exceptions'
import { EventRepository } from '#repositories/event_repository'
import {
  PurchaseConfirmationRepository,
  type AdminPurchaseConfirmationMarketplace,
  type AdminPurchaseConfirmationSortBy,
  type AdminPurchaseConfirmationSortDir,
} from '#repositories/purchase_confirmation_repository'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'
import {
  PurchaseConfirmationPayloadMapperService,
  type AdminPurchaseConfirmationOutput,
} from '#services/purchase_confirmation_payload_mapper_service'

type ListAdminPurchaseConfirmationsInput = {
  page?: number
  perPage?: number
  search?: string
  giftId?: number
  marketplace?: AdminPurchaseConfirmationMarketplace
  confirmedFrom?: string
  confirmedTo?: string
  sortBy?: AdminPurchaseConfirmationSortBy
  sortDir?: AdminPurchaseConfirmationSortDir
}

type ListAdminPurchaseConfirmationsResponse = {
  data: AdminPurchaseConfirmationOutput[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
    sortBy: AdminPurchaseConfirmationSortBy
    sortDir: AdminPurchaseConfirmationSortDir
    filters: {
      search: string | null
      giftId: number | null
      marketplace: AdminPurchaseConfirmationMarketplace | null
      confirmedFrom: string | null
      confirmedTo: string | null
    }
    summary: {
      confirmations: number
      unitsConfirmed: number
      buyersUnique: number
    }
    source: 'database'
  }
}

type NormalizedInput = {
  page: number
  perPage: number
  search: string | undefined
  giftId: number | undefined
  marketplace: AdminPurchaseConfirmationMarketplace | undefined
  confirmedFrom: Date | undefined
  confirmedTo: Date | undefined
  sortBy: AdminPurchaseConfirmationSortBy
  sortDir: AdminPurchaseConfirmationSortDir
}

@inject()
export class AdminPurchaseConfirmationService {
  private static readonly DEFAULT_PAGE = 1
  private static readonly DEFAULT_PER_PAGE = 20
  private static readonly MAX_PER_PAGE = 100
  private static readonly DEFAULT_SORT_BY: AdminPurchaseConfirmationSortBy = 'confirmedAt'
  private static readonly DEFAULT_SORT_DIR: AdminPurchaseConfirmationSortDir = 'desc'

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly purchaseConfirmationRepository: PurchaseConfirmationRepository,
    private readonly purchaseConfirmationPayloadMapperService: PurchaseConfirmationPayloadMapperService,
    private readonly adminQueryNormalizerService: AdminQueryNormalizerService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async list(
    input: ListAdminPurchaseConfirmationsInput
  ): Promise<ListAdminPurchaseConfirmationsResponse> {
    const normalized = this.normalizeInput(input)
    const eventId = await this.eventRepository.findLatestEventId()

    if (!eventId) {
      return this.buildEmptyResponse(normalized)
    }

    try {
      const [rows, total, summary] = await Promise.all([
        this.purchaseConfirmationRepository.findAdminPurchaseConfirmations({
          eventId,
          page: normalized.page,
          perPage: normalized.perPage,
          search: normalized.search,
          giftId: normalized.giftId,
          marketplace: normalized.marketplace,
          confirmedFrom: normalized.confirmedFrom,
          confirmedTo: normalized.confirmedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
        this.purchaseConfirmationRepository.countAdminPurchaseConfirmations({
          eventId,
          search: normalized.search,
          giftId: normalized.giftId,
          marketplace: normalized.marketplace,
          confirmedFrom: normalized.confirmedFrom,
          confirmedTo: normalized.confirmedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
        this.purchaseConfirmationRepository.summarizeAdminPurchaseConfirmations({
          eventId,
          search: normalized.search,
          giftId: normalized.giftId,
          marketplace: normalized.marketplace,
          confirmedFrom: normalized.confirmedFrom,
          confirmedTo: normalized.confirmedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
      ])

      return {
        data: rows.map((row) => this.purchaseConfirmationPayloadMapperService.toAdminListData(row)),
        meta: {
          page: normalized.page,
          perPage: normalized.perPage,
          total,
          totalPages: this.adminQueryNormalizerService.calculateTotalPages(
            total,
            normalized.perPage
          ),
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
          filters: {
            search: normalized.search ?? null,
            giftId: normalized.giftId ?? null,
            marketplace: normalized.marketplace ?? null,
            confirmedFrom: normalized.confirmedFrom?.toISOString() ?? null,
            confirmedTo: normalized.confirmedTo?.toISOString() ?? null,
          },
          summary: {
            confirmations: summary.confirmations,
            unitsConfirmed: summary.unitsConfirmed,
            buyersUnique: summary.buyersUnique,
          },
          source: 'database',
        },
      }
    } catch {
      throw new AdminPurchaseConfirmationListFetchFailedException()
    }
  }

  private normalizeInput(input: ListAdminPurchaseConfirmationsInput): NormalizedInput {
    const page = this.adminQueryNormalizerService.normalizePositiveInt(
      input.page ?? AdminPurchaseConfirmationService.DEFAULT_PAGE,
      'page',
      1,
      Number.MAX_SAFE_INTEGER
    )

    const perPage = this.adminQueryNormalizerService.normalizePositiveInt(
      input.perPage ?? AdminPurchaseConfirmationService.DEFAULT_PER_PAGE,
      'perPage',
      1,
      AdminPurchaseConfirmationService.MAX_PER_PAGE
    )

    const giftId =
      input.giftId === undefined
        ? undefined
        : this.adminQueryNormalizerService.normalizePositiveInt(
            input.giftId,
            'giftId',
            1,
            Number.MAX_SAFE_INTEGER
          )

    const confirmedFrom = this.adminQueryNormalizerService.parseOptionalIsoDate(
      input.confirmedFrom,
      'confirmedFrom'
    )
    const confirmedTo = this.adminQueryNormalizerService.parseOptionalIsoDate(
      input.confirmedTo,
      'confirmedTo'
    )

    this.adminQueryNormalizerService.assertDateRange(
      confirmedFrom,
      confirmedTo,
      'confirmedFrom',
      'confirmedTo'
    )

    return {
      page,
      perPage,
      search: this.inputSanitizerService.normalizeOptionalText(input.search) ?? undefined,
      giftId,
      marketplace: input.marketplace,
      confirmedFrom,
      confirmedTo,
      sortBy: input.sortBy ?? AdminPurchaseConfirmationService.DEFAULT_SORT_BY,
      sortDir: input.sortDir ?? AdminPurchaseConfirmationService.DEFAULT_SORT_DIR,
    }
  }

  private buildEmptyResponse(normalized: NormalizedInput): ListAdminPurchaseConfirmationsResponse {
    return {
      data: [],
      meta: {
        page: normalized.page,
        perPage: normalized.perPage,
        total: 0,
        totalPages: 0,
        sortBy: normalized.sortBy,
        sortDir: normalized.sortDir,
        filters: {
          search: normalized.search ?? null,
          giftId: normalized.giftId ?? null,
          marketplace: normalized.marketplace ?? null,
          confirmedFrom: normalized.confirmedFrom?.toISOString() ?? null,
          confirmedTo: normalized.confirmedTo?.toISOString() ?? null,
        },
        summary: {
          confirmations: 0,
          unitsConfirmed: 0,
          buyersUnique: 0,
        },
        source: 'database',
      },
    }
  }
}
