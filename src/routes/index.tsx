import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { getCurrentUserFn, logoutFn } from '@/lib/auth.server'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
    const result = await getCurrentUserFn()
    return result
  },
})

function App() {
  const navigate = useNavigate()
  const loaderData = Route.useLoaderData()
  const [user, setUser] = useState(loaderData?.user)

  useEffect(() => {
    setUser(loaderData?.user)
  }, [loaderData])

  const handleLogout = async () => {
    await logoutFn()
    setUser(null)
    navigate({ to: '/login' })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">MM2 Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">欢迎, {user.username}</span>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>仪表盘</CardTitle>
            <CardDescription>您已成功登录</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">用户ID: {user.userId}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
