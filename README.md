# dsh-market-index

DSH 商店（dsh-store）的静态索引构建仓库：GitHub Actions 定时抓取
GitHub 上所有带 #dsh-plugin 标签的仓库，生成 registry.json（含 gzip 副本），
经 jsDelivr CDN 分发，插件端零 API 限流。

- 数据源：GitHub Search API（topic:dsh-plugin），stars 分段 + 对半二分突破单 query 1000 条上限
- 增量：每 30 分钟（pushed + created 双通道、最近 1 天窗口 + 旧索引合并 + 14 天 stale 剔除；单次 <10 分钟）
- 全量：每天 04:00 UTC 全量对账（刷新 star 数、npm 版本富化等静态数据）
- 分发：https://cdn.jsdelivr.net/gh/hoyyang/dsh-market-index@main/registry.json

构建管线基于 [bradeGithub/DSH-Plugins-Marketplace](https://github.com/bradeGithub/DSH-Plugins-Marketplace)（MIT），
感谢原作者的 stars 分段二分与增量合并设计。

## 手动触发

    gh workflow run registry.yml            # 增量
    gh workflow run registry.yml -f full=true   # 全量
