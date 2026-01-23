import { createServerFn } from '@tanstack/react-start'

// Podcast API 请求和响应类型定义
export interface PodcastContentRequest {
  userPrompt: string
  systemPrompt: string
}

export interface PodcastContentResponse {
  content: string
}

// API 实际返回的格式
interface PodcastApiResponse {
  output: Array<{
    text: string
    speaker: string
  }>
}

// 获取 Podcast API 基础 URL
function getPodcastApiBaseUrl(): string {
  const baseUrl = process.env.PODCAST_API_BASE_URL
  if (!baseUrl) {
    throw new Error('PODCAST_API_BASE_URL 环境变量未设置')
  }
  return baseUrl
}

// 调用外部 Podcast API 创建内容
async function createPodcastContent(
  request: PodcastContentRequest,
): Promise<PodcastContentResponse> {
  const baseUrl = getPodcastApiBaseUrl()
  const url = `${baseUrl}/webhook/podcast/content/create`

  console.log('正在调用 Podcast API:', url)
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
        `Podcast API 请求失败: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const apiData: PodcastApiResponse = await response.json()
    console.log('API 返回数据:', apiData)

    // 将 output 数组转换为 JSON 字符串格式
    const content = JSON.stringify(apiData.output, null, 2)
    console.log('格式化后的内容:', content)

    return { content }
  } catch (error) {
    console.error('调用 Podcast API 失败:', error)
    throw error
  }
}

// 创建 Server Function 供前端调用
export const createPodcastContentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: PodcastContentRequest) => data)
  .handler(async ({ data }) => {
    return await createPodcastContent(data)
  })
