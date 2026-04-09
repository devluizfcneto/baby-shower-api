export class InputSanitizerService {
  normalizeRequiredText(value: string): string {
    return value.trim()
  }

  normalizeOptionalText(value?: string | null): string | null {
    const normalized = value?.trim()
    return normalized ? normalized : null
  }

  normalizeEmail(value: string): string {
    return value.trim().toLowerCase()
  }

  normalizeOptionalEmail(value?: string | null): string | null {
    const normalized = value?.trim().toLowerCase()
    return normalized ? normalized : null
  }
}
