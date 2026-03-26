# AI 每日情报站 - 平台 UI 标准规范

> **重要**：任何 UI 修改前必须阅读本文档，严格按规范执行，避免误操作导致样式错乱。

---

## 一、设计系统基础

### 1.1 设计语言

- 参考：Vercel、OpenAI、Linear
- 版本：AIseek 全新设计系统 v2.0
- 主文件：`public/css/app.css`

### 1.2 色彩系统（默认深色主题）

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--bg-base` | #09090b | 最底层背景 |
| `--bg-elevated` | #0c0c0e | 浮层背景 |
| `--bg-surface` | #111113 | 卡片/区块背景 |
| `--bg-surface-hover` | #18181b | 悬停背景 |
| `--bg-surface-active` | #1f1f23 | 激活背景 |
| `--left-bg` | #09090b | 左侧边栏背景 |
| `--left-text` | #fafafa | 左侧边栏主文字 |
| `--left-muted` | #71717a | 左侧边栏次要文字 |
| `--left-line` | rgba(255,255,255,0.06) | 左侧边栏分割线 |
| `--left-line-hover` | rgba(255,255,255,0.12) | 左侧边栏悬停线 |
| `--right-bg` | #09090b | 右侧主区背景 |
| `--right-text` | #fafafa | 右侧主区主文字 |
| `--right-muted` | #a1a1aa | 右侧主区次要文字 |
| `--right-line` | rgba(255,255,255,0.06) | 右侧分割线 |
| `--right-line-hover` | rgba(255,255,255,0.12) | 右侧悬停线 |
| `--text` | #fafafa | 主文字 |
| `--text-secondary` | #d4d4d8 | 次要文字 |
| `--text-muted` | #71717a | 弱化文字 |
| `--line` | rgba(255,255,255,0.06) | 默认边框/分割线 |
| `--line-hover` | rgba(255,255,255,0.12) | 悬停边框 |
| `--line-strong` | rgba(255,255,255,0.18) | 强调线 |
| `--accent` | #ffffff | 主题色（纯白主调） |
| `--accent-hover` | #e4e4e7 | 主题色悬停 |
| `--accent-fg` | #09090b | 主题色上的文字 |
| `--nav-active-bg` | #e0e0e2 | 导航激活背景 |
| `--accent-subtle` | rgba(255,255,255,0.08) | 主题色淡背景 |
| `--accent-glow` | rgba(255,255,255,0.15) | 主题色光晕 |
| `--success` | #22c55e | 成功 |
| `--warning` | #f59e0b | 警告 |
| `--error` | #ef4444 | 错误 |
| `--hot` | #f43f5e | 热点/强调 |
| `--info` | #3b82f6 | 信息 |

### 1.3 字体系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--font-sans` | 'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC',sans-serif | 正文 |
| `--font-mono` | 'JetBrains Mono','SF Mono','Fira Code',Consolas,monospace | 代码 |
| `--fs-xs` | clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem) | 11-12px |
| `--fs-sm` | clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem) | 12-13px |
| `--fs-base` | clamp(0.875rem, 0.8rem + 0.25vw, 0.9375rem) | **14-15px 平台标准正文** |
| `--fs-md` | clamp(0.9375rem, 0.85rem + 0.3vw, 1rem) | 15-16px |
| `--fs-lg` | clamp(1rem, 0.9rem + 0.4vw, 1.125rem) | 16-18px |
| `--fs-xl` | clamp(1.125rem, 1rem + 0.5vw, 1.3125rem) | 18-21px |
| `--fs-2xl` | clamp(1.375rem, 1.2rem + 0.7vw, 1.625rem) | 22-26px |
| `--fs-3xl` | clamp(1.75rem, 1.5rem + 1vw, 2.25rem) | 28-36px |
| `--fs-4xl` | clamp(2.25rem, 1.8rem + 1.5vw, 3rem) | 36-48px |

