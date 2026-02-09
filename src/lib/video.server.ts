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
  | 'uploading'
  | 'completed'
  | 'failed'

export interface Video {
  _id?: ObjectId
  channelId: string
  title: string
  status: VideoStatus
  prompt: string
  content?: string
  description?: string
  tags?: string[]
  audioUrl?: string
  subtitleUrl?: string
  videoUrl?: string
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
      description: v.description as string | undefined,
      tags: v.tags as string[] | undefined,
      audioUrl: v.audioUrl as string | undefined,
      subtitleUrl: v.subtitleUrl as string | undefined,
      videoUrl: v.videoUrl as string | undefined,
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
        description: video.description as string | undefined,
        tags: video.tags as string[] | undefined,
        audioUrl: video.audioUrl as string | undefined,
        subtitleUrl: video.subtitleUrl as string | undefined,
        videoUrl: video.videoUrl as string | undefined,
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
      description?: string
      tags?: string[]
      audioUrl?: string
      subtitleUrl?: string
      videoUrl?: string
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
      description: data.description || '',
      tags: data.tags || [],
      audioUrl: data.audioUrl || '',
      subtitleUrl: data.subtitleUrl || '',
      videoUrl: data.videoUrl || '',
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
      description?: string
      tags?: string[]
      audioUrl?: string
      subtitleUrl?: string
      videoUrl?: string
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
          description: data.description || '',
          tags: data.tags || [],
          audioUrl: data.audioUrl || '',
          subtitleUrl: data.subtitleUrl || '',
          videoUrl: data.videoUrl || '',
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

// Video 元数据请求和响应类型定义
export interface VideoMetadataRequest {
  content: string
}

export interface VideoMetadataResponse {
  description: string
  tags: string[]
}

// 调用外部 API 创建视频元数据
async function createVideoMetadata(
  request: VideoMetadataRequest,
): Promise<VideoMetadataResponse> {
  const baseUrl = process.env.PODCAST_API_BASE_URL
  if (!baseUrl) {
    throw new Error('PODCAST_API_BASE_URL 环境变量未设置')
  }

  const url = `${baseUrl}/webhook/podcast/meta/create`

  console.log('正在调用视频元数据 API:', url)
  console.log('请求参数:', JSON.stringify(request, null, 2))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log('API 响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API 错误响应:', errorText)
      throw new Error(
        `视频元数据 API 请求失败: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const apiData: VideoMetadataResponse = await response.json()
    console.log('API 返回数据:', apiData)

    return apiData
  } catch (error) {
    console.error('调用视频元数据 API 失败:', error)
    throw error
  }
}

// 创建 Server Function 供前端调用
export const createVideoMetadataFn = createServerFn({ method: 'POST' })
  .inputValidator((data: VideoMetadataRequest) => data)
  .handler(async ({ data }) => {
    return await createVideoMetadata(data)
  })

// 上传视频到外部 API
async function uploadVideo(
  video: Video,
): Promise<{ code: number; message: string }> {
  const baseUrl = process.env.PODCAST_API_BASE_URL
  if (!baseUrl) {
    throw new Error('PODCAST_API_BASE_URL 环境变量未设置')
  }

  const apiUrl = `${baseUrl}/webhook/podcast/video/upload`

  // 构建请求体，包含所有 video 字段
  const requestBody = {
    _id: video._id?.toString(),
    channelId: video.channelId,
    title: video.title,
    status: video.status,
    prompt: video.prompt,
    content: video.content,
    description: video.description,
    tags: video.tags,
    audioUrl: video.audioUrl,
    subtitleUrl: video.subtitleUrl,
    videoUrl: video.videoUrl,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  }

  console.log('正在上传视频到:', apiUrl)
  console.log('上传参数:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('上传 API 响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('上传 API 错误响应:', errorText)
      throw new Error(
        `视频上传 API 请求失败: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const apiData: { code: number; message: string } = await response.json()
    console.log('上传 API 返回数据:', apiData)

    return apiData
  } catch (error) {
    console.error('调用视频上传 API 失败:', error)
    throw error
  }
}

// 上传视频 Server Function 供前端调用
export const uploadVideoFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      _id?: string
      channelId: string
      title: string
      status: VideoStatus
      prompt: string
      content?: string
      description?: string
      tags?: string[]
      audioUrl?: string
      subtitleUrl?: string
      videoUrl?: string
      createdAt: Date
      updatedAt: Date
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const video: Video = {
        _id: data._id ? new ObjectId(data._id) : undefined,
        channelId: data.channelId,
        title: data.title,
        status: data.status,
        prompt: data.prompt,
        content: data.content,
        description: data.description,
        tags: data.tags,
        audioUrl: data.audioUrl,
        subtitleUrl: data.subtitleUrl,
        videoUrl: data.videoUrl,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }

      const result = await uploadVideo(video)
      return {
        success: true,
        code: result.code,
        message: result.message,
      }
    } catch (error) {
      console.error('上传视频失败:', error)
      return {
        success: false,
        code: 500,
        message: error instanceof Error ? error.message : '上传视频失败',
      }
    }
  })
