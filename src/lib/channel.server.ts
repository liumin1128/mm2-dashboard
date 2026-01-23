import { createServerFn } from '@tanstack/react-start'
import { ObjectId } from 'mongodb'
import { getDb } from './db'

export interface Channel {
  _id?: ObjectId
  name: string
  nameCn: string
  youtubeUrl: string
  prompt: string
  createdAt: Date
  updatedAt: Date
}

// 获取所有频道
export const getChannelsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = await getDb()
    const channels = await db
      .collection('channels')
      .find()
      .sort({ createdAt: -1 })
      .toArray()

    return channels.map((ch) => ({
      _id: ch._id?.toString(),
      name: ch.name as string,
      nameCn: ch.nameCn as string,
      youtubeUrl: ch.youtubeUrl as string,
      prompt: ch.prompt as string,
      createdAt: ch.createdAt as Date,
      updatedAt: ch.updatedAt as Date,
    }))
  },
)

// 获取单个频道
export const getChannelFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = await getDb()
    const channel = await db
      .collection('channels')
      .findOne({ _id: new ObjectId(data.id) })

    if (!channel) {
      return { success: false as const, message: '频道不存在' }
    }

    return {
      success: true as const,
      channel: {
        _id: channel._id?.toString(),
        name: channel.name as string,
        nameCn: channel.nameCn as string,
        youtubeUrl: channel.youtubeUrl as string,
        prompt: channel.prompt as string,
        createdAt: channel.createdAt as Date,
        updatedAt: channel.updatedAt as Date,
      },
    }
  })

// 创建频道
export const createChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      nameCn: string
      youtubeUrl: string
      prompt: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await getDb()
    const collection = db.collection('channels')

    // 检查频道名是否已存在
    const existing = await collection.findOne({ name: data.name })
    if (existing) {
      return { success: false, message: '频道名已存在' }
    }

    const now = new Date()
    const result = await collection.insertOne({
      name: data.name,
      nameCn: data.nameCn,
      youtubeUrl: data.youtubeUrl,
      prompt: data.prompt,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      message: '创建成功',
      id: result.insertedId.toString(),
    }
  })

// 更新频道
export const updateChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      name: string
      nameCn: string
      youtubeUrl: string
      prompt: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await getDb()
    const collection = db.collection('channels')

    // 检查频道名是否已被其他频道使用
    const existing = await collection.findOne({
      name: data.name,
      _id: { $ne: new ObjectId(data.id) },
    })
    if (existing) {
      return { success: false, message: '频道名已被使用' }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(data.id) },
      {
        $set: {
          name: data.name,
          nameCn: data.nameCn,
          youtubeUrl: data.youtubeUrl,
          prompt: data.prompt,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return { success: false, message: '频道不存在' }
    }

    return { success: true, message: '更新成功' }
  })

// 删除频道
export const deleteChannelFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = await getDb()
    const result = await db
      .collection('channels')
      .deleteOne({ _id: new ObjectId(data.id) })

    if (result.deletedCount === 0) {
      return { success: false, message: '频道不存在' }
    }

    return { success: true, message: '删除成功' }
  })
