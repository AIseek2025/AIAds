# gstack（本地技能库副本）

本目录用于存放 [gstack](https://github.com/garrytan/gstack) 的本地副本，供团队对照其 **SKILL 流程、文档结构与工程纪律**，与 AIAds 业务开发解耦。

## 获取方式

在仓库根目录执行：

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git skill/gstack
```

如需固定到某次提交（可审计）：

```bash
cd skill/gstack && git fetch --depth 1 origin <commit-sha> && git checkout <commit-sha>
```

## 本次会话已拉取的版本（供报告引用）

- 路径：`skill/gstack/`
- 提交：`4f435e45c517822014a852804c3da57bab121516`（`4f435e4`，标签/版本以该仓库 `VERSION` 或 release 说明为准）

> 说明：`skill/gstack/` 在 `.gitignore` 中忽略，避免将上游完整历史推入 AIAds 主仓库；审计时以本地 `git -C skill/gstack rev-parse HEAD` 为准。
