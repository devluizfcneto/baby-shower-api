type RsvpNotificationPayload = {
  guestFullName: string
  guestEmail: string
  companions: Array<{
    fullName: string
    email: string
  }>
  confirmedAt: Date
}

export class RsvpNotificationService {
  async sendGuestConfirmation(payload: RsvpNotificationPayload) {
    // Placeholder for SMTP integration; keep best-effort flow to avoid blocking RSVP persistence.
    console.info('[rsvp_notification] guest confirmation queued', {
      guestEmail: payload.guestEmail,
      companionsCount: payload.companions.length,
      confirmedAt: payload.confirmedAt.toISOString(),
    })
  }

  async sendAdminNotification(payload: RsvpNotificationPayload) {
    // Placeholder for SMTP integration; keep best-effort flow to avoid blocking RSVP persistence.
    console.info('[rsvp_notification] admin notification queued', {
      guestName: payload.guestFullName,
      guestEmail: payload.guestEmail,
      companionsCount: payload.companions.length,
      confirmedAt: payload.confirmedAt.toISOString(),
    })
  }

  async sendCompanionConfirmation(
    payload: RsvpNotificationPayload,
    companion: RsvpNotificationPayload['companions'][number]
  ) {
    // Placeholder for SMTP integration; keep best-effort flow to avoid blocking RSVP persistence.
    console.info('[rsvp_notification] companion confirmation queued', {
      companionName: companion.fullName,
      companionEmail: companion.email,
      hostGuestEmail: payload.guestEmail,
      confirmedAt: payload.confirmedAt.toISOString(),
    })
  }
}
