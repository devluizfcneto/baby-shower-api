import { test } from '@japa/runner'

import { Companion } from '#entities/companion'
import { Event } from '#entities/event'
import { Guest } from '#entities/guest'
import { AppDataSource } from '#services/database_service'
import { RsvpNotificationService } from '#services/rsvp_notification_service'

test.group('POST /api/events/:eventCode/rsvp', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query('TRUNCATE TABLE companions, guests, events RESTART IDENTITY CASCADE')
  })

  async function createEvent() {
    const uniqueSuffix = Date.now().toString().slice(-8)
    return AppDataSource.getRepository(Event).save({
      code: `evt${uniqueSuffix}`,
      name: 'Cha da Helena',
      date: new Date('2026-08-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: null,
      mapsLink: null,
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })
  }

  test('confirms presence without companions', async ({ client, assert }) => {
    const event = await createEvent()

    const response = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado Teste',
      email: 'convidado.teste@example.com',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        fullName: 'Convidado Teste',
        email: 'convidado.teste@example.com',
        companionsCount: 0,
      },
      meta: {
        emailDispatch: 'queued_or_best_effort',
      },
    })

    const savedGuest = await AppDataSource.getRepository(Guest).findOne({
      where: { email: 'convidado.teste@example.com' },
    })

    assert.isNotNull(savedGuest)
    assert.equal(savedGuest?.eventId, event.id)
  })

  test('confirms presence with companions', async ({ client, assert }) => {
    const event = await createEvent()

    const response = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado Teste',
      email: 'convidado.acompanhantes@example.com',
      companions: [
        { fullName: 'Acompanhante 1', email: 'acompanhante1@example.com' },
        { fullName: 'Acompanhante 2', email: 'acompanhante2@example.com' },
      ],
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        companionsCount: 2,
      },
    })

    const guest = await AppDataSource.getRepository(Guest).findOne({
      where: { email: 'convidado.acompanhantes@example.com' },
    })

    assert.isNotNull(guest)

    const companionCount = await AppDataSource.getRepository(Companion).count({
      where: { guestId: guest!.id },
    })

    assert.equal(companionCount, 2)

    const persistedCompanion = await AppDataSource.getRepository(Companion).findOne({
      where: { guestId: guest!.id, eventId: event.id, email: 'acompanhante1@example.com' },
    })

    assert.isNotNull(persistedCompanion)
  })

  test('returns 422 for invalid payload', async ({ client }) => {
    const event = await createEvent()

    const response = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'A',
      email: 'invalid-email',
      companions: [{ fullName: 'B', email: 'invalid-email' }],
    })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          code: 'UNPROCESSABLE_ENTITY',
        },
      ],
    })
  })

  test('returns 422 when more than 2 companions are provided', async ({ client }) => {
    const event = await createEvent()

    const response = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado Teste',
      email: 'limite@example.com',
      companions: [
        { fullName: 'Acompanhante 1', email: 'limite1@example.com' },
        { fullName: 'Acompanhante 2', email: 'limite2@example.com' },
        { fullName: 'Acompanhante 3', email: 'limite3@example.com' },
      ],
    })

    response.assertStatus(422)
  })

  test('returns 404 when eventCode path param is missing', async ({ client }) => {
    await createEvent()

    const response = await client.post('/api/events').json({
      fullName: 'Convidado Sem Query',
      email: 'sem-query@example.com',
    })

    response.assertStatus(404)
  })

  test('returns 409 when the same email confirms twice for the same event', async ({ client }) => {
    const event = await createEvent()

    const payload = {
      fullName: 'Convidado Duplicado',
      email: 'duplicado@example.com',
    }

    const firstResponse = await client.post(`/api/events/${event.code}/rsvp`).json(payload)
    firstResponse.assertStatus(201)

    const secondResponse = await client.post(`/api/events/${event.code}/rsvp`).json(payload)
    secondResponse.assertStatus(409)
    secondResponse.assertBodyContains({
      errors: [
        {
          code: 'RSVP_ALREADY_CONFIRMED',
        },
      ],
    })
  })

  test('persists RSVP even when notification dispatch fails', async ({ client, assert }) => {
    const event = await createEvent()

    const originalGuestNotification = RsvpNotificationService.prototype.sendGuestConfirmation
    const originalAdminNotification = RsvpNotificationService.prototype.sendAdminNotification

    RsvpNotificationService.prototype.sendGuestConfirmation = async () => {
      throw new Error('smtp down')
    }

    RsvpNotificationService.prototype.sendAdminNotification = async () => {
      throw new Error('smtp down')
    }

    try {
      const response = await client.post(`/api/events/${event.code}/rsvp`).json({
        fullName: 'Convidado Sem Email',
        email: 'sem-email@example.com',
      })

      response.assertStatus(201)

      const savedGuest = await AppDataSource.getRepository(Guest).findOne({
        where: { email: 'sem-email@example.com' },
      })

      assert.isNotNull(savedGuest)
    } finally {
      RsvpNotificationService.prototype.sendGuestConfirmation = originalGuestNotification
      RsvpNotificationService.prototype.sendAdminNotification = originalAdminNotification
    }
  })

  test('ignores companion already registered by email in the same event', async ({
    client,
    assert,
  }) => {
    const event = await createEvent()

    const firstResponse = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado 1',
      email: 'convidado1@example.com',
      companions: [{ fullName: 'Acompanhante Unico', email: 'duplicado.companion@example.com' }],
    })

    firstResponse.assertStatus(201)

    const secondResponse = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado 2',
      email: 'convidado2@example.com',
      companions: [
        { fullName: 'Acompanhante Repetido', email: 'duplicado.companion@example.com' },
        { fullName: 'Acompanhante Novo', email: 'novo.companion@example.com' },
      ],
    })

    secondResponse.assertStatus(201)
    secondResponse.assertBodyContains({
      data: {
        companionsCount: 1,
      },
    })

    const duplicateEmailCount = await AppDataSource.getRepository(Companion)
      .createQueryBuilder('companion')
      .where('LOWER(companion.email) = LOWER(:email)', {
        email: 'duplicado.companion@example.com',
      })
      .getCount()

    const newEmailCount = await AppDataSource.getRepository(Companion)
      .createQueryBuilder('companion')
      .where('LOWER(companion.email) = LOWER(:email)', {
        email: 'novo.companion@example.com',
      })
      .getCount()

    assert.equal(duplicateEmailCount, 1)
    assert.equal(newEmailCount, 1)
  })

  test('returns 409 when trying to confirm guest with an email already used by a companion in the same event', async ({
    client,
  }) => {
    const event = await createEvent()

    const firstResponse = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado Original',
      email: 'convidado.original@example.com',
      companions: [{ fullName: 'Acompanhante Existente', email: 'email.repetido@example.com' }],
    })

    firstResponse.assertStatus(201)

    const secondResponse = await client.post(`/api/events/${event.code}/rsvp`).json({
      fullName: 'Convidado Conflitante',
      email: 'email.repetido@example.com',
    })

    secondResponse.assertStatus(409)
    secondResponse.assertBodyContains({
      errors: [
        {
          code: 'RSVP_ALREADY_CONFIRMED',
        },
      ],
    })
  })
})
