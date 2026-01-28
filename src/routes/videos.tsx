import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Sparkles, Play } from 'lucide-react'
import { getCurrentUserFn } from '@/lib/auth.server'
import { getChannelsFn } from '@/lib/channel.server'
import {
  getAllVideosFn,
  getVideosFn,
  createVideoFn,
  updateVideoFn,
  deleteVideoFn,
  type VideoStatus,
  type VideoWithChannel,
} from '@/lib/video.server'
import {
  createPodcastContentFn,
  createPodcastVideoFn,
} from '@/lib/podcast.server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

export const Route = createFileRoute('/videos')({
  component: VideosPage,
  loader: async () => {
    const [userResult, channels, videos] = await Promise.all([
      getCurrentUserFn(),
      getChannelsFn(),
      getAllVideosFn(),
    ])
    return { user: userResult?.user, channels, videos }
  },
})

interface VideoFormValues {
  channelId: string
  title: string
  status: VideoStatus
  prompt: string
  content: string
  audioUrl: string
  subtitleUrl: string
  videoUrl: string
}

const defaultFormValues: VideoFormValues = {
  channelId: '',
  title: '',
  status: 'draft',
  prompt: '',
  content: '',
  audioUrl: '',
  subtitleUrl: '',
  videoUrl: '',
}

