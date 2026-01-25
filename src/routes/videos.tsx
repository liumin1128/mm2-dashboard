import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
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

interface VideoForm {
  channelId: string
  title: string
  status: VideoStatus
  prompt: string
  content: string
}

const emptyForm: VideoForm = {
  channelId: '',
  title: '',
  status: 'draft',
  prompt: '',
  content: '',
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
  const [form, setForm] = useState<VideoForm>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingContent, setGeneratingContent] = useState(false)
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(
    null,
  )

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
    setForm(emptyForm)
    setError('')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (video: VideoWithChannel) => {
    setEditingId(video._id)
    setForm({
      channelId: video.channelId,
      title: video.title,
      status: video.status,
      prompt: video.prompt,
      content: video.content || '',
    })
    setError('')
    setIsDialogOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleGenerateContent = async () => {
    if (!form.channelId) {
      setError('请先选择关联频道')
      return
    }

    const selectedChannel = channels.find((ch) => ch._id === form.channelId)
    if (!selectedChannel) {
      setError('所选频道不存在')
      return
    }

    if (!form.prompt) {
      setError('请先输入视频 Prompt')
      return
    }

    setGeneratingContent(true)
    setError('')

    try {
      const result = await createPodcastContentFn({
        data: {
          systemPrompt: selectedChannel.prompt || '',
          userPrompt: form.prompt,
        },
      })

      setForm({ ...form, content: result.content })
    } catch (err) {
      setError(
        err instanceof Error
          ? `生成失败: ${err.message}`
          : '生成内容失败，请重试',
      )
    } finally {
      setGeneratingContent(false)
    }
  }

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

  const handleSubmit = async () => {
    if (!form.channelId) {
      setError('请选择关联频道')
      return
    }
    if (!form.title) {
      setError('标题为必填项')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        const result = await updateVideoFn({
          data: { id: editingId, ...form },
        })
        if (result.success) {
          const channel = channels.find((ch) => ch._id === form.channelId)
          setVideos(
            videos.map((v) =>
              v._id === editingId
                ? {
                    ...v,
                    ...form,
                    channelName: channel?.name,
                    channelNameCn: channel?.nameCn,
                    updatedAt: new Date(),
                  }
                : v,
            ),
          )
          setIsDialogOpen(false)
        } else {
          setError(result.message)
        }
      } else {
        const result = await createVideoFn({ data: form })
        if (result.success) {
          const newVideos = await getVideosFn({
            data: { channelId: filterChannelId || undefined },
          })
          setVideos(newVideos)
          setIsDialogOpen(false)
        } else {
          setError(result.message)
        }
      }
    } catch {
      setError('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    setLoading(true)
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
      setLoading(false)
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
          <div className="-mx-1 grid gap-4 overflow-y-auto px-1 py-4">
            <div className="grid gap-2">
              <Label htmlFor="channelId">关联频道 *</Label>
              <Select
                value={form.channelId}
                onValueChange={(value) =>
                  setForm({ ...form, channelId: value })
                }
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="视频标题"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={form.status}
                onValueChange={(value: VideoStatus) =>
                  setForm({ ...form, status: value })
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
            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder="输入该视频的处理提示词..."
                rows={4}
                className="max-h-[200px] resize-y"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateContent}
                  disabled={
                    generatingContent || !form.channelId || !form.prompt
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generatingContent ? '生成中...' : '生成内容'}
                </Button>
              </div>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="视频内容（可手动编辑或点击生成按钮自动生成）..."
                rows={8}
                className="max-h-[400px] resize-y"
              />
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
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
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
