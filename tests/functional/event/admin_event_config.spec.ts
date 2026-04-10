import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import { Event } from '#entities/event'
import { User } from '#entities/user'
import { AppDataSource } from '#services/database_service'

test.group('Admin Event Config', (group) => {
  group.setup(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
  })

  group.each.setup(async () => {
    await AppDataSource.query(
      'TRUNCATE TABLE user_sessions, users, donations, purchase_confirmations, companions, guests, gifts, events RESTART IDENTITY CASCADE'
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

  test('GET /api/admin/event returns current config for authenticated admin', async ({
    client,
  }) => {
    await createAdmin()

    await AppDataSource.getRepository(Event).save({
      code: 'babyshower2026event1',
      name: 'Cha da Helena',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      deliveryAddress: 'Rua Entrega, 456 - Sao Paulo/SP',
      mapsLink: 'https://maps.google.com/test',
      coverImageUrl: null,
      pixKeyDad: 'dad@example.com',
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })

    const accessToken = await login(client)

    const response = await client
      .get('/api/admin/event')
      .header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        name: 'Cha da Helena',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      },
    })
  })

  test('GET /api/admin/event returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.get('/api/admin/event')
    response.assertStatus(401)
  })

  test('PUT /api/admin/event updates existing config', async ({ client }) => {
    await createAdmin()

    const event = await AppDataSource.getRepository(Event).save({
      code: 'babyshower2026event1',
      name: 'Cha Antigo',
      date: new Date('2026-06-18T15:00:00.000Z'),
      venueAddress: 'Endereco Antigo',
      deliveryAddress: null,
      mapsLink: null,
      coverImageUrl: null,
      pixKeyDad: null,
      pixKeyMom: null,
      pixQrcodeDad: null,
      pixQrcodeMom: null,
    })

    const accessToken = await login(client)

    const response = await client
      .put('/api/admin/event')
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Cha da Helena',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: event.id,
        name: 'Cha da Helena',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      },
    })
  })

  test('PUT /api/admin/event creates first config when no event exists', async ({
    client,
    assert,
  }) => {
    await createAdmin()
    const accessToken = await login(client)

    const response = await client
      .put('/api/admin/event')
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Cha da Helena',
        date: '2026-06-18T15:00:00.000Z',
        venueAddress: 'Rua Exemplo, 123 - Sao Paulo/SP',
      })

    response.assertStatus(200)

    const saved = await AppDataSource.getRepository(Event).findOne({ where: {} })
    assert.isNotNull(saved)
    assert.equal(saved?.name, 'Cha da Helena')
  })

  test('PUT /api/admin/event returns 422 when required fields are missing for first config', async ({
    client,
  }) => {
    await createAdmin()
    const accessToken = await login(client)

    const response = await client
      .put('/api/admin/event')
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        deliveryAddress: 'Rua Teste',
      })

    response.assertStatus(422)
  })
})
