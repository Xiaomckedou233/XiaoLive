import mitt from 'mitt'

type logoutEvents = {
  logoutUser: String
}

type appLogoutEvents = {
  logoutUser: String
}

type loginEvents = {
  loginUser: String
}

type userBannedEvents = {
  bannedUser: String
}

const logoutBus = mitt<logoutEvents>()
const loginBus = mitt<loginEvents>()
const userBannedBus = mitt<userBannedEvents>()
const appLogoutBus = mitt<appLogoutEvents>()

export default logoutBus
export { loginBus, userBannedBus, appLogoutBus }
