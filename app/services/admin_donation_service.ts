import { inject } from '@adonisjs/core'

import { ErrorCode } from '#constants/error_code'
import { AdminDonationListFetchFailedException } from '#exceptions/domain_exceptions'
import {
  DonationRepository,
  type AdminDonationSortBy,
  type AdminDonationSortDir,
} from '#repositories/donation_repository'
import { EventRepository } from '#repositories/event_repository'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import {
  DonationPayloadMapperService,
  type AdminDonationOutput,
} from '#services/donation_payload_mapper_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type ListAdminDonationsInput = {
  page?: number
  perPage?: number
  search?: string
  pixDestination?: 'dad' | 'mom'
  donatedFrom?: string
  donatedTo?: string
  sortBy?: AdminDonationSortBy
  sortDir?: AdminDonationSortDir
}

type ListAdminDonationsResponse = {
  data: AdminDonationOutput[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
    sortBy: AdminDonationSortBy
    sortDir: AdminDonationSortDir
    filters: {
      search: string | null
      pixDestination: 'dad' | 'mom' | null
      donatedFrom: string | null
      donatedTo: string | null
    }
    summary: {
      donations: number
      declaredAmountTotal: number
      declaredAmountAverage: number
      donorsUnique: number
    }
    source: 'database'
  }
}

type NormalizedInput = {
  page: number
  perPage: number
  search: string | undefined
  pixDestination: 'dad' | 'mom' | undefined
  donatedFrom: Date | undefined
  donatedTo: Date | undefined
  sortBy: AdminDonationSortBy
  sortDir: AdminDonationSortDir
}

@inject()
export class AdminDonationService {
  private static readonly DEFAULT_PAGE = 1
  private static readonly DEFAULT_PER_PAGE = 20
  private static readonly MAX_PER_PAGE = 100
  private static readonly DEFAULT_SORT_BY: AdminDonationSortBy = 'donatedAt'
  private static readonly DEFAULT_SORT_DIR: AdminDonationSortDir = 'desc'

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly donationRepository: DonationRepository,
    private readonly donationPayloadMapperService: DonationPayloadMapperService,
    private readonly adminQueryNormalizerService: AdminQueryNormalizerService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async list(eventId: number, input: ListAdminDonationsInput): Promise<ListAdminDonationsResponse>
  async list(input: ListAdminDonationsInput): Promise<ListAdminDonationsResponse>
  async list(
    eventIdOrInput: number | ListAdminDonationsInput,
    input?: ListAdminDonationsInput
  ): Promise<ListAdminDonationsResponse> {
    if (typeof eventIdOrInput === 'number') {
      return this.listByEvent(eventIdOrInput, input ?? {})
    }

    const eventId = await this.eventRepository.findLatestEventId()

    if (!eventId) {
      return this.buildEmptyResponse(this.normalizeInput(eventIdOrInput))
    }

    return this.listByEvent(eventId, eventIdOrInput)
  }

  private async listByEvent(
    eventId: number,
    input: ListAdminDonationsInput
  ): Promise<ListAdminDonationsResponse> {
    const normalized = this.normalizeInput(input)

    try {
      const [rows, total, summary] = await Promise.all([
        this.donationRepository.findAdminDonations({
          eventId,
          page: normalized.page,
          perPage: normalized.perPage,
          search: normalized.search,
          pixDestination: normalized.pixDestination,
          donatedFrom: normalized.donatedFrom,
          donatedTo: normalized.donatedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
        this.donationRepository.countAdminDonations({
          eventId,
          search: normalized.search,
          pixDestination: normalized.pixDestination,
          donatedFrom: normalized.donatedFrom,
          donatedTo: normalized.donatedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
        this.donationRepository.summarizeAdminDonations({
          eventId,
          search: normalized.search,
          pixDestination: normalized.pixDestination,
          donatedFrom: normalized.donatedFrom,
          donatedTo: normalized.donatedTo,
          sortBy: normalized.sortBy,
          sortDir: normalized.sortDir,
        }),
      ])

      return {
        data: rows.map((row) => this.donationPayloadMapperService.toAdminListData(row)),
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
            pixDestination: normalized.pixDestination ?? null,
            donatedFrom: normalized.donatedFrom?.toISOString() ?? null,
            donatedTo: normalized.donatedTo?.toISOString() ?? null,
          },
          summary: {
            donations: summary.donations,
            declaredAmountTotal: summary.declaredAmountTotal,
            declaredAmountAverage: summary.declaredAmountAverage,
            donorsUnique: summary.donorsUnique,
          },
          source: 'database',
        },
      }
    } catch {
      throw new AdminDonationListFetchFailedException()
    }
  }

  private normalizeInput(input: ListAdminDonationsInput): NormalizedInput {
    const page = this.adminQueryNormalizerService.normalizePositiveInt(
      input.page ?? AdminDonationService.DEFAULT_PAGE,
      'page',
      1,
      Number.MAX_SAFE_INTEGER
    )

    const perPage = this.adminQueryNormalizerService.normalizePositiveInt(
      input.perPage ?? AdminDonationService.DEFAULT_PER_PAGE,
      'perPage',
      1,
      AdminDonationService.MAX_PER_PAGE
    )

    const donatedFrom = this.adminQueryNormalizerService.parseOptionalIsoDate(
      input.donatedFrom,
      'donatedFrom'
    )
    const donatedTo = this.adminQueryNormalizerService.parseOptionalIsoDate(
      input.donatedTo,
      'donatedTo'
    )

    this.adminQueryNormalizerService.assertDateRange(
      donatedFrom,
      donatedTo,
      'donatedFrom',
      'donatedTo',
      ErrorCode.INVALID_DONATION_FILTER_RANGE
    )

    return {
      page,
      perPage,
      search: this.inputSanitizerService.normalizeOptionalText(input.search) ?? undefined,
      pixDestination: input.pixDestination,
      donatedFrom,
      donatedTo,
      sortBy: input.sortBy ?? AdminDonationService.DEFAULT_SORT_BY,
      sortDir: input.sortDir ?? AdminDonationService.DEFAULT_SORT_DIR,
    }
  }

  private buildEmptyResponse(normalized: NormalizedInput): ListAdminDonationsResponse {
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
          pixDestination: normalized.pixDestination ?? null,
          donatedFrom: normalized.donatedFrom?.toISOString() ?? null,
          donatedTo: normalized.donatedTo?.toISOString() ?? null,
        },
        summary: {
          donations: 0,
          declaredAmountTotal: 0,
          declaredAmountAverage: 0,
          donorsUnique: 0,
        },
        source: 'database',
      },
    }
  }
}