### 1.4 间距系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--spacing-0` | 0 | |
| `--spacing-1` | 0.25rem (4px) | 最小间距 |
| `--spacing-2` | 0.5rem (8px) | |
| `--spacing-3` | 0.75rem (12px) | |
| `--spacing-4` | 1rem (16px) | **标准间距** |
| `--spacing-5` | 1.25rem (20px) | |
| `--spacing-6` | 1.5rem (24px) | |
| `--spacing-8` | 2rem (32px) | |
| `--spacing-10` | 2.5rem (40px) | |
| `--spacing-12` | 3rem (48px) | |
| `--spacing-16` | 4rem (64px) | |

### 1.5 圆角系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-none` | 0 | |
| `--radius-sm` | 0.375rem (6px) | |
| `--radius-md` | 0.5rem (8px) | |
| `--radius-lg` | 0.75rem (12px) | **标准圆角** |
| `--radius-xl` | 1rem (16px) | |
| `--radius-2xl` | 1.25rem (20px) | |
| `--radius-full` | 9999px | 全圆 |

### 1.6 阴影系统

| 变量名 | 值 |
|--------|-----|
| `--shadow-xs` | 0 1px 2px rgba(0,0,0,0.3) |
| `--shadow-sm` | 0 2px 4px rgba(0,0,0,0.4) |
| `--shadow-md` | 0 4px 12px rgba(0,0,0,0.5) |
| `--shadow-lg` | 0 8px 24px rgba(0,0,0,0.6) |
| `--shadow-xl` | 0 16px 48px rgba(0,0,0,0.7) |
| `--shadow-glow` | 0 0 24px rgba(255,255,255,0.08) |
| `--shadow-inner` | inset 0 1px 2px rgba(0,0,0,0.4) |

### 1.7 过渡动画

| 变量名 | 值 |
|--------|-----|
| `--transition-fast` | 150ms cubic-bezier(0.4, 0, 0.2, 1) |
| `--transition-base` | 200ms cubic-bezier(0.4, 0, 0.2, 1) |
| `--transition-slow` | 300ms cubic-bezier(0.4, 0, 0.2, 1) |
| `--transition-bounce` | 400ms cubic-bezier(0.34, 1.56, 0.64, 1) |

### 1.8 布局变量

| 变量名 | 值 |
|--------|-----|
| `--sidebar-width` | 220px |
| `--content-max-width` | 1400px |
| `--header-height` | 56px |

---

## 二、全局基础

### 2.1 html/body

- `html` font-size: 16px
- `body` background: var(--bg-base), color: var(--text), min-height: 100vh, line-height: 1.6, font-size: var(--fs-base)

### 2.2 滚动条

- 宽高: 8px
- track: transparent
- thumb: var(--line-hover), border-radius: var(--radius-full)
- thumb:hover: var(--line-strong)

### 2.3 文字选择

- background: var(--accent), color: var(--accent-fg)

---

## 三、应用布局

### 3.1 .app

- display: flex, min-height: 100vh

### 3.2 侧边栏 .sidebar-left

- width: var(--sidebar-width) 220px
- position: fixed, left: 0, top: 0, z-index: 10
- background: var(--left-bg)
- border-right: 1px solid var(--left-line)
- 内部使用 --left-text, --left-muted, --left-line

### 3.3 Logo .logo

- font-size: var(--fs-xl)
- font-weight: 700
- padding: var(--spacing-4) var(--spacing-4) var(--spacing-3)
- gap: var(--spacing-3)

### 3.4 Logo 标题 .logo-title

- font-size: var(--fs-xs)
- font-weight: 600
- padding: var(--spacing-1) var(--spacing-2)
- border-radius: var(--radius-sm)
- background: var(--accent), color: var(--accent-fg)
- box-shadow: var(--shadow-sm)

### 3.5 Logo 图标 .logo-icon

- 28px × 28px
- color: var(--accent)

### 3.6 导航项 .nav-item

