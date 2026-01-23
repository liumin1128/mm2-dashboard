import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { getCurrentUserFn } from '@/lib/auth.server'
import {
  getChannelsFn,
  createChannelFn,
  updateChannelFn,
  deleteChannelFn,
} from '@/lib/channel.server'
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
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

export const Route = createFileRoute('/channels')({
  component: ChannelsPage,
  loader: async () => {
    const [userResult, channels] = await Promise.all([
      getCurrentUserFn(),
      getChannelsFn(),
    ])
    return { user: userResult?.user, channels }
  },
})

interface ChannelForm {
  name: string
  nameCn: string
  youtubeUrl: string
  prompt: string
}

const emptyForm: ChannelForm = {
  name: '',
  nameCn: '',
  youtubeUrl: '',
  prompt: '',
}

function ChannelsPage() {
  const { user, channels: initialChannels } = Route.useLoaderData()
  const [channels, setChannels] = useState(initialChannels)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<ChannelForm>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (channel: (typeof channels)[0]) => {
    setEditingId(channel._id!)
    setForm({
      name: channel.name,
      nameCn: channel.nameCn,
      youtubeUrl: channel.youtubeUrl,
      prompt: channel.prompt,
    })
    setError('')
    setIsDialogOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.nameCn) {
      setError('频道名和中文名为必填项')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        const result = await updateChannelFn({
          data: { id: editingId, ...form },
        })
        if (result.success) {
          setChannels(
            channels.map((ch) =>
              ch._id === editingId
                ? { ...ch, ...form, updatedAt: new Date() }
                : ch,
            ),
          )
          setIsDialogOpen(false)
        } else {
          setError(result.message)
        }
      } else {
        const result = await createChannelFn({ data: form })
        if (result.success) {
          const newChannels = await getChannelsFn()
          setChannels(newChannels)
          setIsDialogOpen(false)
        } else {
          setError(result.message)
        }
      }
    } catch {
      setError('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    setLoading(true)
    try {
      const result = await deleteChannelFn({ data: { id: deletingId } })
      if (result.success) {
        setChannels(channels.filter((ch) => ch._id !== deletingId))
        setIsDeleteDialogOpen(false)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setDeletingId(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader title="频道管理" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">频道列表</h2>
              <p className="text-muted-foreground">管理您的 YouTube 频道</p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              添加频道
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>频道名</TableHead>
                    <TableHead>中文名</TableHead>
                    <TableHead>YouTube 链接</TableHead>
                    <TableHead className="max-w-[200px]">Prompt</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-24 text-center"
                      >
                        暂无频道数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    channels.map((channel) => (
                      <TableRow key={channel._id}>
                        <TableCell className="font-medium">
                          {channel.name}
                        </TableCell>
                        <TableCell>{channel.nameCn}</TableCell>
                        <TableCell>
                          {channel.youtubeUrl ? (
                            <a
                              href={channel.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              查看
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {channel.prompt || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenEdit(channel)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenDelete(channel._id!)}
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
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑频道' : '添加频道'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改频道信息' : '添加一个新的 YouTube 频道'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">频道名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: TechChannel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nameCn">中文名 *</Label>
              <Input
                id="nameCn"
                value={form.nameCn}
                onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
                placeholder="例如: 科技频道"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="youtubeUrl">YouTube 链接</Label>
              <Input
                id="youtubeUrl"
                value={form.youtubeUrl}
                onChange={(e) =>
                  setForm({ ...form, youtubeUrl: e.target.value })
                }
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder="输入该频道的处理提示词..."
                rows={4}
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
              {loading ? '处理中...' : editingId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个频道吗？此操作无法撤销。
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
              {loading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
