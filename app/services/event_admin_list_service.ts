import { inject } from '@adonisjs/core'

import {
  EventRepository,
  type AdminEventStatusFilter,
  type ListAdminEventsInput,
} from '#repositories/event_repository'
import { InputSanitizerService } from '#services/input_sanitizer_service'

type ListAdminEventsQuery = {
  page?: number
  perPage?: number
  status?: AdminEventStatusFilter
  search?: string
}

@inject()
export class EventAdminListService {
  private static readonly DEFAULT_PAGE = 1
  private static readonly DEFAULT_PER_PAGE = 20
  private static readonly MAX_PER_PAGE = 100

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly inputSanitizerService: InputSanitizerService
  ) {}

  async list(adminId: number, query: ListAdminEventsQuery) {
    const normalized = this.normalizeInput(adminId, query)

    const [events, total] = await Promise.all([
      this.eventRepository.listByAdminWithCounts(normalized),
      this.eventRepository.countByAdminWithFilters(normalized),
    ])

    return {
      data: events.map((event) => ({
        id: event.id,
        code: event.code,
        name: event.name,
        date: event.date.toISOString(),
        isArchived: event.isArchived,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        counters: {
          guests: event.guestsCount,
          gifts: event.giftsCount,
          donations: event.donationsCount,
        },
      })),
      meta: {
        page: normalized.page,
        perPage: normalized.perPage,
        total,
        totalPages: Math.ceil(total / normalized.perPage),
        filters: {
          status: normalized.status ?? null,
          search: normalized.search ?? null,
        },
      },
    }
  }

  private normalizeInput(adminId: number, query: ListAdminEventsQuery): ListAdminEventsInput {
    return {
      adminId,
      page: this.normalizePositiveInt(query.page, EventAdminListService.DEFAULT_PAGE),
      perPage: this.normalizePositiveInt(
        query.perPage,
        EventAdminListService.DEFAULT_PER_PAGE,
        EventAdminListService.MAX_PER_PAGE
      ),
      status: query.status,
      search: this.inputSanitizerService.normalizeOptionalText(query.search) ?? undefined,
    }
  }

  private normalizePositiveInt(value: number | undefined, fallback: number, max?: number): number {
    if (!value || !Number.isInteger(value) || value <= 0) {
      return fallback
    }

    if (max && value > max) {
      return max
    }

    return value
  }
}
