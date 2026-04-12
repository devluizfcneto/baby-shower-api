import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'

import { Companion } from '#entities/companion'
import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { Guest } from '#entities/guest'
import { PurchaseConfirmation } from '#entities/purchase_confirmation'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Export Reports', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, purchase_confirmations, companions, guests, gifts, donations, events RESTART IDENTITY CASCADE'
    )
  })

  async function createAdmin(email = 'admin@baby-shower.local', password = 'StrongPass#2026') {
    const passwordHash = await hash.make(password)

    return AppDataSource.getRepository(User).save({
      name: 'Admin',
      email,
      password: passwordHash,
    })
  }

  async function login(client: any) {
    const response = await client.post('/api/admin/login').json({
      email: 'admin@baby-shower.local',
      password: 'StrongPass#2026',
    })

    response.assertStatus(200)
    return response.body().accessToken as string
  }

  async function createEvent(code = 'adminexport2026event') {
    return AppDataSource.getRepository(Event).save({
      code,
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
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

  async function createGuest(eventId: number, input?: Partial<Guest>) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`

    return AppDataSource.getRepository(Guest).save({
      eventId,
      fullName: 'Convidado Base',
      email: `export-guest-${suffix}@example.com`,
      confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
      ...input,
    })
  }

  async function createCompanion(eventId: number, guestId: number, input?: Partial<Companion>) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`

    return AppDataSource.getRepository(Companion).save({
      eventId,
      guestId,
      fullName: 'Acompanhante Base',
      email: `export-companion-${suffix}@example.com`,
      ...input,
    })
  }

  async function createGift(eventId: number, input?: Partial<Gift>) {
    return AppDataSource.getRepository(Gift).save({
      eventId,
      name: 'Kit Mamadeiras',
      description: null,
      imageUrl: null,
      marketplace: 'amazon',
      marketplaceUrl: 'https://example.com/kit-mamadeiras',
      asin: null,
      affiliateLinkAmazon: null,
      affiliateLinkMl: null,
      affiliateLinkShopee: null,
      maxQuantity: 10,
      confirmedQuantity: 0,
      isBlocked: false,
      sortOrder: 1,
      ...input,
    })
  }

  async function createConfirmation(giftId: number, input?: Partial<PurchaseConfirmation>) {
    const random = Math.floor(Math.random() * 100000)

    return AppDataSource.getRepository(PurchaseConfirmation).save({
      giftId,
      guestName: `Comprador ${random}`,
      guestEmail: `comprador.${random}@example.com`,
      quantity: 1,
      orderNumber: `EXP-${random}`,
      notes: null,
      confirmedAt: new Date('2026-06-15T14:30:00.000Z'),
      ...input,
    })
  }

  test('GET /api/admin/export/guests returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/export/guests')
    response.assertStatus(401)
  })

  test('GET /api/admin/export/purchases returns 401 without authentication', async ({ client }) => {
    const response = await client.get('/api/admin/export/purchases')
    response.assertStatus(401)
  })

  test('GET /api/admin/export/guests returns CSV with expected headers and rows', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const guest = await createGuest(event.id, {
      fullName: 'Ana Export',
      email: 'ana.export@example.com',
      confirmedAt: new Date('2026-06-10T10:00:00.000Z'),
    })

    await createCompanion(event.id, guest.id, {
      fullName: 'Acompanhante Ana 1',
      email: 'ana.c1@example.com',
    })
    await createCompanion(event.id, guest.id, {
      fullName: 'Acompanhante Ana 2',
      email: 'ana.c2@example.com',
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/export/guests')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')

    const contentDisposition = response.header('content-disposition')
    assert.include(contentDisposition, 'attachment; filename="guests-report-')

    const csv = response.text()
    assert.include(
      csv,
      'guestId,fullName,email,companionsCount,totalPeople,companionsNames,confirmedAt'
    )
    assert.include(csv, 'Ana Export')
    assert.include(csv, 'Acompanhante Ana 1 | Acompanhante Ana 2')
  })

  test('GET /api/admin/export/purchases returns CSV and applies marketplace filter', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const amazonGift = await createGift(event.id, {
      name: 'Fralda Premium',
      marketplace: 'amazon',
    })

    const mlGift = await createGift(event.id, {
      name: 'Toalha Mercado',
      marketplace: 'mercadolivre',
      marketplaceUrl: 'https://example.com/toalha-mercado',
    })

    await createConfirmation(amazonGift.id, {
      guestName: 'Comprador Amazon',
      guestEmail: 'comprador.amazon@example.com',
      quantity: 2,
    })

    await createConfirmation(mlGift.id, {
      guestName: 'Comprador ML',
      guestEmail: 'comprador.ml@example.com',
      quantity: 1,
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/export/purchases?marketplace=amazon')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')

    const contentDisposition = response.header('content-disposition')
    assert.include(contentDisposition, 'attachment; filename="purchases-report-')

    const csv = response.text()
    assert.include(
      csv,
      'confirmationId,giftId,giftName,marketplace,guestName,guestEmail,quantity,orderNumber,notes,confirmedAt'
    )
    assert.include(csv, 'Fralda Premium')
    assert.notInclude(csv, 'Toalha Mercado')
  })

  test('GET /api/admin/export/guests returns CSV with only headers when there are no rows', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/export/guests')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)

    const csv = response.text().trim()
    assert.equal(
      csv,
      'guestId,fullName,email,companionsCount,totalPeople,companionsNames,confirmedAt'
    )
  })

  test('GET /api/admin/export/purchases returns 422 for invalid filter range', async ({
    client,
  }) => {
    await createAdmin()
    await createEvent()
    const accessToken = await login(client)

    const response = await client
      .get(
        '/api/admin/export/purchases?dateFrom=2026-06-30T23:59:59.999Z&dateTo=2026-06-01T00:00:00.000Z'
      )
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          code: 'INVALID_EXPORT_FILTER_RANGE',
        },
      ],
    })
  })

  test('GET /api/admin/export/guests executes predictable query count and avoids N+1', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const event = await createEvent()

    const guestA = await createGuest(event.id, { email: 'export.qc.a@example.com' })
    await createCompanion(event.id, guestA.id, { email: 'export.qc.ac1@example.com' })

    const guestB = await createGuest(event.id, { email: 'export.qc.b@example.com' })
    await createCompanion(event.id, guestB.id, { email: 'export.qc.bc1@example.com' })

    const accessToken = await login(client)

    let queryCount = 0
    const originalCreateQueryRunner = AppDataSource.createQueryRunner.bind(AppDataSource)

    ;(AppDataSource as any).createQueryRunner = (...args: any[]) => {
      const queryRunner = originalCreateQueryRunner(...args)
      const originalQuery = queryRunner.query.bind(queryRunner)
      queryRunner.query = async (...queryArgs: any[]) => {
        queryCount += 1
        const [query, parameters, useStructuredResult] = queryArgs as [
          string,
          any[] | undefined,
          boolean | undefined,
        ]

        if (useStructuredResult === true) {
          return originalQuery(query, parameters, true)
        }

        return originalQuery(query, parameters)
      }

      return queryRunner
    }

    try {
      const response = await client
        .get('/api/admin/export/guests')
        .header('authorization', `Bearer ${accessToken}`)

      response.assertStatus(200)
      assert.equal(queryCount, 2)
    } finally {
      ;(AppDataSource as any).createQueryRunner = originalCreateQueryRunner
    }
  })
})
