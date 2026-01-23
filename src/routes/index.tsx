import { createFileRoute, Link } from '@tanstack/react-router'
import { getCurrentUserFn } from '@/lib/auth.server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
    const result = await getCurrentUserFn()
    return result
  },
})

function App() {
  const loaderData = Route.useLoaderData()
  const user = loaderData?.user

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

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader title="仪表盘" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>欢迎回来</CardDescription>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  用户ID: {user.userId}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>状态</CardDescription>
                <CardTitle className="text-2xl">已登录</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">系统运行正常</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>版本</CardDescription>
                <CardTitle className="text-2xl">v1.0.0</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">最新版本</p>
              </CardContent>
            </Card>
          </div>
          <div className="bg-muted/50 min-h-[50vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