const statusOptions: { value: VideoStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'creating-audio', label: '正在创建音频' },
  { value: 'creating-video', label: '正在创建视频' },
  { value: 'ready-to-publish', label: '待发布' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

const statusColorMap: Record<VideoStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'creating-audio': 'bg-purple-100 text-purple-800',
  'creating-video': 'bg-indigo-100 text-indigo-800',
  'ready-to-publish': 'bg-cyan-100 text-cyan-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

function VideosPage() {
  const { user, channels, videos: initialVideos } = Route.useLoaderData()
  const [videos, setVideos] = useState<VideoWithChannel[]>(initialVideos)
  const [filterChannelId, setFilterChannelId] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [generatingContent, setGeneratingContent] = useState(false)
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(
    null,
  )

  // TanStack Form
  const form = useForm({
    defaultValues: defaultFormValues,
    onSubmit: async ({ value }) => {
      if (editingId) {
        const result = await updateVideoFn({
          data: { id: editingId, ...value },
        })
        if (result.success) {
          const channel = channels.find((ch) => ch._id === value.channelId)
          setVideos(
            videos.map((v) =>
              v._id === editingId
                ? {
                    ...v,
                    ...value,
                    channelName: channel?.name,
                    channelNameCn: channel?.nameCn,
                    updatedAt: new Date(),
                  }
                : v,
            ),
          )
          setIsDialogOpen(false)
        } else {
          throw new Error(result.message)
        }
      } else {
        const result = await createVideoFn({ data: value })
        if (result.success) {
          const newVideos = await getVideosFn({
            data: { channelId: filterChannelId || undefined },
          })
          setVideos(newVideos)
          setIsDialogOpen(false)
        } else {
          throw new Error(result.message)
        }
      }
    },
  })

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">MM2 Dashboard</CardTitle>
            <CardDescription>请先登录以访问控制面板</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">前往登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFilterChange = async (channelId: string) => {
    setFilterChannelId(channelId)
    const filteredVideos = await getVideosFn({
      data: { channelId: channelId || undefined },
    })
    setVideos(filteredVideos)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (video: VideoWithChannel) => {
    setEditingId(video._id)
    form.reset()
    form.setFieldValue('channelId', video.channelId)
    form.setFieldValue('title', video.title)
    form.setFieldValue('status', video.status)
    form.setFieldValue('prompt', video.prompt)
    form.setFieldValue('content', video.content || '')
    form.setFieldValue('audioUrl', video.audioUrl || '')
    form.setFieldValue('subtitleUrl', video.subtitleUrl || '')
    form.setFieldValue('videoUrl', video.videoUrl || '')
    setIsDialogOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleGenerateContent = useCallback(async () => {
    const channelId = form.getFieldValue('channelId')
    const prompt = form.getFieldValue('prompt')

    if (!channelId) {
      form.setFieldMeta('channelId', (prev) => ({
        ...prev,
        errorMap: { onChange: '请先选择关联频道' },
      }))
      return
    }

    const selectedChannel = channels.find((ch) => ch._id === channelId)
    if (!selectedChannel) {
      return
    }

    if (!prompt) {
      form.setFieldMeta('prompt', (prev) => ({
        ...prev,
        errorMap: { onChange: '请先输入视频 Prompt' },
      }))
      return
    }

    setGeneratingContent(true)

    try {
      const result = await createPodcastContentFn({
        data: {
          systemPrompt: selectedChannel.prompt || '',
          userPrompt: prompt,
        },
      })

      form.setFieldValue('content', result.content)
    } catch (err) {
      alert(
        err instanceof Error
          ? `生成失败: ${err.message}`
          : '生成内容失败，请重试',
      )
    } finally {
      setGeneratingContent(false)
    }
  }, [form, channels])

  const handleStartGenerate = async (video: VideoWithChannel) => {
    if (!video.content) {
      alert('该视频还没有内容，请先生成内容')
      return
    }

    setGeneratingVideoId(video._id)

    try {
      await createPodcastVideoFn({
        data: {
          _id: video._id,
          title: video.title,
          content: video.content,
        },
      })
      alert('视频生成任务已提交成功！')
    } catch (err) {
      alert(
        err instanceof Error
          ? `生成失败: ${err.message}`
          : '开始生成视频失败，请重试',
      )
    } finally {
      setGeneratingVideoId(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    setDeleteLoading(true)
    try {
      const result = await deleteVideoFn({ data: { id: deletingId } })
      if (result.success) {
        setVideos(videos.filter((v) => v._id !== deletingId))
        setIsDeleteDialogOpen(false)
        setDeletingId(null)
      }
    } catch {
      // 错误处理
    } finally {
      setDeleteLoading(false)
    }
  }

  const getStatusLabel = (status: VideoStatus) => {
    return statusOptions.find((s) => s.value === status)?.label || status
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader title="视频管理" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>视频列表</CardTitle>
                  <CardDescription>管理所有视频内容</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Select
                    value={filterChannelId}
                    onValueChange={handleFilterChange}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="全部频道" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部频道</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel._id} value={channel._id!}>
                          {channel.nameCn} ({channel.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加视频
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>关联频道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-24 text-center"
                      >
                        暂无视频数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    videos.map((video) => (
                      <TableRow key={video._id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {video.title}
                        </TableCell>
                        <TableCell>
                          {video.channelNameCn || video.channelName || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColorMap[video.status]}>
                            {getStatusLabel(video.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(video.createdAt).toLocaleDateString(
                            'zh-CN',
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartGenerate(video)}
                              disabled={
                                generatingVideoId === video._id ||
                                !video.content
                              }
                              title={
                                !video.content ? '请先生成内容' : '开始生成视频'
                              }
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(video)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(video._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑视频' : '添加视频'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改视频信息' : '添加一个新的视频'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="-mx-1 grid flex-1 gap-4 overflow-y-auto px-1 py-4">
              {/* 关联频道 */}
              <form.Field
                name="channelId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? '请选择关联频道' : undefined,
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>关联频道 *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择频道" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel) => (
                          <SelectItem key={channel._id} value={channel._id!}>
                            {channel.nameCn} ({channel.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* 标题 */}
              <form.Field
                name="title"
                validators={{
                  onChange: ({ value }) =>
                    !value ? '标题为必填项' : undefined,
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>标题 *</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="视频标题"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* 状态 */}
              <form.Field name="status">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>状态</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value: VideoStatus) =>
                        field.handleChange(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              {/* Prompt */}
              <form.Field name="prompt">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Prompt</Label>
                    <Textarea
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="输入该视频的处理提示词..."
                      rows={4}
                      className="max-h-[200px] resize-y"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Content */}
              <form.Field name="content">
                {(field) => (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.name}>Content</Label>
                      <form.Subscribe
                        selector={(state) => [
                          state.values.channelId,
                          state.values.prompt,
                        ]}
                      >
                        {([channelId, prompt]) => (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateContent}
                            disabled={
                              generatingContent || !channelId || !prompt
                            }
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {generatingContent ? '生成中...' : '生成内容'}
                          </Button>
                        )}
                      </form.Subscribe>
                    </div>
                    <Textarea
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="视频内容（可手动编辑或点击生成按钮自动生成）..."
                      rows={8}
                      className="max-h-[400px] resize-y"
                    />
                  </div>
                )}
              </form.Field>

              {/* 音频 URL */}
              <form.Field name="audioUrl">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>音频 URL</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="音频文件 URL"
                    />
                  </div>
                )}
              </form.Field>

              {/* 字幕 URL */}
              <form.Field name="subtitleUrl">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>字幕 URL</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="字幕文件 URL"
                    />
                  </div>
                )}
              </form.Field>

              {/* 视频 URL */}
              <form.Field name="videoUrl">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>视频 URL</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="视频文件 URL"
                    />
                  </div>
                )}
              </form.Field>

              {/* 表单级错误 */}
              <form.Subscribe selector={(state) => state.errors}>
                {(errors) =>
                  errors.length > 0 ? (
                    <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                      {errors.join(', ')}
                    </div>
                  ) : null
                }
              </form.Subscribe>
            </div>

            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? '保存中...' : '保存'}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个视频吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
