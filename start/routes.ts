/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const DonationController = () => import('#controllers/donation_controller')
const EventController = () => import('#controllers/event_controller')
const GiftController = () => import('#controllers/gift_controller')
const PurchaseConfirmationController = () => import('#controllers/purchase_confirmation_controller')
const RsvpController = () => import('#controllers/rsvp_controller')

router.get('/', async () => 'It works!')
router.get('/api/event/:eventCode', [EventController, 'showPublic'])
router.get('/api/gifts/:eventCode', [GiftController, 'indexPublic'])
router.post('/api/gifts/:giftId/confirm-purchase', [PurchaseConfirmationController, 'store'])
router.post('/api/donations', [DonationController, 'store'])

router
  .group(() => {
    router.post('/register', [AuthController, 'register']).as('auth.register')
    router.post('/login', [AuthController, 'login']).as('auth.login')
    router.post('/refresh', [AuthController, 'refresh']).as('auth.refresh')
    router.get('/user', [AuthController, 'show']).use(middleware.auth()).as('auth.user')
    router.get('/me', [AuthController, 'show']).use(middleware.auth()).as('auth.me')
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth()).as('auth.logout')
    router
      .post('/logout-all', [AuthController, 'logoutAll'])
      .use(middleware.auth())
      .as('auth.logoutAll')
  })
  .prefix('/api/auth')

router
  .group(() => {
    router.post('/login', [AuthController, 'login']).as('adminAuth.login')
    router.post('/refresh', [AuthController, 'refresh']).as('adminAuth.refresh')
    router.get('/me', [AuthController, 'show']).use(middleware.auth()).as('adminAuth.me')
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth()).as('adminAuth.logout')
    router
      .post('/logout-all', [AuthController, 'logoutAll'])
      .use(middleware.auth())
      .as('adminAuth.logoutAll')
  })
  .prefix('/api/admin')

router.post('/api/rsvp/:eventCode', [RsvpController, 'store'])
