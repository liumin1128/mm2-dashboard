import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

// 防止 FOUC 的关键内联样式
const criticalCss = `
  html { visibility: hidden; }
  html.hydrated { visibility: visible; }
`

// 样式加载完成后显示页面的脚本
const antiFlickerScript = `
  (function() {
    var link = document.querySelector('link[href*="styles"]');
    if (link) {
      if (link.sheet) {
        document.documentElement.classList.add('hydrated');
      } else {
        link.onload = function() {
          document.documentElement.classList.add('hydrated');
        };
      }
    } else {
      document.documentElement.classList.add('hydrated');
    }
    // 超时保护：最多等待 3 秒
    setTimeout(function() {
      document.documentElement.classList.add('hydrated');
    }, 3000);
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
      // 预加载样式，提高加载优先级
      {
        rel: 'preload',
        href: appCss,
        as: 'style',
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
        {/* 防闪烁脚本 - 放在 body 末尾 */}
        <script dangerouslySetInnerHTML={{ __html: antiFlickerScript }} />
      </body>
    </html>
  )
}