- width: calc(100% - var(--spacing-4))
- margin: var(--spacing-1) var(--spacing-2)
- padding: var(--spacing-3) var(--spacing-4)
- font-size: var(--fs-base), font-weight: 500
- border-radius: var(--radius-lg)
- color: var(--text-muted)
- hover: color var(--text), background var(--line)
- active: color var(--accent-fg), background var(--nav-active-bg), font-weight: 600, box-shadow var(--shadow-sm)

### 3.7 主内容区 .main-area

- flex: 1, min-width: 0
- margin-left: var(--sidebar-width)
- padding: 0 var(--spacing-6) var(--spacing-16)
- overflow-y: auto
- background: var(--right-bg)

### 3.8 主内容包装 .main-content-wrapper

- max-width: var(--content-max-width)
- margin: 0 auto
- padding-top: var(--spacing-6)

---

## 四、按钮系统

### 4.1 默认按钮 .btn

- padding: var(--spacing-3) var(--spacing-4)
- font-size: var(--fs-base), font-weight: 500
- border: 1px solid var(--line)
- border-radius: var(--radius-lg)
- background: transparent, color: var(--text)
- hover: border-color var(--text-muted), background var(--bg-surface), transform translateY(-1px), box-shadow var(--shadow-sm)

### 4.2 主按钮 .btn-primary

- border: 1px solid var(--accent)
- background: var(--accent), color: var(--accent-fg)
- box-shadow: var(--shadow-sm)
- hover: background var(--accent-hover), box-shadow var(--shadow-md)

### 4.3 次按钮 .btn-secondary

- background: var(--bg-surface), border: 1px solid var(--line)
- hover: border-color var(--accent), color var(--accent)

---

## 五、输入框

### 5.1 搜索框 .search-input

- width: 320px, max-width: 100%
- padding: var(--spacing-3) var(--spacing-4)
- font-size: var(--fs-base)
- background: var(--bg-surface), border: 1px solid var(--line)
- border-radius: var(--radius-lg)
- box-shadow: var(--shadow-inner)
- focus: border-color var(--accent), box-shadow 0 0 0 3px var(--accent-subtle)

### 5.2 深度调研输入框 .chat-input-box

- min-height: 3.11em（在 2.70em 基础上 +15%）
- padding: var(--spacing-1)
- font-size: var(--fs-base), line-height: 1.5

### 5.3 深度调研输入框容器 .chat-input-wrap

- max-width: 760px
- border: 1px solid var(--line)
- border-radius: var(--radius-2xl)
- background: var(--bg-elevated)
- box-shadow: var(--shadow-lg)
- padding: calc(var(--spacing-2)*0.7) var(--spacing-4) calc(var(--spacing-10)*0.7)
- margin-bottom: var(--spacing-5)

---

## 六、今日汇总模块（pane-daily）

### 6.1 容器 .daily-box

- max-width: 1100px
- margin: 0 auto
- padding: var(--spacing-4)（padding-top: 0）
- border: none, background: transparent
- display: flex, flex-direction: column

### 6.2 标题行 .daily-title-row

- **关键**：刷新/生成按钮必须与「今日热点」标题同一行
- display: flex, flex-wrap: wrap, align-items: center
- gap: var(--spacing-4)
- padding-bottom: var(--spacing-4)
- border-bottom: 1px solid var(--line)
- margin-bottom: var(--spacing-4)

### 6.3 按钮区 .daily-actions

- 位置：在 .daily-title-row 内，与 h3 同一行，靠右（margin-left: auto）
- display: flex, gap: var(--spacing-2)
- padding: var(--spacing-2) 0
- 在 title-row 内时 margin-top: 0

### 6.4 正文 .daily-box .markdown-body

- font-size: var(--fs-base)
- line-height: 1.8
- padding: 0

### 6.5 大标题 h1（今日汇总内）

