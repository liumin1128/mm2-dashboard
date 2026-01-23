import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { loginFn, registerFn } from '@/lib/auth.server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username || !password) {
        setError('请填写用户名和密码')
        setLoading(false)
        return
      }

      if (!isLogin && password !== confirmPassword) {
        setError('两次输入的密码不一致')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('密码长度至少6位')
        setLoading(false)
        return
      }

      const result = isLogin
        ? await loginFn({ data: { username, password } })
        : await registerFn({ data: { username, password } })

      if (result.success) {
        navigate({ to: '/' })
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('操作失败，请稍后重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">MM2 Dashboard</CardTitle>
          <CardDescription className="text-center">
            {isLogin ? '登录您的账户' : '创建新账户'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </Button>

            <Button
              type="button"
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setConfirmPassword('')
              }}
            >
              {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
