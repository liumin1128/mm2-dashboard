import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'mm2-dashboard-secret-key-2024'
const SALT_ROUNDS = 10

export interface User {
  _id?: string
  username: string
  password: string
  createdAt: Date
}

export interface JwtPayload {
  userId: string
  username: string
}

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 密码验证
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 生成 JWT Token
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// 验证 JWT Token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// 注册用户
export async function registerUser(
  username: string,
  password: string,
): Promise<{ success: boolean; message: string; token?: string }> {
  const db = await getDb()
  const usersCollection = db.collection<User>('users')

  // 检查用户是否已存在
  const existingUser = await usersCollection.findOne({ username })
  if (existingUser) {
    return { success: false, message: '用户名已存在' }
  }

  // 加密密码
  const hashedPassword = await hashPassword(password)

  // 创建用户
  const result = await usersCollection.insertOne({
    username,
    password: hashedPassword,
    createdAt: new Date(),
  })

  // 生成 token
  const token = generateToken({
    userId: result.insertedId.toString(),
    username,
  })

  return { success: true, message: '注册成功', token }
}

// 登录用户
export async function loginUser(
  username: string,
  password: string,
): Promise<{ success: boolean; message: string; token?: string }> {
  const db = await getDb()
  const usersCollection = db.collection<User>('users')

  // 查找用户
  const user = await usersCollection.findOne({ username })
  if (!user) {
    return { success: false, message: '用户名或密码错误' }
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return { success: false, message: '用户名或密码错误' }
  }

  // 生成 token
  const token = generateToken({
    userId: user._id!.toString(),
    username: user.username,
  })

  return { success: true, message: '登录成功', token }
}

// 获取当前用户信息
export async function getCurrentUser(
  token: string,
): Promise<{ success: boolean; user?: { userId: string; username: string } }> {
  const payload = verifyToken(token)
  if (!payload) {
    return { success: false }
  }

  return {
    success: true,
    user: {
      userId: payload.userId,
      username: payload.username,
    },
  }
}
