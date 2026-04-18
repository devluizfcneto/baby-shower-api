export class DateTimeFormatterService {
  private static readonly BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

  formatForEndUser(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      return 'Data invalida'
    }

    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: DateTimeFormatterService.BRAZIL_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const day = this.getPart(parts, 'day')
    const month = this.getPart(parts, 'month')
    const year = this.getPart(parts, 'year')
    const hour = this.getPart(parts, 'hour')
    const minute = this.getPart(parts, 'minute')

    return `${day}-${month}-${year} ${hour}:${minute}`
  }

  private getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? ''
  }
}