- font-size: var(--fs-4xl)
- font-weight: 800
- margin: 1.5em 0 1.8em
- text-align: center
- background: linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)
- -webkit-background-clip: text, -webkit-text-fill-color: transparent

### 6.6 中标题 h2（今日汇总内）

- font-size: var(--fs-xl)
- font-weight: 700
- margin: 3em 0 1.2em
- h2::before/after: 48px×1px 渐变线

### 6.7 小标题 h3（今日汇总内）

- font-size: var(--fs-lg)
- font-weight: 600
- margin: 2em 0 0.6em
- color: var(--text)

### 6.8 段落 p（今日汇总内）

- margin: 1.2em 0
- font-size: var(--fs-md)
- line-height: 1.85
- color: var(--text-secondary)
- text-align: justify

### 6.9 今日热点 TOP20（.hot-top20-grid）

**标杆模块，修改需极其谨慎**

- display: flex, flex-direction: column
- gap: var(--spacing-3)
- padding-left: 0
- margin: var(--spacing-6) 0
- list-style: none

#### TOP20 单条 li

- padding: var(--spacing-3) var(--spacing-4)
- border: 1px solid var(--line)
- background: var(--bg-surface)
- border-radius: var(--radius-lg)
- display: flex, flex-direction: column
- gap: var(--spacing-1)
- **无圆点**：li::before { content: none !important; display: none !important; }
- hover: background var(--bg-surface-hover), border-color var(--line-hover), transform translateX(4px)

#### TOP20 标题 .top20-item-title

- font-size: var(--fs-base)（平台标准）
- font-weight: 600
- color: var(--text)
- line-height: 1.8
- margin-bottom: 0.25em

#### TOP20 正文 .top20-item-content

- font-size: var(--fs-base)（平台标准）
- color: var(--text-secondary)
- line-height: 1.8

#### TOP20 数据清洗（JS 必须执行）

- 去掉标题前 "1. " 等数字+句号
- 去掉正文最前面的冒号（：或 :）

### 6.10 列表 ul/ol（今日汇总内）

- list-style: none !important
- padding-left: 0 !important
- margin: 1.2em 0

### 6.11 引用 blockquote（今日汇总内）

- margin: 2em 0
- padding: var(--spacing-4) var(--spacing-5)
- background: var(--bg-surface)
- border-radius: var(--radius-lg)
- color: var(--text-muted), font-style: italic

---

## 七、文章卡片

### 7.1 网格 .articles

- display: grid
- grid-template-columns: repeat(2, 1fr)
- gap: var(--spacing-5)
- 900px 以下: 1fr

### 7.2 卡片 .article-card

- padding: var(--spacing-5)
- border: 1px solid var(--line)
- border-radius: var(--radius-xl)
- background: var(--bg-surface)
- hover: background var(--bg-surface-hover), border-color var(--line-hover), transform translateX(4px), box-shadow var(--shadow-lg) var(--shadow-glow)

### 7.3 标题 .article-title

- font-size: var(--fs-lg)
- font-weight: 600
- line-height: 1.4
- margin-bottom: var(--spacing-2)

### 7.4 元信息 .article-meta

- font-size: var(--fs-sm)
- color: var(--text-muted)
- margin-bottom: var(--spacing-3)
- gap: var(--spacing-3)

### 7.5 摘要 .article-summary

- font-size: var(--fs-md)
- color: var(--text-secondary)
- line-height: 1.85
- margin-bottom: var(--spacing-4)

### 7.6 底部 .article-footer

- padding-top: var(--spacing-3)
- margin-top: auto
- border-top: 1px solid var(--line)
- gap: var(--spacing-2)

---

## 八、工具栏

### 8.1 .toolbar / .pane-first-row

- display: flex
- align-items: center
- justify-content: space-between
- flex-wrap: wrap
- gap: var(--spacing-3)
- margin-bottom: var(--spacing-4)

---

## 九、深度调研（pane-chat）

