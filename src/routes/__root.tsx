import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

// 防止 FOUC 的关键内联样式
const criticalCss = `
  html:not(.hydrated) { visibility: hidden; }
`

// 样式加载完成后显示页面的脚本（放在 head 中尽早执行）
const antiFlickerScript = `
  (function() {
    function show() { document.documentElement.classList.add('hydrated'); }
    // 检查样式是否已缓存/加载
    if (document.readyState !== 'loading') {
      show();
    } else {
      document.addEventListener('DOMContentLoaded', show);
    }
    // 超时保护
    setTimeout(show, 2000);
  })();
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* 关键内联样式 - 防止 FOUC */}
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        {/* 防闪烁脚本 - 放在 head 中尽早执行 */}
        <script dangerouslySetInnerHTML={{ __html: antiFlickerScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
