type CsvScalar = string | number | boolean | Date | null | undefined

type CsvRow<THeader extends string> = Record<THeader, CsvScalar>

type BuildCsvInput<THeader extends string> = {
  headers: THeader[]
  rows: Array<CsvRow<THeader>>
  includeBom?: boolean
}

export class CsvBuilderService {
  private static readonly DELIMITER = ','

  build<THeader extends string>({ headers, rows, includeBom = true }: BuildCsvInput<THeader>) {
    const headerLine = headers.join(CsvBuilderService.DELIMITER)
    const rowLines = rows.map((row) => this.serializeRow(headers, row))
    const csv = [headerLine, ...rowLines].join('\n')

    if (!includeBom) {
      return csv
    }

    return `\uFEFF${csv}`
  }

  private serializeRow<THeader extends string>(headers: THeader[], row: CsvRow<THeader>): string {
    return headers
      .map((header) => this.escapeValue(this.normalizeValue(row[header])))
      .join(CsvBuilderService.DELIMITER)
  }

  private normalizeValue(value: CsvScalar): string {
    if (value === null || value === undefined) {
      return ''
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    return String(value)
  }

  private escapeValue(value: string): string {
    if (!/[",\n\r]/.test(value)) {
      return value
    }

    return `"${value.replace(/"/g, '""')}"`
  }
}