### 9.1 聊天消息 .chat-msg

- 用户消息与 AI 消息样式区分
- AI 消息内 markdown 使用 .markdown-body

### 9.2 输入区

- 见 5.2、5.3

### 9.3 发送按钮

- padding: var(--spacing-3) var(--spacing-6)
- font-size: var(--fs-base), font-weight: 600
- border-radius: var(--radius-xl)

---

## 十、GitHub 排行榜

### 10.1 .github-pane-wrapper

- padding: var(--spacing-6)
- max-width: var(--content-max-width)
- margin: 0 auto

### 10.2 .github-repo

- padding: var(--spacing-3) var(--spacing-4)
- border: 1px solid var(--line)
- border-radius: var(--radius-lg)
- background: var(--bg-surface)
- hover: 同 article-card

### 10.3 .github-repo-name

- font-size: var(--fs-lg)
- font-weight: 600
- color: var(--text)

### 10.4 .github-repo-desc

- font-size: var(--fs-base)
- line-height: 1.6
- color: var(--text-muted)
- margin-top: var(--spacing-2)

---

## 十一、Toast 与弹窗

### 11.1 .op-result-toast

- position: fixed
- top: var(--spacing-4)
- left: 50%, transform: translateX(-50%)
- z-index: 9999
- padding: var(--spacing-3) var(--spacing-6)
- border-radius: var(--radius-lg)
- font-size: var(--fs-base), font-weight: 500
- success: rgba(34,197,94,0.95)
- error: rgba(239,68,68,0.95)

### 11.2 配置提示 .config-alert

- padding: var(--spacing-3) var(--spacing-4)
- border: 1px solid var(--warning)
- border-radius: var(--radius-lg)
- background: rgba(245,158,11,0.08)
- color: var(--warning)

---

## 十二、加载与空状态

### 12.1 .loading / .empty

- text-align: center
- padding: var(--spacing-12) var(--spacing-4)
- color: var(--text-muted)
- font-size: var(--fs-base)

### 12.2 .loading::after

- 16×16 旋转圆环
- border: 2px solid var(--line)
- border-top-color: var(--accent)

---

## 十三、Tab 面板

### 13.1 .tab-pane

- display: none
- .tab-pane.active: display: block

---

## 十四、右下角主题选择器

### 14.1 .main-area .bg-select-row

- position: fixed
- bottom: var(--spacing-4)
- right: var(--spacing-8)
- z-index: 100
- padding: var(--spacing-2) var(--spacing-3)
- background: var(--bg-elevated)
- border: 1px solid var(--line)
- border-radius: var(--radius-lg)
- backdrop-filter: blur(12px)
- box-shadow: var(--shadow-lg)

---

## 十五、修改检查清单

修改 UI 前请确认：

- [ ] 是否使用了 CSS 变量（--xxx）而非硬编码色值/尺寸？
- [ ] 今日汇总的按钮是否仍在 .daily-title-row 内与 h3 同一行？
- [ ] TOP20 是否保持无圆点、标题/正文用 --fs-base 和 line-height 1.8？
- [ ] 是否修改了 .hot-top20-grid 的结构或破坏了 JS 解析逻辑？
- [ ] 深度调研输入框 min-height 是否为 3.11em？
- [ ] 修改后是否更新了 app.css 的 ?v= 版本号以 bust 缓存？

---

## 十六、文件清单

| 文件 | 用途 |
|------|------|
| public/index.html | 主页面结构、loadDailySummary 等逻辑 |
| public/css/app.css | 主样式表，所有 UI 变量与组件 |
| public/css/fluid-typography.css | 流体排版 |
| public/css/fluidtype.css | Fluidtype 模式 |
| public/css/prose.css | Prose 模式 |
| public/css/typetura.css | Typetura 模式 |
| public/css/bendable.css | Bendable 模式 |
| public/_skelekit/css/fonts.css | 字体加载 |

---

*文档版本：2026-03-19*
