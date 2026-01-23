import { createServerFn } from '@tanstack/react-start'
import {
  getCookie,
  setCookie,
  deleteCookie,
} from '@tanstack/react-start/server'
import { loginUser, registerUser, getCurrentUser } from './auth'

// 登录 Server Function
export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await loginUser(data.username, data.password)

    if (result.success && result.token) {
      // 设置 cookie
      setCookie('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 天
        path: '/',
      })
    }

    return result
  })

// 注册 Server Function
export const registerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await registerUser(data.username, data.password)

    if (result.success && result.token) {
      // 设置 cookie
      setCookie('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 天
        path: '/',
      })
    }

    return result
  })

// 获取当前用户 Server Function
export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const token = getCookie('auth-token')

    if (!token) {
      return { success: false, user: null }
    }

    const result = await getCurrentUser(token)
    return { success: result.success, user: result.user || null }
  },
)

// 登出 Server Function
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  deleteCookie('auth-token', { path: '/' })
  return { success: true }
})
