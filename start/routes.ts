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
const EventController = () => import('#controllers/event_controller')
const RsvpController = () => import('#controllers/rsvp_controller')

router.get('/', async () => 'It works!')
router.get('/api/event/:eventCode', [EventController, 'showPublic'])

router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/login', [AuthController, 'login'])
    router.post('/refresh', [AuthController, 'refresh'])
    router.get('/user', [AuthController, 'show']).use(middleware.auth())
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
    router.post('/logout-all', [AuthController, 'logoutAll']).use(middleware.auth())
  })
  .prefix('/api/auth')

router.post('/api/rsvp/:eventCode', [RsvpController, 'store'])
