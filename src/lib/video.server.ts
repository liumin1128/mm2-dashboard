import { createServerFn } from '@tanstack/react-start'
import { ObjectId } from 'mongodb'
import { getDb } from './db'

export type VideoStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'creating-audio'
  | 'creating-video'
  | 'ready-to-publish'
  | 'completed'
  | 'failed'

export interface Video {
  _id?: ObjectId
  channelId: string
  title: string
  status: VideoStatus
  prompt: string
  content?: string
  createdAt: Date
  updatedAt: Date
}

export interface VideoWithChannel extends Omit<Video, '_id' | 'channelId'> {
  _id: string
  channelId: string
  channelName?: string
  channelNameCn?: string
}

// 获取所有视频的内部逻辑
async function fetchVideos(channelId?: string) {
  const db = await getDb()

  const query: Record<string, unknown> = {}
  if (channelId) {
    query.channelId = channelId
  }

  const videos = await db
    .collection('videos')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  // 获取所有关联的频道信息
  const channelIds = [
    ...new Set(videos.map((v) => v.channelId).filter(Boolean)),
  ]
  const channels =
    channelIds.length > 0
      ? await db
          .collection('channels')
          .find({
            _id: { $in: channelIds.map((id) => new ObjectId(id as string)) },
          })
          .toArray()
      : []

  const channelMap = new Map(
    channels.map((ch) => [
      ch._id?.toString(),
      { name: ch.name, nameCn: ch.nameCn },
    ]),
  )

  return videos.map((v) => {
    const channel = channelMap.get(v.channelId as string)
    return {
      _id: v._id?.toString() as string,
      channelId: v.channelId as string,
      channelName: channel?.name as string | undefined,
      channelNameCn: channel?.nameCn as string | undefined,
      title: v.title as string,
      status: v.status as VideoStatus,
      prompt: v.prompt as string,
      content: v.content as string | undefined,
      createdAt: v.createdAt as Date,
      updatedAt: v.updatedAt as Date,
    }
  })
}

// 获取所有视频（不带筛选）
export const getAllVideosFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return fetchVideos()
  },
)

// 获取视频（可按频道筛选）
export const getVideosFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { channelId?: string }) => data)
  .handler(async ({ data }) => {
    return fetchVideos(data.channelId)
  })

// 获取单个视频
export const getVideoFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = await getDb()
    const video = await db
      .collection('videos')
      .findOne({ _id: new ObjectId(data.id) })

    if (!video) {
      return { success: false as const, message: '视频不存在' }
    }

    // 获取频道信息
    const channel = await db
      .collection('channels')
      .findOne({ _id: new ObjectId(video.channelId as string) })

    return {
      success: true as const,
      video: {
        _id: video._id?.toString() as string,
        channelId: video.channelId as string,
        channelName: channel?.name as string | undefined,
        channelNameCn: channel?.nameCn as string | undefined,
        title: video.title as string,
        status: video.status as VideoStatus,
        prompt: video.prompt as string,
        content: video.content as string | undefined,
        createdAt: video.createdAt as Date,
        updatedAt: video.updatedAt as Date,
      },
    }
  })

// 创建视频
export const createVideoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      channelId: string
      title: string
      status: VideoStatus
      prompt: string
      content?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await getDb()

    // 验证频道是否存在
    const channel = await db
      .collection('channels')
      .findOne({ _id: new ObjectId(data.channelId) })

    if (!channel) {
      return { success: false, message: '所选频道不存在' }
    }

    const now = new Date()
    const result = await db.collection('videos').insertOne({
      channelId: data.channelId,
      title: data.title,
      status: data.status,
      prompt: data.prompt,
      content: data.content || '',
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      message: '创建成功',
      id: result.insertedId.toString(),
    }
  })

// 更新视频
export const updateVideoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      channelId: string
      title: string
      status: VideoStatus
      prompt: string
      content?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await getDb()

    // 验证频道是否存在
    const channel = await db
      .collection('channels')
      .findOne({ _id: new ObjectId(data.channelId) })

    if (!channel) {
      return { success: false, message: '所选频道不存在' }
    }

    const result = await db.collection('videos').updateOne(
      { _id: new ObjectId(data.id) },
      {
        $set: {
          channelId: data.channelId,
          title: data.title,
          status: data.status,
          prompt: data.prompt,
          content: data.content || '',
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return { success: false, message: '视频不存在' }
    }

    return { success: true, message: '更新成功' }
  })

// 删除视频
export const deleteVideoFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = await getDb()
    const result = await db
      .collection('videos')
      .deleteOne({ _id: new ObjectId(data.id) })

    if (result.deletedCount === 0) {
      return { success: false, message: '视频不存在' }
    }

    return { success: true, message: '删除成功' }
  })
