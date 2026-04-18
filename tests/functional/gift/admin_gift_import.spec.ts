import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Event } from '#entities/event'
import { Gift } from '#entities/gift'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Gift Import', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
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

  async function login(
    client: any,
    email = 'admin@baby-shower.local',
    password = 'StrongPass#2026'
  ) {
    const response = await client.post('/api/admin/login').json({
      email,
      password,
    })

    response.assertStatus(200)
    return response.body().accessToken as string
  }

  async function createEvent(adminId: number, code = 'babyimport202601') {
    return AppDataSource.getRepository(Event).save({
      adminId,
      code,
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: null,
      deliveryAddress2: null,
      deliveryAddress3: null,
      mapsLink: null,
      coverImageUrl: null,
      eventDetail: null,
      pixKeyDad: null,
      pixKeyMom: null,
    })
  }

  function toBase64(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64')
  }

  test('POST /api/admin/events/:eventId/gifts/import imports CSV rows with defaults', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)
    const accessToken = await login(client)

    const csv = [
      'name,description,image_url,marketplace_url,marketplace,max_quantity,confirmed_quantity,is_blocked,created_at,updated_at',
      'Fralda RN,Pacote com 36 unidades,https://img.example.com/fralda.jpg,https://example.com/fralda,amazon,5,,,,',
      'Banheira,Banheira dobravel,,https://example.com/banheira,mercadolivre,3,1,true,2026-04-01,2026-04-02',
    ].join('\n')

    const response = await client
      .post(`/api/admin/events/${event.id}/gifts/import`)
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        fileBase64: toBase64(csv),
        fileType: 'csv',
        fileName: 'gifts.csv',
      })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        eventId: event.id,
        importedCount: 2,
        source: 'file',
      },
    })

    const gifts = await AppDataSource.getRepository(Gift).find({
      where: { eventId: event.id },
      order: { sortOrder: 'ASC' },
    })

    assert.lengthOf(gifts, 2)

    assert.equal(gifts[0].name, 'Fralda RN')
    assert.equal(gifts[0].description, 'Pacote com 36 unidades')
    assert.equal(gifts[0].imageUrl, 'https://img.example.com/fralda.jpg')
    assert.equal(gifts[0].confirmedQuantity, 0)
    assert.equal(gifts[0].isBlocked, false)

    assert.equal(gifts[1].name, 'Banheira')
    assert.isNull(gifts[1].imageUrl)
    assert.equal(gifts[1].confirmedQuantity, 1)
    assert.equal(gifts[1].isBlocked, true)
  })

  test('POST /api/admin/events/:eventId/gifts/import returns 422 for invalid row values', async ({
    client,
  }) => {
    const admin = await createAdmin()
    const event = await createEvent(admin.id)
    const accessToken = await login(client)

    const csv = [
      'name,description,marketplace_url,marketplace,max_quantity',
      'Fralda RN,Pacote com 36 unidades,https://example.com/fralda,invalid_marketplace,5',
    ].join('\n')

    const response = await client
      .post(`/api/admin/events/${event.id}/gifts/import`)
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        fileBase64: toBase64(csv),
      })

    response.assertStatus(422)
  })
})
