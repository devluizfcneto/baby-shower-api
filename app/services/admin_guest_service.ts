import { inject } from '@adonisjs/core'

import { AdminGuestListFetchFailedException } from '#exceptions/domain_exceptions'
import {
  GuestRepository,
  type AdminConfirmedPersonProjection,
  type AdminGuestSortBy,
  type AdminGuestSortDir,
} from '#repositories/guest_repository'
import { EventRepository } from '#repositories/event_repository'
import { AdminQueryNormalizerService } from '#services/admin_query_normalizer_service'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type ListAdminGuestsInput = {
  page?: number
  perPage?: number
  search?: string
  confirmedFrom?: string
  confirmedTo?: string
  sortBy?: AdminGuestSortBy
  sortDir?: AdminGuestSortDir
}

type AdminGuestOutput = {
  personId: number
  guestId: number
  fullName: string
  email: string | null
  confirmedAt: string
  personType: 'guest' | 'companion'
}

type ListAdminGuestsResponse = {
  data: AdminGuestOutput[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
    sortBy: AdminGuestSortBy
    sortDir: AdminGuestSortDir
    filters: {
      search: string | null
      confirmedFrom: string | null
      confirmedTo: string | null
    }
    summary: {
      guests: number
      companions: number
      totalPeople: number
    }
    source: 'database'
  }
}

type NormalizedInput = {
  page: number
  perPage: number
  search: string | undefined
  confirmedFrom: Date | undefined
  confirmedTo: Date | undefined
  sortBy: AdminGuestSortBy
  sortDir: AdminGuestSortDir
}

@inject()
export class AdminGuestService {
  private static readonly DEFAULT_PAGE = 1
  private static readonly DEFAULT_PER_PAGE = 20
  private static readonly MAX_PER_PAGE = 100
  private static readonly DEFAULT_SORT_BY: AdminGuestSortBy = 'confirmedAt'
  private static readonly DEFAULT_SORT_DIR: AdminGuestSortDir = 'desc'

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly guestRepository: GuestRepository,
    private readonly adminQueryNormalizerService: AdminQueryNormalizerService,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async list(eventId: number, input: ListAdminGuestsInput): Promise<ListAdminGuestsResponse>
  async list(input: ListAdminGuestsInput): Promise<ListAdminGuestsResponse>
  async list(
    eventIdOrInput: number | ListAdminGuestsInput,
    input?: ListAdminGuestsInput
  ): Promise<ListAdminGuestsResponse> {
    const eventId =
      typeof eventIdOrInput === 'number'
        ? eventIdOrInput
        : await this.eventRepository.findLatestEventId()
    const resolvedInput = (typeof eventIdOrInput === 'number' ? input : eventIdOrInput) ?? {}

    if (!eventId) {
      return this.buildEmptyResponse(this.normalizeInput(resolvedInput))
    }

    const normalizedInput = this.normalizeInput(resolvedInput)

    try {
      const [rows, total] = await Promise.all([
        this.guestRepository.findAdminConfirmedPeople({
          eventId,
          page: normalizedInput.page,
          perPage: normalizedInput.perPage,
          search: normalizedInput.search,
          confirmedFrom: normalizedInput.confirmedFrom,
          confirmedTo: normalizedInput.confirmedTo,
          sortBy: normalizedInput.sortBy,
          sortDir: normalizedInput.sortDir,
        }),
        this.guestRepository.countAdminConfirmedPeople({
          eventId,
          page: normalizedInput.page,
          perPage: normalizedInput.perPage,
          search: normalizedInput.search,
          confirmedFrom: normalizedInput.confirmedFrom,
          confirmedTo: normalizedInput.confirmedTo,
          sortBy: normalizedInput.sortBy,
          sortDir: normalizedInput.sortDir,
        }),
      ])

      const data = rows.map((row) => this.mapGuestOutput(row))
      const guestsTotal = rows.filter((row) => row.personType === 'guest').length
      const companionsTotal = rows.length - guestsTotal

      return {
        data,
        meta: {
          page: normalizedInput.page,
          perPage: normalizedInput.perPage,
          total,
          totalPages: this.adminQueryNormalizerService.calculateTotalPages(
            total,
            normalizedInput.perPage
          ),
          sortBy: normalizedInput.sortBy,
          sortDir: normalizedInput.sortDir,
          filters: {
            search: normalizedInput.search ?? null,
            confirmedFrom: normalizedInput.confirmedFrom?.toISOString() ?? null,
            confirmedTo: normalizedInput.confirmedTo?.toISOString() ?? null,
          },
          summary: {
            guests: guestsTotal,
            companions: companionsTotal,
            totalPeople: data.length,
          },
          source: 'database',
        },
      }
    } catch {
      throw new AdminGuestListFetchFailedException()
    }
  }

  private normalizeInput(input: ListAdminGuestsInput): NormalizedInput {
    const page = this.adminQueryNormalizerService.normalizePositiveInt(
      input.page ?? AdminGuestService.DEFAULT_PAGE,
      'page',
      1,
      Number.MAX_SAFE_INTEGER
    )
    const perPage = this.adminQueryNormalizerService.normalizePositiveInt(
      input.perPage ?? AdminGuestService.DEFAULT_PER_PAGE,
      'perPage',
      1,
      AdminGuestService.MAX_PER_PAGE
    )

    const search = this.inputSanitizerService.normalizeOptionalText(input.search) ?? undefined
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
      search,
      confirmedFrom,
      confirmedTo,
      sortBy: input.sortBy ?? AdminGuestService.DEFAULT_SORT_BY,
      sortDir: input.sortDir ?? AdminGuestService.DEFAULT_SORT_DIR,
    }
  }

  private mapGuestOutput(row: AdminConfirmedPersonProjection): AdminGuestOutput {
    return {
      personId: row.personId,
      guestId: row.guestId,
      fullName: row.fullName,
      email: row.email,
      confirmedAt: row.confirmedAt.toISOString(),
      personType: row.personType,
    }
  }

  private buildEmptyResponse(normalizedInput: NormalizedInput): ListAdminGuestsResponse {
    return {
      data: [],
      meta: {
        page: normalizedInput.page,
        perPage: normalizedInput.perPage,
        total: 0,
        totalPages: 0,
        sortBy: normalizedInput.sortBy,
        sortDir: normalizedInput.sortDir,
        filters: {
          search: normalizedInput.search ?? null,
          confirmedFrom: normalizedInput.confirmedFrom?.toISOString() ?? null,
          confirmedTo: normalizedInput.confirmedTo?.toISOString() ?? null,
        },
        summary: {
          guests: 0,
          companions: 0,
          totalPeople: 0,
        },
        source: 'database',
      },
    }
  }
}
