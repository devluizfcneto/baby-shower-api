import { inject } from '@adonisjs/core'
import * as XLSX from 'xlsx'

import { validationError } from '#exceptions/error_factory'

type GiftMarketplace = 'amazon' | 'mercadolivre' | 'shopee'

export type ParsedGiftImportRow = {
  name: string
  description: string
  imageUrl: string | null
  marketplaceUrl: string
  marketplace: GiftMarketplace
  maxQuantity: number
  confirmedQuantity: number
  isBlocked: boolean
  createdAt: Date
  updatedAt: Date
}

type ParseGiftImportPayload = {
  fileBase64: string
  fileName?: string
  fileType?: 'csv' | 'xlsx'
}

@inject()
export class GiftImportParserService {
  parse(payload: ParseGiftImportPayload): ParsedGiftImportRow[] {
    const buffer = this.parseBase64(payload.fileBase64)

    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        raw: false,
        cellDates: true,
      })
    } catch {
      throw validationError([
        {
          field: 'fileBase64',
          message: 'Arquivo invalido. Envie um CSV ou XLSX em base64.',
        },
      ])
    }

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw validationError([
        {
          field: 'fileBase64',
          message: 'Arquivo sem planilha valida para importacao.',
        },
      ])
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    })

    if (rawRows.length === 0) {
      throw validationError([
        {
          field: 'fileBase64',
          message: 'Arquivo sem linhas para importacao.',
        },
      ])
    }

    const errors: Array<{ field: string; message: string }> = []
    const parsedRows: ParsedGiftImportRow[] = []

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2
      const normalizedRow = this.normalizeRowKeys(row)

      const name = this.parseRequiredText(normalizedRow['name'])
      const description = this.parseRequiredText(normalizedRow['description'])
      const imageUrl = this.parseOptionalText(normalizedRow['image_url'])
      const marketplaceUrl = this.parseRequiredText(normalizedRow['marketplace_url'])
      const marketplace = this.parseMarketplace(normalizedRow['marketplace'])
      const maxQuantity = this.parseRequiredInt(normalizedRow['max_quantity'])
      const confirmedQuantity = this.parseOptionalInt(normalizedRow['confirmed_quantity']) ?? 0
      const isBlocked = this.parseOptionalBoolean(normalizedRow['is_blocked']) ?? false
      const createdAt = this.parseOptionalDate(normalizedRow['created_at']) ?? new Date()
      const updatedAt = this.parseOptionalDate(normalizedRow['updated_at']) ?? new Date()

      if (!name) {
        errors.push({ field: `rows[${rowNumber}].name`, message: 'name e obrigatorio.' })
      }

      if (!description) {
        errors.push({
          field: `rows[${rowNumber}].description`,
          message: 'description e obrigatorio.',
        })
      }

      if (!marketplaceUrl) {
        errors.push({
          field: `rows[${rowNumber}].marketplace_url`,
          message: 'marketplace_url e obrigatorio.',
        })
      } else if (!this.isValidUrl(marketplaceUrl)) {
        errors.push({
          field: `rows[${rowNumber}].marketplace_url`,
          message: 'marketplace_url deve ser uma URL valida.',
        })
      }

      if (!marketplace) {
        errors.push({
          field: `rows[${rowNumber}].marketplace`,
          message: 'marketplace deve ser amazon, mercadolivre ou shopee.',
        })
      }

      if (maxQuantity === null || maxQuantity <= 0) {
        errors.push({
          field: `rows[${rowNumber}].max_quantity`,
          message: 'max_quantity deve ser inteiro maior que zero.',
        })
      }

      if (confirmedQuantity < 0) {
        errors.push({
          field: `rows[${rowNumber}].confirmed_quantity`,
          message: 'confirmed_quantity deve ser inteiro maior ou igual a zero.',
        })
      }

      if (maxQuantity !== null && confirmedQuantity > maxQuantity) {
        errors.push({
          field: `rows[${rowNumber}].confirmed_quantity`,
          message: 'confirmed_quantity nao pode ser maior que max_quantity.',
        })
      }

      if (!createdAt) {
        errors.push({
          field: `rows[${rowNumber}].created_at`,
          message: 'created_at invalido.',
        })
      }

      if (!updatedAt) {
        errors.push({
          field: `rows[${rowNumber}].updated_at`,
          message: 'updated_at invalido.',
        })
      }

      if (
        name &&
        description &&
        marketplaceUrl &&
        marketplace &&
        maxQuantity !== null &&
        maxQuantity > 0 &&
        confirmedQuantity >= 0 &&
        confirmedQuantity <= maxQuantity
      ) {
        parsedRows.push({
          name,
          description,
          imageUrl,
          marketplaceUrl,
          marketplace,
          maxQuantity,
          confirmedQuantity,
          isBlocked,
          createdAt,
          updatedAt,
        })
      }
    })

    if (errors.length > 0) {
      throw validationError(errors)
    }

    return parsedRows
  }

  private parseBase64(fileBase64: string): Buffer {
    const sanitized = fileBase64.trim().replace(/^data:[^;]+;base64,/, '')

    try {
      const buffer = Buffer.from(sanitized, 'base64')

      if (buffer.length === 0) {
        throw new Error('empty')
      }

      return buffer
    } catch {
      throw validationError([
        {
          field: 'fileBase64',
          message: 'Conteudo base64 invalido.',
        },
      ])
    }
  }

  private normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key.trim().toLowerCase()] = value
      return acc
    }, {})
  }

  private parseRequiredText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null
    }

    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : null
  }

  private parseOptionalText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null
    }

    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : null
  }

  private parseRequiredInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const normalized = Number(value)

    if (!Number.isInteger(normalized)) {
      return null
    }

    return normalized
  }

  private parseOptionalInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const normalized = Number(value)
    return Number.isInteger(normalized) ? normalized : null
  }

  private parseOptionalBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    if (typeof value === 'boolean') {
      return value
    }

    const normalized = String(value).trim().toLowerCase()

    if (['true', '1', 'yes', 'sim'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'nao'].includes(normalized)) {
      return false
    }

    return null
  }

  private parseOptionalDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value
    }

    const parsed = new Date(String(value))

    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    return parsed
  }

  private parseMarketplace(value: unknown): GiftMarketplace | null {
    if (value === null || value === undefined) {
      return null
    }

    const normalized = String(value).trim().toLowerCase()

    if (normalized === 'amazon' || normalized === 'mercadolivre' || normalized === 'shopee') {
      return normalized
    }

    return null
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }
}
