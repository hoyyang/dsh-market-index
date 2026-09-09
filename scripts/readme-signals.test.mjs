import test from 'node:test'
import assert from 'node:assert/strict'
import { practicalEvidence, readmeSignals, README_PRACTICAL_PARSER_REVISION, README_PRACTICAL_VERSION } from './readme-signals.mjs'

const strongReadme = `
# Demo

## Features
- Parse PDFs with \`parsePdf()\`
- Export reports as JSON
- Compare two runs
- Validate schemas

## Usage
1. Open the panel.
2. Select a file.
3. Click **Run**.

Input: quarterly.pdf
Output: report.json

\`\`\`js
await runDemo('quarterly.pdf')
\`\`\`

## Use cases
- Audit a release before deployment.
- Compare regression results across two versions.

## Results
- Generates a machine-readable report.

![report preview](assets/report.png)

## Limitations
- Linux and macOS are supported; Windows requires WSL.
`

const ZERO_EVIDENCE = {
  parser_revision: README_PRACTICAL_PARSER_REVISION,
  capability_items: 0,
  usage_items: 0,
  usage_actions: 0,
  io_pairs: 0,
  code_examples: 0,
  usecase_items: 0,
  output_items: 0,
  media: 0,
  reliability_items: 0,
}
const ZERO_CONFIDENCE = { overall: 0, coverage: 0, fallback_share: 0 }

test('returns null only when README evidence is unavailable', () => {
  assert.equal(practicalEvidence(null), null)
  assert.equal(practicalEvidence('   '), null)
  assert.deepEqual(practicalEvidence('# Name\n\nDescription only.'), {
    version: README_PRACTICAL_VERSION,
    ...ZERO_EVIDENCE,
    confidence: ZERO_CONFIDENCE,
  })
})

test('extracts independent practical evidence families', () => {
  const evidence = practicalEvidence(strongReadme)
  assert.equal(evidence.version, README_PRACTICAL_VERSION)
  assert.equal(evidence.parser_revision, README_PRACTICAL_PARSER_REVISION)
  assert.ok(evidence.capability_items >= 4)
  assert.ok(evidence.usage_actions >= 3)
  assert.equal(evidence.io_pairs, 1)
  assert.equal(evidence.code_examples, 1)
  assert.equal(evidence.usecase_items, 2)
  assert.equal(evidence.output_items, 1)
  assert.equal(evidence.media, 1)
  assert.equal(evidence.reliability_items, 1)
  assert.equal(evidence.confidence.coverage, 1)
  assert.equal(evidence.confidence.fallback_share, 0)
  assert.equal(evidence.confidence.overall, 1)
})

test('recognizes equivalent Chinese evidence without requiring code fences', () => {
  const evidence = practicalEvidence(`
# 示例插件
## 功能
- 自动整理会话记录
- 导出结构化报告
- 对比两次运行结果
## 使用
1. 打开侧边栏。
2. 选择需要整理的会话。
3. 点击生成报告。
## 使用场景
- 发布前审查最近一次运行的异常。
## 效果
![结果截图](assets/result.png)
## 已知边界
- 当前支持 macOS 和 Linux，Windows 需要 WSL。
`)
  assert.ok(evidence.capability_items >= 3)
  assert.ok(evidence.usage_actions >= 3)
  assert.equal(evidence.usecase_items, 1)
  assert.equal(evidence.media, 1)
  assert.equal(evidence.reliability_items, 1)
  assert.equal(evidence.code_examples, 0)
  assert.equal(evidence.confidence.coverage, 0.667)
  assert.equal(evidence.confidence.fallback_share, 0)
  assert.equal(evidence.confidence.overall, 0.833)
})

test('specific use-case headings win over the generic Chinese usage token', () => {
  const evidence = practicalEvidence('# Demo\n## 使用场景\n- 发布前审查最近一次运行的异常。\n')
  assert.equal(evidence.usecase_items, 1)
  assert.equal(evidence.usage_items, 0)
})

test('explicit request, journey, numbered story, and field-case headings are use cases', () => {
  for (const heading of ['Example requests', 'User requests', 'Choose your journey', 'Story 2: West World', '实战展示：需求到交付']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- Audit a release before deployment.\n`)
    assert.equal(evidence.usecase_items, 1, heading)
  }
  for (const heading of ['Examples', 'Choose your provider', 'Storybook integration']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- Audit a release before deployment.\n`)
    assert.equal(evidence.usecase_items, 0, heading)
  }
})

test('project names containing install or settings do not exclude the whole README', () => {
  for (const title of ['# dsh-plugin-auto-install', '# DSH Custom Provider Settings Plugin', '# Settings Drawer (`dsh-settings-drawer`)']) {
    const evidence = practicalEvidence(`${title}\n## Features\n- Export reports as JSON.\n## Usage\n1. Open the panel.\n`)
    assert.equal(evidence.capability_items, 1)
    assert.equal(evidence.usage_actions, 1)
  }
})

test('nested subsections inherit the nearest evidence dimension', () => {
  const evidence = practicalEvidence(`
# Demo
## What it does
### Timeline navigation
- Click a node to jump to that message.
### Project folders
- Drag a workspace into a persistent folder.
`)
  assert.equal(evidence.capability_items, 2)
})

test('inline prose starting with backticks is not a fence opener', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
\`\`\`mermaid blocks render in place automatically.
- Export diagrams as SVG.
## Usage
1. Open a conversation.
`)
  assert.ok(evidence.capability_items >= 1)
  assert.equal(evidence.usage_actions, 1)
})

test('an orphan bare fence cannot hide later evidence sections', () => {
  const evidence = practicalEvidence(`
# Demo
## Notes
\`\`\`
## Features
- Export reports as JSON.
## Usage
1. Open the panel.
`)
  assert.equal(evidence.capability_items, 1)
  assert.equal(evidence.usage_actions, 1)
})

test('a closed bare fence containing heading-like code stays fully hidden', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
\`\`\`
# headless checks against the vscode API
- fake action in code
\`\`\`
1. Run the actual command.
## Reliability
- Works on macOS and Linux.
`)
  assert.equal(evidence.usage_items, 1)
  assert.equal(evidence.usage_actions, 1)
  assert.equal(evidence.reliability_items, 1)
})

test('media written inside fenced examples is not output evidence', () => {
  const evidence = practicalEvidence(`
# Demo
## Preview
\`\`\`html
<img src="assets/example.png" alt="example markup">
\`\`\`
`)
  assert.equal(evidence.media, 0)
})

test('an unclosed language fence hides everything after its opener', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Visible capability.
\`\`\`js
## Features
- Fake capability inside truncated code.
`)
  assert.equal(evidence.capability_items, 1)
})

test('indented code blocks cannot manufacture list evidence', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
    - Fake capability inside code.
- Visible capability.
`)
  assert.equal(evidence.capability_items, 1)
})

test('nested list markers survive only beneath a real parent list item', () => {
  const nested = practicalEvidence(`
# Demo
## Features
- Parent capability

    - Nested capability A
    - Nested capability B
`)
  const orphan = practicalEvidence(`
# Demo
## Features

    - Looks like a bullet inside indented code.
`)
  const realCode = practicalEvidence(`
# Demo
## Features
- Parent capability

    const fake = '- Not a capability'
    run(fake)
`)
  assert.equal(nested.capability_items, 3)
  assert.equal(orphan.capability_items, 0)
  assert.equal(realCode.capability_items, 1)
})

test('meta sections stay excluded even when decorated or phrased as contributor communities', () => {
  for (const heading of ['License', 'Roadmap', 'Release notes', 'For Contributors', 'Community and Contributing', '☕ 赞赏支持 / Sponsor']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- Export signed reports as JSON.\n`)
    assert.equal(evidence.capability_items, 0, heading)
  }
})

test('HTML screenshots count regardless of src and alt attribute order', () => {
  const evidence = practicalEvidence('<h1>Demo</h1>\n## Preview\n<img src="assets/report.png" alt="report preview">')
  assert.equal(evidence.media, 1)
})

test('comment-looking lines inside fences are never parsed as headings', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export reports as JSON.
\`\`\`sh
# Configuration
npm install demo
\`\`\`
## Usage
1. Open the panel.
`)
  assert.equal(evidence.capability_items, 1)
  assert.equal(evidence.usage_actions, 1)
})

test('duplicating a whole document does not create a new evidence dimension', () => {
  const body = '# Demo\n## Architecture\n- Host owns routes.\n- Client owns UI.\n'
  assert.deepEqual(practicalEvidence(body + '\n' + body), practicalEvidence(body))
})

test('practical evidence uses the same 200k input boundary as the production index', () => {
  const prefix = '# Demo\n## Features\n- Visible capability.\n## Notes\n' + 'x'.repeat(200_000)
  const evidence = practicalEvidence(prefix + '\n## Reliability\n- This must be outside the production boundary.\n')
  assert.equal(evidence.capability_items, 1)
  assert.equal(evidence.reliability_items, 0)
})

test('numbered and emoji-decorated headings share install config dev and meta exclusions', () => {
  const evidence = practicalEvidence(`# Demo
## 1. Install plugin
\`\`\`sh
npm install x
\`\`\`
## 2. Configure API Key
1. Open Settings
2. Fill API Key
![settings](settings-preview.png)
## ⚙️ Configuration
- API Key: secret
![settings two](settings-two.png)
## 🛠️ Local Development
\`\`\`sh
npm test
npm run build
\`\`\`
## 📄 License
If useful, star this powerful plugin.
## ✨ Features
- Exports signed receipts.
`)
  assert.deepEqual(evidence, {
    version: 3,
    parser_revision: 3,
    capability_items: 1,
    usage_items: 0,
    usage_actions: 0,
    io_pairs: 0,
    code_examples: 0,
    usecase_items: 0,
    output_items: 0,
    media: 0,
    reliability_items: 0,
    confidence: { overall: 0.556, coverage: 0.111, fallback_share: 0 },
  })
})

test('installation and configuration subtrees contribute no practical evidence', () => {
  const text = `
# Demo
## Installation
1. Install Node.js.
2. Run npm install.
### Features
- Configure API_KEY.
\`\`\`sh
npm install demo
\`\`\`
## Configuration
- Set OPENAI_API_KEY.
`
  const evidence = practicalEvidence(text)
  assert.deepEqual(evidence, {
    version: README_PRACTICAL_VERSION,
    ...ZERO_EVIDENCE,
    confidence: ZERO_CONFIDENCE,
  })
})

test('duplicates collapse and a repeated fake feature creates one unit only', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Fast execution with \`run()\` API
- Fast execution with \`run()\` API
- Fast execution with \`run()\` API
- Fast execution with \`run()\` API
`)
  assert.equal(evidence.capability_items, 1)
})

test('badge media is ignored but screenshots are counted', () => {
  const evidence = practicalEvidence(`
# Demo
![build badge](https://img.shields.io/build.svg)
![stars](https://img.shields.io/github/stars/x/y)
## Results
![real screenshot](assets/screenshot.png)
`)
  assert.equal(evidence.media, 1)
})

test('readmeSignals preserves ease fields and adds versioned practical evidence', () => {
  const signal = readmeSignals(strongReadme + '\n## Installation\n```sh\nnpm install demo\n```\n')
  assert.ok(signal.readme_len > 0)
  assert.equal(signal.readme_install_section, true)
  assert.ok(signal.readme_code_blocks >= 4)
  assert.deepEqual(signal.readme_cmds, ['npm install demo'])
  assert.equal(signal.readme_practical.version, README_PRACTICAL_VERSION)
  assert.equal(signal.readme_practical.parser_revision, README_PRACTICAL_PARSER_REVISION)
})

// ---------------- v3 回归：已确认漏检 ----------------

test('dsh-context: Use it and What you\'ll see headings are recognized', () => {
  const evidence = practicalEvidence(`
# dsh-context
## Use it
- Use the panel to point at a project folder.
## What you'll see
- A summary of the conversation state.
`)
  assert.equal(evidence.usage_items, 1)
  assert.equal(evidence.usage_actions, 1)
  assert.equal(evidence.output_items, 1)
})

test('subscriptions: Use and Providers headings are recognized without matching user-like words', () => {
  const evidence = practicalEvidence(`
# subscriptions
## Use
- Subscribe to a topic.
## Providers
- RSS feeds
- Atom feeds
## User profiles
- Stores the current account label.
`)
  assert.equal(evidence.usage_items, 1)
  assert.equal(evidence.capability_items, 2)
})

test('taskboard: troubleshooting escapes the install/config parents, workflow-named GIF counts', () => {
  const evidence = practicalEvidence(`
# Taskboard
## Install
npm install @x/taskboard
### Troubleshooting
If installation fails, clear the npm cache and retry.
## Configuration
- Set TASKBOARD_TOKEN.
### Troubleshooting
If the token is rejected, re-run the auth flow.
## Results
![workflow preview](assets/workflow.gif)
`)
  assert.equal(evidence.reliability_items, 2)
  assert.equal(evidence.media, 1)
  assert.equal(evidence.confidence.fallback_share, 0)
})

test('gateway: capability headings with short descriptions and security prose count', () => {
  const evidence = practicalEvidence(`
# gateway
## Providers
- OpenAI
- Anthropic
## Model pools
- fast pool: gpt-4o-mini
## Path picker
- Select a workspace path
## Path handling
- Resolves relative to project root.
## Security
Tokens are encrypted at rest.
`)
  assert.equal(evidence.capability_items, 5)
  assert.equal(evidence.reliability_items, 1)
})

test('safety and common tasks headings are recognized', () => {
  const evidence = practicalEvidence(`
# Demo
## Safety
Never log tokens to the console.
## Common tasks
1. Rotate a key.
2. Refresh the cache.
`)
  assert.equal(evidence.reliability_items, 1)
  assert.equal(evidence.usage_items, 2)
})

test('constrained prose, Q&A and admonitions count in usecase/output/reliability', () => {
  const evidence = practicalEvidence(`
# Demo
## Use cases
Use this to audit a release before shipping it.
## Results
The report includes a summary table and raw data.
## Reliability
> [!NOTE] Keep the token private.
If the plugin fails to start, check the log file first.
## FAQ
**Q: Does it support offline mode?**
**A:** Yes, everything runs locally.
`)
  assert.equal(evidence.usecase_items, 1)
  assert.equal(evidence.output_items, 1)
  assert.equal(evidence.reliability_items, 3)
})

test('install lines inside a code block are dropped but run lines still count', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
\`\`\`sh
npm install demo
npm run demo -- --input file.json
\`\`\`
`)
  assert.equal(evidence.code_examples, 1)
  const installOnly = practicalEvidence(`
# Demo
## Usage
\`\`\`sh
npm install demo
export OPENAI_API_KEY=sk-123
\`\`\`
`)
  assert.equal(installOnly.code_examples, 0)
})

test('brand headings with marketing prose never enter the fallback', () => {
  const evidence = practicalEvidence(`
# Demo
## TurboMax Pro
The world's most powerful plugin with blazing fast performance.
## New Stuff
This plugin is the world's best and is loved by thousands of users.
`)
  assert.deepEqual(evidence, {
    version: README_PRACTICAL_VERSION,
    ...ZERO_EVIDENCE,
    confidence: ZERO_CONFIDENCE,
  })
})

test('length, install, config, popularity and identity contribute zero evidence', () => {
  const evidence = practicalEvidence(`
# UltraPlugin
![stars](https://img.shields.io/github/stars/x/y)
![build](https://github.com/x/y/actions/workflows/ci.yml/badge.svg)
A fast CLI for developers and teams.
## Installation
npm install ultra-plugin
## Configuration
- Set ULTRA_TOKEN.
`)
  assert.deepEqual(evidence, {
    version: README_PRACTICAL_VERSION,
    ...ZERO_EVIDENCE,
    confidence: ZERO_CONFIDENCE,
  })
})

test('badge and screenshot spam: URLs filter badges, natural alt words keep media', () => {
  const evidence = practicalEvidence(`
# Demo
![build badge](https://img.shields.io/build.svg)
![workflow](https://github.com/x/y/actions/workflows/ci.yml/badge.svg)
![stars](https://badgen.net/github/stars/x/y)
## Results
![real screenshot](assets/screenshot.png)
![workflow demo](assets/workflow.gif)
`)
  assert.equal(evidence.media, 2)
})

test('format equivalence: bullets, table, heading+description and Q&A are comparable', () => {
  const bullets = practicalEvidence(`
# Demo
## Features
- Parse PDFs
- Export CSV
- Watch folders
`)
  const table = practicalEvidence(`
# Demo
## Features
| Feature | Description |
|---|---|
| Parse PDFs | Convert PDF to text. |
| Export CSV | Write rows to disk. |
| Watch folders | Monitor directories. |
`)
  const headingDesc = practicalEvidence(`
# Demo
## Features
### Parse PDFs
Convert PDF documents into structured text.
### Export CSV
Write report rows to CSV files.
### Watch folders
Monitor directories for changes.
`)
  const qa = practicalEvidence(`
# Demo
## FAQ
**Q: Can it parse PDFs?**
**A:** Yes, with structured output.
**Q: Does it export CSV?**
**A:** Yes, including headers.
`)
  assert.equal(bullets.capability_items, 3)
  assert.equal(table.capability_items, 3)
  assert.equal(headingDesc.capability_items, 3)
  assert.equal(qa.reliability_items, 2)
})

test('preamble substantive bullets count as capability evidence', () => {
  const evidence = practicalEvidence(`
# Demo
- Parse PDFs into structured JSON
- Export reports as CSV
- Watch folders for changes
## Installation
npm install demo
`)
  assert.equal(evidence.capability_items, 3)
  assert.equal(evidence.confidence.coverage, 0.111)
  assert.equal(evidence.confidence.fallback_share, 0)
  assert.equal(evidence.confidence.overall, 0.556)
})

test('preamble requirement and marketing bullets are filtered out', () => {
  const evidence = practicalEvidence(`
# Demo
- Requires Node 18 or newer
- Blazing fast performance
- Parse PDFs into structured JSON
`)
  assert.equal(evidence.capability_items, 1)
})

test('preamble concrete product surfaces count without rewarding identity or marketing prose', () => {
  const concrete = practicalEvidence(`
# Demo
DSH Web 会话页的审计时间线 + 场景元素可视化编辑器。

在会话标签栏加入「GAL视窗」标签，点开后可拖拽卡片。

Browser dashboard for developers auditing failed releases.
`)
  const noise = practicalEvidence(`
# Demo
Demo is a powerful modern plugin for developers.
Powerful dashboard and delightful panel for everyone.
Browser dashboard for everyone.

A session panel built for anybody.

Web editor for users.

Desktop timeline for developers.

Mobile canvas for modern teams.

Conversation workspace for all enterprises.
Requires Node.js 22 and an API token.
Coming soon: a timeline panel and scene editor.

The README includes a browser panel guide.
`)
  assert.equal(concrete.capability_items, 2)
  assert.equal(concrete.usecase_items, 1)
  assert.equal(noise.capability_items, 0)
  assert.equal(noise.usecase_items, 0)
})

test('preamble behavior requires a concrete object and audience identity stays uncredited', () => {
  const concrete = practicalEvidence(`
# Demo
Open a workspace directory in VS Code straight from the DeepSeek Harness web GUI: each Workspace row gains an Open in VSCode action.

一个 DSH 排队消息面板：编辑、删除和排序消息。

DSH Web 的右侧工作区面板，在会话旁提供 Git 审查、终端和文件操作。
`)
  const noise = practicalEvidence(`
# Demo
A web editor built for developers.

Our desktop workspace opens possibilities.

The conversation view connects people.

Browser dashboard and panel.

DSH Web 面板提供美好未来和现代体验。
`)
  assert.equal(concrete.capability_items, 3)
  assert.equal(concrete.usecase_items, 0)
  assert.equal(noise.capability_items, 0)
  assert.equal(noise.usecase_items, 0)
})

test('### capability name + short description fallback counts at half weight', () => {
  const evidence = practicalEvidence(`
# Demo
### Timeline navigation
Click a node to jump to that message in the transcript.
### Project folders
Drag a workspace into a persistent project folder.
`)
  assert.equal(evidence.capability_items, 1)
  assert.equal(evidence.confidence.fallback_share, 1)
  assert.equal(evidence.confidence.coverage, 0.111)
  assert.equal(evidence.confidence.overall, 0.056)
})

test('fallback units mix with main-path units as fractional weights', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export reports as JSON.
## Timeline navigation
Click a node to jump to that message in the transcript.
`)
  assert.equal(evidence.capability_items, 1.5)
  assert.equal(evidence.confidence.fallback_share, 0.333)
  assert.equal(evidence.confidence.coverage, 0.111)
  assert.equal(evidence.confidence.overall, 0.389)
})

test('configuration assignments stay zero across main and fallback surfaces without hiding delivered behavior', () => {
  const zeroDocs = [
    '# Demo\n## Features\n- export FOO_BAR=1',
    '# Demo\n## Product Workspace\n- export FOO_BAR=1\n- export BAZ_QUX=2',
    '# Demo\n## Product Workspace\n- `FOO_BAR=1`\n- `BAZ_QUX=2`',
    '# Demo\n## Product Workspace\nGITHUB_TOKEN=this-is-a-deliberately-long-configuration-value',
    '# Demo\n## Product Workspace\n- OPENAI_API_KEY=sk-123\n- GITHUB_TOKEN=secret',
  ]
  for (const text of zeroDocs) {
    const evidence = practicalEvidence(text)
    assert.equal(evidence.capability_items, 0, text)
    assert.equal(evidence.usage_items, 0, text)
    assert.equal(evidence.usage_actions, 0, text)
  }

  const replacement = practicalEvidence(`# Demo
## Product Workspace
- export FOO_BAR=1
- Click a node to jump to that message in the transcript.`)
  assert.equal(replacement.capability_items, 0.5)
  assert.equal(replacement.confidence.fallback_share, 1)

  const delivered = practicalEvidence(`# Demo
## Product Workspace
The settings panel manages plugin install state and exports a signed audit report.`)
  assert.equal(delivered.capability_items, 0.5)
})

test('release-channel metadata is surface-invariant while updater and preview behavior keep semantic credit', () => {
  const evidence = practicalEvidence(`
# Demo
## Updates and recovery
The desktop updater checks for new versions after startup and shows release notes before upgrading.
- **Stable**：默认频道，适合绝大多数用户。
- **Beta**：用于体验较新的功能，需要用户主动切换。
## Features
- 预览：渲染 Markdown、代码块和链接，保存时写回磁盘。
`)
  assert.equal(evidence.capability_items, 1.5)
  assert.equal(evidence.usecase_items, 0)
  assert.equal(evidence.confidence.fallback_share, 0.333)

  const wrappers = [
    (text) => text,
    (text) => `- ${text}`,
    (text) => `1. ${text}`,
    (text) => `> ${text}`,
    (text) => `**${text}**`,
    (text) => `<p><strong>${text}</strong></p>`,
    (text) => {
      const [label, ...detail] = text.split(/[:：]/)
      return `| Mode | Behavior |\n|---|---|\n| ${label} | ${detail.join(':')} |`
    },
  ]
  const metadata = [
    'Stable: default release channel for most users.',
    'Beta: switch to try newer features.',
    '稳定版：默认更新频道，适合大多数用户。',
    '测试版：切换后体验较新的功能版本。',
  ]
  const surfaceCapabilities = [
    'Preview: renders Markdown and code before saving.',
    '预览：渲染 Markdown 和代码并在保存前展示。',
  ]
  const labelCollisionCapabilities = [
    'Preview: builds an HTML report before saving.',
    'Preview: switches between Markdown and source views.',
    'Preview: displays the latest generated report.',
    'Preview: displays the latest version in the dependency graph.',
    'Preview: compares experimental builds in a rendered report.',
    'Beta: builds a deterministic search index.',
    'Beta: switches between local workspaces.',
    'Beta: displays the latest audit report.',
    'Beta: validates the latest version before deployment.',
    'Beta: analyzes pre-release builds and exports JSON.',
    'Preview: renders the default channel map.',
    'Preview: documents the default release channel fallback.',
    'Beta: exports the release channel graph as JSON.',
    'Preview: displays update channels in a table.',
    'Beta: validates the selected channel before deployment.',
    '预览：展示最新版本的依赖差异。',
    '预览：渲染默认频道映射。',
    '测试版：导出发布频道图谱。',
    '测试版：比较预览构建并导出报告。',
  ]
  for (const text of metadata) {
    for (const wrap of wrappers) {
      const actual = practicalEvidence(`# Demo\n## Features\n${wrap(text)}`)
      assert.equal(actual.capability_items, 0, wrap(text))
      assert.equal(actual.usecase_items, 0, wrap(text))
    }
  }
  for (const text of surfaceCapabilities) {
    for (const wrap of wrappers) {
      assert.equal(practicalEvidence(`# Demo\n## Features\n${wrap(text)}`).capability_items, 1, wrap(text))
    }
  }
  for (const text of labelCollisionCapabilities) {
    assert.equal(practicalEvidence(`# Demo\n## Features\n- ${text}`).capability_items, 1, text)
  }
})

test('reviewed metadata and persona near-variants stay zero without suppressing delivered behavior', () => {
  const zeroDocs = [
    `# Demo
## Product Workspace
- A dashboard for developers.
- Designed for developers.`,
    `# Demo
## Product Workspace
- Powerful and delightful for everyone.
- Designed for developers.`,
    `# Demo
## Product Workspace
- Requires Node 22 and an API token.
- Designed for developers.`,
    `# Demo
## Product Workspace
- Coming soon: automatic report exports.
- Designed for developers.`,
    `# Demo
## 产品空间
- 面向开发者的 Web 面板。
- 面向用户的 Web 面板。`,
    `# Demo
## Features
- Stable: default channel for most users.`,
    `# Demo
## Features
- Stable is the default release channel for most users.`,
    `# Demo
## 功能
- 稳定版：默认频道。`,
    `# Demo
## Features
| Channel | Detail | Platform |
|---|---|---|
| Stable | The default release channel for most users. | Desktop |`,
    `# Demo
Key channels:
- **Stable** — The default release channel for most users.
- **Beta** — Try newer features.`,
    `# Demo
## Features
- Beta: experimental builds for early access.`,
    `# Demo
## Features
- Beta: provides experimental builds for early access.`,
    `# Demo
## 功能
- 稳定版：提供实验构建供早期体验。`,
    `# Demo
## 技术
Run npm install demo to get started with the toolkit.`,
    `# Demo
## 技术
Set OPENAI_API_KEY in your environment before the first run.`,
    `# Demo
Designed for developers who want speed.`,
  ]
  for (const text of zeroDocs) {
    const evidence = practicalEvidence(text)
    assert.equal(evidence.capability_items, 0, text)
    assert.equal(evidence.usecase_items, 0, text)
  }

  const mixedFallback = practicalEvidence(`# Demo
## Product Workspace
- Requires Node 22 and an API token.
- Coming soon: automatic report exports.
- Click a node to jump to that message in the transcript.`)
  assert.equal(mixedFallback.capability_items, 0.5)
  assert.equal(mixedFallback.confidence.fallback_share, 1)

  for (const text of [
    '安装插件后，拥有三种 Node.js 驻留模式（随窗口驻留、常驻、随托盘驻留），可在设置页中切换。',
    '设置 → 通用设置 → 皮肤。下面是壁纸预览网格，点一张即应用；动态壁纸生效后在窗口里循环播放。',
    'The settings page panel manages plugin install state: automatic pnpm add, version updates, and bundle uninstall.',
    '安装或更新配置后重启服务；插件自己的 bundle patch 负责装配和清理侧栏。',
  ]) {
    const evidence = practicalEvidence(`# Demo\n## Product Workspace\n${text}`)
    assert.equal(evidence.capability_items, 0.5, text)
  }

  const planNounCapabilities = practicalEvidence(`# Demo
## Product Workspace
- **计划模式**：复用持久化和审批流程。
- Agent 会发送提问、计划或审批卡片。
- **任务控制**：管理运行状态和预算。`)
  assert.equal(planNounCapabilities.capability_items, 0.5)

  const futurePlans = practicalEvidence(`# Demo
## Product Workspace
- 计划：后续支持报告导出。
- 规划中将提供团队仪表盘。`)
  assert.equal(futurePlans.capability_items, 0)

  for (const text of [
    'Stable: default channel for most users, also includes automatic updates.',
    '稳定版：默认频道，提供自动更新和签名。',
    'Preview: builds an HTML report before saving.',
    'Preview: build an HTML report before saving.',
    'Preview: building an HTML report before saving.',
    'Beta: switches between local workspaces.',
    'Preview: displays the latest generated report.',
    'Beta: validates the selected channel before deployment.',
  ]) assert.equal(practicalEvidence(`# Demo\n## Features\n- ${text}`).capability_items, 1, text)

  for (const text of [
    'Designed for developers who want to audit failed releases.',
    'Designed for developers who seek to audit failed releases.',
    'Designed for developers seeking to audit failed releases.',
    'Designed for developers looking for a local audit trail.',
    'Designed for developers auditing failed releases.',
  ]) assert.equal(practicalEvidence(`# Demo\n${text}`).usecase_items, 1, text)
})

test('fallback never fires for nested unknown subsections of an unknown section', () => {
  const evidence = practicalEvidence(`
# Demo
## Section A
- One capability bullet.
- Two capability bullets.
## Section A again
### Nested unknown subsection
Deep prose that would otherwise be a fallback candidate.
`)
  // Section A（两个要点）回退 0.5；"Section A again" 无内容不计；
  // 其子节 "Nested unknown subsection" 被 parentIsOther 门拦截，不得重复计。
  assert.equal(evidence.capability_items, 0.5)
  assert.equal(evidence.confidence.fallback_share, 1)
})

test('media weighting: local and repo-hosted stronger than external hosts', () => {
  const evidence = practicalEvidence(`
# Demo
## Results
![local screenshot](assets/screenshot.png)
![external demo](https://imgur.com/x.png)
![repo hosted](https://raw.githubusercontent.com/a/b/main/docs/x.png)
`)
  assert.equal(evidence.media, 2.5)
})

test('catalog links and pure-link tables do not inflate capability', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- [OpenAI](https://openai.com)
- https://example.com/some/project
## Related
- [Awesome list](https://github.com/a/awesome)
| Name | Link |
|---|---|
| [Docs](https://docs.example.com) | [Source](https://github.com/x/y) |
`)
  assert.equal(evidence.capability_items, 0)
})

test('global near-duplicate control assigns a repeated claim to the more specific dimension', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export reports as JSON
## Use cases
- Export reports as JSON
`)
  assert.equal(evidence.capability_items, 0)
  assert.equal(evidence.usecase_items, 1)
})

test('catalog repo-link descriptions never become the linked projects practical evidence', () => {
  const evidence = practicalEvidence(`
# Awesome tools
## Tools & Capabilities
- [owner/parser](https://github.com/owner/parser) — Parse PDFs and export JSON.
- **Built-in validation** — Check every catalog entry before publication.
- [Contribution guide](CONTRIBUTING.md) — Explain how maintainers verify submissions.
## Security & Governance
- [owner/guard](https://github.com/owner/guard) — Scan dependencies for vulnerabilities.
`)
  assert.equal(evidence.capability_items, 2)
  assert.equal(evidence.reliability_items, 0)
})

test('HTML headings and image-alt chapter titles are normalized before classification', () => {
  const evidence = practicalEvidence(`
<h1 align="center">Demo</h1>
<h2 align="center"><img src="case.svg" alt="Practice Case: audit a release"></h2>
- Audit a release before deployment.
- Reproduce a failed acceptance run.
<h2 align="center">Use Demo</h2>
1. Open the release folder.
2. Run the audit command.
`)
  assert.ok(evidence.usecase_items >= 1)
  assert.ok(evidence.usage_items >= 2)
})

test('why sections get constrained half credit and preview prose gets no output credit', () => {
  const evidence = practicalEvidence(`
# Demo
## Why Demo
- Audit a release before deployment.
- The world's best modern choice for every developer.
## Agency Preview
Future autonomous agents will change everything.
`)
  assert.equal(evidence.usecase_items, 0.5)
  assert.equal(evidence.output_items, 0)
})

test('client headings do not collide with CLI capability classification', () => {
  const evidence = practicalEvidence(`
# Demo
## IDE & Clients
- [owner/client](https://github.com/owner/client) — External client project.
`)
  assert.equal(evidence.capability_items, 0)
})

test('usage recognizes compact, CJK and CLI heading forms before capability', () => {
  for (const heading of ['Quickstart', 'Get Started', 'How To Start', '快速上手', '三步上手', 'Quick start (CLI)', 'Use the CLI', '命令行参数']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n1. Run the audit command.\n2. Open the generated report.\n`)
    assert.ok(evidence.usage_items >= 2, heading)
  }
})

test('usage prose mentioning setup or deployment is not mistaken for an install step', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
Once installed, open the panel and select a report.

Audit a release before deployment and save the receipt.
- Install the package first.
`)
  assert.equal(evidence.usage_items, 2)
})

test('unicode spaces in headings normalize to ordinary spaces', () => {
  const evidence = practicalEvidence('# Demo\n## Quick\u00a0Start\n1. Open the panel.\n2. Run the audit.\n')
  assert.equal(evidence.usage_items, 2)
})

test('reference tables contribute one semantic unit while preserving structural actions', () => {
  const evidence = practicalEvidence(`
# Demo
## API Reference
| Endpoint | Response |
|---|---|
| \`GET /api/search\` | Returns JSON search results |
| \`GET /api/doc/{id}\` | Returns the document body |
| \`GET /api/health\` | Returns JSON status |
## Features
- Export a signed audit report.
- Compare two release candidates.
`)
  assert.equal(evidence.capability_items, 3)
  assert.equal(evidence.usage_actions, 3)
  assert.equal(evidence.io_pairs, 3)
})

test('bold setup steps do not count as actions but numbered operational steps do', () => {
  const evidence = practicalEvidence(`
# Demo
## Quick start
1. **下载安装**：Download the DMG and install the app.
2. **配置模型**：Enter an API key in settings.
3. Click **Run audit** to execute the review.
`)
  assert.equal(evidence.usage_actions, 1)
})

test('fenced CLI families count outside command headings with install and developer guards', () => {
  const operational = practicalEvidence(`
# Demo
## 常用操作
\`\`\`text
/workflow review --risk high --wait
/workflow resume run-123 --wait
/workflow cancel run-123
\`\`\`
`)
  const installation = practicalEvidence(`
# Demo
## 常用操作
\`\`\`sh
dsh plugin --profile web add github:owner/demo
dsh plugin --profile dev add github:owner/demo
npx skills add github:owner/skill --skill demo
\`\`\`
`)
  const developer = practicalEvidence(`
# Demo
## 打包命令
\`\`\`sh
npx electron-builder --mac dmg
npx electron-builder --win nsis
\`\`\`
`)
  assert.equal(operational.usage_actions, 3)
  assert.equal(installation.usage_actions, 0)
  assert.equal(developer.usage_actions, 0)
})

test('command tables reject setup tooling and harvest slash commands from any cell', () => {
  const developer = practicalEvidence(`
# Demo
## 开发命令
| Command | Purpose |
|---|---|
| \`npm install\` | Install dependencies |
| \`npm run build\` | Build release bundles |
`)
  const commands = practicalEvidence(`
# Demo
## Slash commands
| Group | Commands |
|---|---|
| Sessions | \`/new\`, \`/resume\`, \`/export md\` |
| Agent | \`/model\`, \`/compact\` |
`)
  assert.equal(developer.usage_actions, 0)
  assert.equal(commands.usage_actions, 5)
})

test('command-shaped table cells add actions without treating arbitrary catalog rows as commands', () => {
  const commands = practicalEvidence(`
# Demo
## Command Reference
| Command | Purpose |
|---|---|
| \`/audit\` | Audit a release |
| \`demo run --json\` | Write JSON output |
`)
  const catalog = practicalEvidence(`
# Demo
## Features
| Project | Purpose |
|---|---|
| Parser | Parse PDFs |
| Exporter | Write JSON |
`)
  assert.equal(commands.usage_actions, 2)
  assert.equal(catalog.usage_actions, 0)
})

test('bare commands count only inside explicit command sections', () => {
  const commands = practicalEvidence(`
# Demo
## 命令速查
sivtr
sivtr s terminal --status failure --latest 5 --refs # 最近失败事件
/tokenledger export csv 30 # 导出
npm install sivtr
`)
  const prose = practicalEvidence(`
# Demo
## Features
sivtr s terminal --status failure --latest 5 --refs
`)
  assert.equal(commands.usage_actions, 3)
  assert.equal(prose.usage_actions, 0)
})

test('explicit slash commands and tool-reference rows are operational actions', () => {
  const evidence = practicalEvidence(`
# Demo
## Chat integration
/buy model 600000 100
## Memory Tools
| Tool | Purpose |
|---|---|
| \`noema_recall\` | Recall relevant memories for a query. |
| \`noema_search\` | Search stored memories. |
## Features
| Name | Purpose |
|---|---|
| \`release_status\` | Display project metadata. |
`)
  assert.equal(evidence.usage_actions, 3)
})

test('single-token CJK headings can use substantive fallback without weakening marketing gates', () => {
  const evidence = practicalEvidence('# Demo\n## 技术\n- 选择两个版本进行对比。\n- 导出差异报告。\n')
  assert.equal(evidence.capability_items, 0.5)
})

test('numbered Chinese scenario headings are explicit use-case evidence', () => {
  const evidence = practicalEvidence(`
# Demo
## 场景一：跨会话长期记忆
当用户希望 AI 在后续会话继续记住项目约束时，保存并召回该项目的长期记忆。
## 场景二：离开电脑后继续工作
用户在手机上筛选活跃会话，接收完成通知并继续当前任务。
`)
  assert.equal(evidence.usecase_items, 2)
  assert.equal(evidence.capability_items, 0)
})

test('standalone bold semantic labels create bounded subsections inside scenarios', () => {
  const chinese = practicalEvidence(`
# Demo
## 场景一：整理会话
**适合谁**：同时维护多个项目的开发者。
**能做什么**：
- 搜索项目日志并展示历史决策。
**怎么用**（详见 [操作指南](docs/guide.md)）：
1. 打开会话筛选器。
2. 选择需要整理的会话。
**会得到什么**：导出带来源链接的 JSON 审计报告。
`)
  const english = practicalEvidence(`
# Demo
## Scenario: release review
**How to use**:
1. Open the release dashboard.
2. Select the failed validation run.
**Results**: A JSON audit report is saved with source links.
`)
  assert.equal(chinese.usecase_items, 1)
  assert.equal(chinese.capability_items, 1)
  assert.equal(chinese.usage_items, 2)
  assert.equal(chinese.usage_actions, 2)
  assert.equal(chinese.output_items, 1)
  assert.equal(english.usage_items, 2)
  assert.equal(english.usage_actions, 2)
  assert.equal(english.output_items, 1)
})

test('inline, list-prefixed, unknown, and marketing bold labels cannot manufacture sections', () => {
  const evidence = practicalEvidence(`
# Demo
## Notes
This sentence mentions **How to use** without defining a section.
- **How to use**: Create the future today.
**Unknown label**: Run faster.
**Features**: Powerful and delightful for everyone.
**Roadmap**:
1. Open the future.
**Results**: The ultimate modern experience for everyone.
`)
  assert.equal(evidence.capability_items, 0)
  assert.equal(evidence.usage_items, 0)
  assert.equal(evidence.usage_actions, 0)
  assert.equal(evidence.output_items, 0)
})

test('qualified current limits headings route constraints to reliability', () => {
  const evidence = practicalEvidence(`
# Demo
## Requirements and current limits
- Some layout checks require a local Chrome executable.
- Slide master pages are outside the current editing scope.
- Board file export is not yet supported.
`)
  assert.equal(evidence.reliability_items, 3)
  assert.equal(evidence.capability_items, 0)
})

test('limit substrings in capability headings do not become reliability', () => {
  const evidence = practicalEvidence(`
# Demo
## Perps and limit orders
- Create a limit order with a target price.
- Cancel the pending order before execution.
## Register for unlimited access
- Open the account registration form.
- Submit the completed request.
`)
  assert.equal(evidence.reliability_items, 0)
})

test('specific reliability facts migrate out of generic feature sections', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export reports as JSON.
- Credentials never enter the sandbox and are encrypted at rest.
- A failed provider logs an error and the remaining providers stay live.
`)
  assert.equal(evidence.reliability_items, 2)
  assert.equal(evidence.capability_items, 1)
})

test('bare reliability adjectives do not steal capability or output claims', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export validated reports as JSON.
- 导出带权限水印的 PDF 报告。
`)
  assert.equal(evidence.reliability_items, 0)
  assert.equal(evidence.capability_items + evidence.output_items, 2)
})

test('predicate-bound verification and domain consequences remain reliability facts', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Reports are validated against 200 corpora.
- Both release binaries are verified end-to-end.
- Invalid saves keep the previous verified diagram visible.
- Integration tests cover provider failover.
- The strict sandbox blocks home-directory access.
- Camera access requires explicit permission.
- 已通过 200 组语料验证。
- 需要申请相机权限。
`)
  assert.equal(evidence.reliability_items, 8)
  assert.equal(evidence.capability_items, 0)
})

test('verification words stay with capability unless bound to a failure or authority boundary', () => {
  const ordinary = practicalEvidence(`
# Demo
## Features
- Show previous verified reports in the dashboard.
- Verified reports stay visible in the dashboard.
`)
  const boundary = practicalEvidence(`
# Demo
## Features
- The latest verified save remains visible when the next save is invalid.
- Only an authenticated human can accept verified work.
`)
  assert.equal(ordinary.reliability_items, 0)
  assert.equal(boundary.reliability_items, 2)
})

test('explicit when-to-use facts migrate without matching catalog or configuration prose', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Search project notes by keyword.
- Use this when you need to recover context after a long session.
- **适合谁**：同时维护多个项目的开发者。
- This adapter is suitable when a provider loads late.
- [Theme](https://github.com/owner/theme) — 适合个人主题开发与分享。
`)
  assert.equal(evidence.usecase_items, 2)
  assert.equal(evidence.capability_items, 2)
})

test('concrete completed results migrate while command-like capabilities stay capabilities', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Analyze a release folder.
- Export reports as JSON.
- Generates a JSON report with failed checks and file paths.
`)
  assert.equal(evidence.output_items, 1)
  assert.equal(evidence.capability_items, 2)
})

test('sentence semantics outrank a broader section heading without duplicate claims', () => {
  const evidence = practicalEvidence(`
# Demo
## Scenario: release audit
- Use this when you need to validate a release before deployment.
- Generates a JSON report with failed checks and file paths.
- Credentials never enter the sandbox and are encrypted at rest.
`)
  assert.equal(evidence.usecase_items, 1)
  assert.equal(evidence.output_items, 1)
  assert.equal(evidence.reliability_items, 1)
  assert.equal(evidence.capability_items, 0)
})

test('CLI and API tables produce actions and endpoint IO without config-table leakage', () => {
  const evidence = practicalEvidence(`
# Demo
## CLI
| Command | Purpose |
|---|---|
| \`/audit release --json\` | Audit a release |
| \`demo run --json\` | Run the workflow |
## REST API
| Endpoint | Response |
|---|---|
| \`GET /api/jobs\` | Job list JSON |
| \`POST /api/jobs\` | Created job JSON |
| \`DELETE /api/jobs/{id}\` | Deletion receipt |
## Settings
| Key | Default |
|---|---|
| theme | dark |
| timeout | 30 |
`)
  assert.equal(evidence.usage_actions, 5)
  assert.equal(evidence.io_pairs, 3)
})

test('semantic input-output table headers create IO pairs without command or config inference', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
| User action | What actually runs | Data effect |
|---|---|---|
| Click Retry | Replay the failed job | New receipt |
| Select Export | Serialize the audit | JSON file |
## Commands
| Command | Description |
|---|---|
| demo run | Runs a job |
## Settings
| Input | Output |
|---|---|
| API key | Provider token |
`)
  assert.equal(evidence.io_pairs, 2)
})

test('split API method-path tables create IO pairs without config-table leakage', () => {
  const evidence = practicalEvidence(`
# Demo
## HTTP API
| Method | Path | Description |
|---|---|---|
| GET | /api/jobs | Returns the job list as JSON |
| POST | /api/jobs | Returns the created job and ID |
| DELETE | /api/jobs/:id | Returns a deletion receipt |
## Settings
| Method | Path | Description |
|---|---|---|
| GET | cache.dir | Local cache setting |
`)
  assert.equal(evidence.io_pairs, 3)
})

test('task and scenario table headers create use cases without treating tool-purpose tables as scenarios', () => {
  const evidence = practicalEvidence(`
# Demo
## Pick a mode
| You need… | Recommended mode | Why |
|---|---|---|
| Audit a release | Strict | Captures regressions |
| Explore an idea | Plan | Exposes assumptions |
## Tools
| Tool | Purpose |
|---|---|
| audit_release | Audit a release |
| plan_feature | Plan a feature |
`)
  assert.equal(evidence.usecase_items, 2)
})

test('endpoint lists require an explicit output side and scheduling semantics are not IO pairs', () => {
  const bareEndpoints = practicalEvidence(`
# Demo
## API Reference
| Endpoint | Description |
|---|---|
| \`GET /api/search\` | Search documents |
| \`GET /api/doc/{id}\` | Get one document |
| \`GET /api/health\` | Health check |
`)
  const explicitOutputs = practicalEvidence(`
# Demo
## API Reference
| Endpoint | Response |
|---|---|
| \`GET /api/search\` | Returns JSON search results |
| \`GET /api/doc/{id}\` | Returns the document body |
| \`GET /api/health\` | Returns JSON status |
`)
  const scheduling = practicalEvidence(`
# Demo
## Scheduling and recovery semantics
| Situation | Behavior |
|---|---|
| Overlap | Skip the due run |
| Host restarts late | Resume from the checkpoint |
`)
  assert.equal(bareEndpoints.io_pairs, 0)
  assert.equal(explicitOutputs.io_pairs, 3)
  assert.equal(scheduling.io_pairs, 0)
})

test('migration situation tables are decisions, not user scenarios', () => {
  const evidence = practicalEvidence(`
# Demo
## Migration decisions
| Situation | Behavior | Cost |
|---|---|---|
| Existing image | Copy the prior analysis | No raw image resend |
| Missing target | Stop before execution | No partial migration |
`)
  assert.equal(evidence.usecase_items, 0)
})

test('explicit ask actions and quoted prompts count only under operational guidance', () => {
  const evidence = practicalEvidence(`
# Demo
## Capability map
- Ask for an order dashboard.
The agent asks for missing details.
## Basic flow
_“Login to the service”_
_“Show my deposit address”_
## Notes
_“Buy 100 tokens”_
`)
  assert.equal(evidence.usage_actions, 3)
})

test('concrete credential sync, failover and availability boundaries are reliability facts', () => {
  const evidence = practicalEvidence(`
# Demo
## Providers
- Tokens refresh automatically and remain mode 0600.
- Only logged-in providers appear in the picker.
- Requests fail over before streaming, with cooldowns.
- The password is never returned to the browser.
- Cards show colorful provider names.
`)
  assert.equal(evidence.reliability_items, 4)
})
test('action verbs in narrative prose do not manufacture actions', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
The agent may open a panel after the workflow finishes.
Open the report panel and select the failed check.
`)
  assert.equal(evidence.usage_actions, 1)
})

test('media-backed output prose receives half credit without caption double count', () => {
  const evidence = practicalEvidence(`
# Demo
## Results
The completed audit produces a signed receipt with the failed checks.
![Audit receipt](docs/audit-receipt.png)
`)
  assert.equal(evidence.output_items, 0.5)
  assert.equal(evidence.media, 1)
})

test('artifact and rendered-surface headings are explicit outputs without substring collisions', () => {
  for (const heading of ['See it work', 'Output Artifacts', 'Paper Storage Structure', 'Display surfaces', 'Result Metadata', 'What a Session Looks Like']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- A signed report with failed checks.\n`)
    assert.equal(evidence.output_items, 1, heading)
  }
  for (const heading of ['Result cache settings', 'Storage configuration', 'Display options']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- A signed report with failed checks.\n`)
    assert.equal(evidence.output_items, 0, heading)
  }
})

test('decorative media filenames do not count as demonstrations', () => {
  const evidence = practicalEvidence(`
# Demo
![Logo](docs/logo.png)
![Hero art](docs/hero-banner.webp)
![Audit result](docs/audit-result.png)
`)
  assert.equal(evidence.media, 1)
})

test('external repository rows in tables cannot inflate current-project capability', () => {
  const evidence = practicalEvidence(`
# Catalog
## Features
| Project | Description |
|---|---|
| [Parser](https://github.com/owner/parser) | Parse PDFs and export JSON |
| [Guard](https://github.com/owner/guard) | Scan dependencies for vulnerabilities |
`)
  assert.equal(evidence.capability_items, 0)
})

test('workflow category headings do not imply explicit user scenarios', () => {
  const evidence = practicalEvidence(`
# Catalog
## Workflows & Agents
- [Research](https://github.com/owner/research) — Run multi-step research and export reports.
- [Coder](https://github.com/owner/coder) — Review and modify source code.
`)
  assert.equal(evidence.usecase_items, 0)
  assert.equal(evidence.capability_items, 0)
})

test('imperative actions and explicit IO labels do not require a Usage heading', () => {
  const evidence = practicalEvidence(`
# Demo
## Scenario: audit a release
1. Pick the release candidate.
2. Ask the agent whether the manifest is valid.
Open the release folder and select the manifest.
Input: a local release directory
Output: a signed audit receipt
`)
  assert.equal(evidence.usage_actions, 3)
  assert.equal(evidence.io_pairs, 1)
})

test('labeled IO pairs require one nearby operational example in the same section', () => {
  const examples = [
    '# Demo\n## Usage\nInput: source.pdf\nOutput: report.json',
    '# Demo\n## Usage\nInput: source.pdf\n\nOutput: report.json',
    '# Demo\n## 使用\n输入：源文件\n输出：审计报告',
    '# Demo\n## Usage\nInput: source.pdf | Output: report.json',
  ]
  for (const text of examples) assert.equal(practicalEvidence(text).io_pairs, 1, text)

  const crossSection = practicalEvidence('# Demo\n## Request\nInput: source.pdf\n## Result\nOutput: report.json')
  const distant = practicalEvidence('# Demo\n## Usage\nInput: source.pdf\nFirst operation.\nSecond operation.\nThird operation.\nFourth operation.\nOutput: report.json')
  assert.equal(crossSection.io_pairs, 0)
  assert.equal(distant.io_pairs, 0)
})

test('action dedup ignores trailing comments but preserves command flags', () => {
  const evidence = practicalEvidence(`
# Demo
## Commands
\`\`\`sh
uv run pytest -q # offline tests
uv run pytest -q # офлайн-тесты
opencontext doctor # human-readable checks
opencontext doctor --json # CI-friendly checks
\`\`\`
`)
  assert.equal(evidence.usage_actions, 3)
})

test('short screenshot-grid captions do not become use cases while descriptive cells remain', () => {
  const grid = practicalEvidence(`
# Demo
## Screenshots: real usage scenarios
| ![Library](docs/library.png) | ![Chat](docs/chat.png) | ![Profile](docs/profile.png) |
|---|---|---|
| Library | Chat | Profile |
| Light | Dark | Settings |
`)
  const descriptive = practicalEvidence(`
# Demo
## Use cases
| Screenshot | Description |
|---|---|
| ![Input](docs/input.png) | Toolbar icons let reviewers open the model picker and submit one audit request. |
`)
  assert.equal(grid.usecase_items, 0)
  assert.equal(descriptive.usecase_items, 1)
})

test('dense measured-result tables provide bounded output evidence', () => {
  const evidence = practicalEvidence(`
# Demo
## Evaluation
| Runner | Full score | Paired score | Gain |
|---|---:|---:|---:|
| Alpha | 144/144 | 96/96 | +16 |
| Beta | 134/144 | 88/96 | +16 |
| Gamma | 126/144 | 82/96 | +15 |
`)
  assert.equal(evidence.output_items, 3)
})

test('configuration compatibility and version tables are not measured outputs', () => {
  const evidence = practicalEvidence(`
# Demo
## Configuration
| Option | Value |
|---|---|
| timeout | 30s |
| retries | 3 |
## Compatibility
| Platform | Version |
|---|---|
| Android | 14 |
| Node | 22.19.0 |
`)
  assert.equal(evidence.output_items, 0)
})

test('single-line slash prompt fences pool within one section', () => {
  const evidence = practicalEvidence(`
# Demo
## Good Prompts
\`\`\`text
/odai review the current diff and report findings first
\`\`\`
\`\`\`text
/odai refresh this repository README and remove outdated screenshots
\`\`\`
\`\`\`text
/odai audit the release evidence before publication
\`\`\`
`)
  assert.equal(evidence.usage_actions, 3)
})

test('isolated unannotated command fence outside guidance remains action-neutral', () => {
  const evidence = practicalEvidence(`
# Demo
## Architecture
\`\`\`sh
axern local up
\`\`\`
`)
  assert.equal(evidence.usage_actions, 0)
})

test('HTML table cells with explicit paragraph breaks preserve scenario and outcome prose', () => {
  const evidence = practicalEvidence(`
# Demo
## Use cases
<table>
<tr><td><strong>Trace a code path</strong><br><br>Ask from the CLI for a source-grounded explanation of a real project flow.<br><br>The result is a local explorer with files, branches, and the selected path.</td><td><img src="docs/explorer.png" alt="Explorer result"></td></tr>
<tr><td><strong>Plan writing slots</strong><br><br>Turn candidate availability into useful writing blocks.<br><br>The interface saves the selected blocks to the task.</td></tr>
</table>
`)
  assert.equal(evidence.usecase_items, 4)
  assert.equal(evidence.media, 1)
})

test('HTML layout and image-only cells do not manufacture semantic evidence', () => {
  const evidence = practicalEvidence(`
# Demo
## Use cases
<table><tr><td><img src="docs/logo.png" alt="Project logo"></td><td>Short label</td></tr></table>
`)
  assert.equal(evidence.usecase_items, 0)
  assert.equal(evidence.output_items, 0)
})

test('explicit full bilingual copies take per-dimension max instead of summing translations', () => {
  const filler = 'This paragraph documents background context without adding a list claim. '.repeat(20)
  const evidence = practicalEvidence(`
# 🇨🇳 Demo（中文）
## 功能
- 导出带失败检查的签名报告。
- 比较两个候选版本的运行差异。
## About
${filler}
# 🇬🇧 Demo (English)
## Features
- Export a signed report containing failed checks.
- Compare runtime differences between two candidate versions.
## About
${filler}
`)
  assert.equal(evidence.capability_items, 2)
})

test('short language glossary headings do not split a monolingual document', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Export a signed report containing failed checks.
- Compare runtime differences between two candidate versions.
## English
A short glossary note.
## Capabilities
- Preserve a replayable audit trail for every run.
`)
  assert.equal(evidence.capability_items, 3)
})

test('same-operation fences repeated for client prefixes count once', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
\`\`\`text
$sealos deploy this repo to the cloud
$sealos show deployment status
$sealos delete the deployment
\`\`\`
\`\`\`text
/sealos deploy this repo to the cloud
/sealos show deployment status
/sealos delete the deployment
\`\`\`
`)
  assert.equal(evidence.code_examples, 1)
})

test('distinct sibling fences sharing one setup line remain distinct examples', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
\`\`\`sh
demo select ./release
demo audit ./release --json
\`\`\`
\`\`\`sh
demo select ./release
demo export ./release --pdf
\`\`\`
`)
  assert.equal(evidence.code_examples, 2)
})

test('numbered work-mode headings route concrete modes to capability', () => {
  for (const heading of ['九个工作模式', '七种工作模式']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n| Mode | Purpose |\n|---|---|\n| Audit | Review source and report findings |\n| Compare | Run candidates and compare outputs |\n`)
    assert.equal(evidence.capability_items, 2, heading)
  }
  const settings = practicalEvidence('# Demo\n## 工作模式设置\n- Choose a default display option.\n')
  assert.equal(settings.capability_items, 0)
})

test('Chinese command-line heading has CLI usage parity', () => {
  const evidence = practicalEvidence(`
# Demo
## 命令行
Use the unified parent command for every workspace operation.
\`\`\`bash
demo skill list --profile web
demo skill disable alpha --profile web
\`\`\`
`)
  assert.equal(evidence.usage_items, 1)
  assert.equal(evidence.code_examples, 1)
})

test('translated mechanism headings match how-it-works capability routing', () => {
  for (const heading of ['工作原理', '它怎么工作', '插件工作原理（数据驱动）', 'How this works']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\nThe host routes each request through a local policy engine before execution.\n`)
    assert.equal(evidence.capability_items, 1, heading)
    assert.equal(evidence.usage_items, 0, heading)
  }
})

test('compound preview headings use constrained soft-output evidence', () => {
  for (const heading of ['界面预览', '在线预览', 'Interface preview']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\nThe rendered card shows the measured totals and selected cutoff.\n![Rendered result](docs/result.png)\n`)
    assert.equal(evidence.output_items, 0.5, heading)
  }
  const settings = practicalEvidence('# Demo\n## 预览配置\nThe future dashboard will show measured totals.\n')
  assert.equal(settings.output_items, 0)
})

test('timed start and try-it headings are usage but timed installation is not', () => {
  for (const heading of ['30-Second Start', 'Try It in Two Minutes']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n1. Open the panel.\n2. Select a release.\n`)
    assert.equal(evidence.usage_items, 2, heading)
  }
  const install = practicalEvidence('# Demo\n## 30-second install, upgrade, and remove\n1. Install the package.\n2. Restart the host.\n')
  assert.equal(install.usage_items, 0)
})

test('wrapped markdown prose is counted by logical block rather than physical line', () => {
  const evidence = practicalEvidence(`
# Demo
## Usage
- Open the panel and choose the release
  candidate from the local review queue before continuing.

Client configuration mirrors the selected workspace.
Each server starts through the same local runner and profile.

Open the completed receipt in the review panel.
`)
  assert.equal(evidence.usage_items, 2)
})

test('explicit make-your-own walkthrough headings own operational tutorials', () => {
  for (const heading of ['从零生成你自己的宠物（完整流程）', '用一张图做你自己的皮肤', 'Build your own corpus']) {
    const evidence = practicalEvidence(`# Demo
## ${heading}
1. Draft the source asset.
2. Run the conversion pipeline.
`)
    assert.equal(evidence.usage_items, 2, heading)
    assert.equal(evidence.usage_actions, 2, heading)
  }

  const developerMeta = practicalEvidence(`# Demo
## Writing Your Own Plugin
1. Install the SDK.
2. Configure the manifest.
`)
  assert.equal(developerMeta.usage_items, 0)
  assert.equal(developerMeta.usage_actions, 0)
})

test('generic how-X-works headings route mechanisms without reopening setup sections', () => {
  for (const heading of ['How a clone run works', 'How orchestration works', 'How Trust Scoring Works', 'How Sync Works']) {
    const evidence = practicalEvidence(`# Demo
## ${heading}
1. Capture the live URL
2. Repair the worst measured section
`)
    assert.equal(evidence.capability_items, 2, heading)
  }

  for (const heading of ['How Setup Works', 'How the setup works', 'How plugin installation works', 'How configuration sync works']) {
    const setup = practicalEvidence(`# Demo
## ${heading}
1. Install the package
2. Configure API_KEY
`)
    assert.equal(setup.capability_items, 0, heading)
    assert.equal(setup.usage_items, 0, heading)
  }
})

test('how-it-works is capability while operational guides remain usage', () => {
  const explanation = practicalEvidence(`
# Demo
## How it works
The host routes each request through a local policy engine before execution.
`)
  const guide = practicalEvidence(`
# Demo
## How to use
1. Open the panel.
2. Select a release.
`)
  assert.equal(explanation.capability_items, 1)
  assert.equal(explanation.usage_items, 0)
  assert.equal(guide.usage_items, 2)
})

test('quoted transcripts are not code examples while distinct runnable fences remain distinct', () => {
  const transcript = practicalEvidence(`
# Demo
## Usage
\`\`\`text
> How do I send an application message?
Search found three related documents.
\`\`\`
`)
  const runnable = practicalEvidence(`
# Demo
## Usage
\`\`\`sh
demo audit ./release --json
\`\`\`
\`\`\`sh
demo export ./receipt --format pdf
\`\`\`
`)
  assert.equal(transcript.code_examples, 0)
  assert.equal(runnable.code_examples, 2)
})

test('media-backed preview prose receives constrained half output credit', () => {
  const withMedia = practicalEvidence(`
# Demo
## Interface Preview
The hover card displays the trigger, historical direction rate, sample size, and cutoff date.
![Hover card showing measured results](docs/hover-card.png)
`)
  const withoutMedia = practicalEvidence(`
# Demo
## Interface Preview
The hover card displays the trigger, historical direction rate, sample size, and cutoff date.
`)
  assert.equal(withMedia.output_items, 0.5)
  assert.equal(withoutMedia.output_items, 0)
})

test('measured delivered outcomes migrate to output without reclassifying evaluation headings', () => {
  const evidence = practicalEvidence(`
# Demo
## Evaluation
All nine runners produced a positive paired gain.

The run successfully obtained 5,809 quotes and analyzed 9,813,872 valid trading-day candles.

Real session logs rebuilt 26,383 tokens into KPI cards, heatmaps, and cost projections.
`)
  assert.equal(evidence.output_items, 3)
})

test('whole compound CJK outcome headings are outputs without broad substring collisions', () => {
  for (const heading of ['效果展示', '运行效果', '输出示例', '运行结果']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- A signed report containing failed checks.\n- A dashboard showing measured totals.\n`)
    assert.equal(evidence.output_items, 2, heading)
  }
  for (const heading of ['效果设置', '运行环境', '输出配置', '结果缓存']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- A signed report containing failed checks.\n`)
    assert.equal(evidence.output_items, 0, heading)
  }
})

test('roadmap marketing and maintenance status do not become measured outputs', () => {
  const evidence = practicalEvidence(`
# Demo
## Roadmap
Coming soon: a revolutionary dashboard with 99% coverage.
## Repository status
| Package | Status |
|---|---|
| Core | Maintained |
`)
  assert.equal(evidence.output_items, 0)
})

test('badge alt words do not hide real result screenshots and URL badges stay excluded', () => {
  const evidence = practicalEvidence(`
# Checker
![Test results dashboard](assets/test-results.png)
![Release comparison screen](assets/release-comparison.png)
![build status](https://img.shields.io/badge/build-passing-brightgreen)
![CI badge](https://github.com/example/repo/actions/workflows/ci/badge.svg)
`)
  assert.equal(evidence.media, 2)
})

test('explicit external video links count as media without rewarding docs or repository links', () => {
  const evidence = practicalEvidence(`
# Voice Demo
- [口播视频效果 ①](https://www.douyin.com/video/1)
- [Walkthrough](https://www.youtube.com/watch?v=demo)
- [Video export API](https://blog.example.com/video-export)
- [Documentation](https://example.com/docs)
- [Demo repository](https://github.com/owner/demo)
`)
  assert.equal(evidence.media, 1)
})

test('explicit persona statements count without treating platform compatibility as a use case', () => {
  for (const text of [
    'The project is designed for researchers and engineers building tool-using agents.',
    'Designed for regular users, not just developers.',
    'Built for a research lab, with multi-user access and RBAC.',
    'Browser dashboard for developers auditing failed releases.',
    '- 目标用户是需要白箱智能的研究人员。',
    '适合希望通过浏览器访问、自己管理服务的用户。',
    '面向个人工作室和小公司的本地优先 AI 工作台。',
    '适合键盘流与极客用户，在终端中快速连接并展开分析。',
    '适合离开电脑、开会、或需要团队可见的场景。',
    '面向独立开发者的商业 SaaS 启动模板。',
    '面向审查失败发布的开发者提供 Web 面板。',
  ]) assert.equal(practicalEvidence(`# Demo\n${text}`).usecase_items, 1, text)

  for (const text of [
    'Designed for Windows users.',
    'Built for developers.',
    'Designed for security teams.',
    'Target users are researchers.',
    'Designed for developers with a beautiful dashboard.',
    'Built for security teams with a modern panel.',
    'Made for researchers using a powerful workspace.',
    'Intended for engineers who want a delightful experience.',
    'Created for users seeking a better future.',
    '面向外部插件开发者的接入指南（含完整示例）。',
    '本地目录包用于开发；面向普通用户的签名安装包以 GitHub Release 为准。',
    'Stable：默认频道，适合绝大多数用户。',
    '- Done means `ready_for_user_review` or `failed_with_residuals`, with evidence.',
    '7. Hand you a local preview: `ready_for_user_review` or `failed_with_residuals`.',
    'Built for Node 22 users.',
    'Made for Python developers on Windows.',
    '目标用户是开发者。',
    '面向开发者的 Web 面板。',
    '面向开发者和安全团队的 Web 面板。',
    '适合研究人员、工程师与开发团队。',
    '定位为开发者和企业用户的会话视图。',
    '面向开发者 / 维护者 / 安全团队。',
    '适合开发者的会话视图。',
    '面向企业级应用场景。',
    '适合你。',
  ]) assert.equal(practicalEvidence(`# Demo\n${text}`).usecase_items, 0, text)

  const cjkPrefixes = ['面向', '适合', '适用于', '定位为', '目标用户是']
  const cjkIdentityGroups = ['开发者', '安全团队', '研究人员、工程师与开发团队', '开发者和企业用户', '开发者 / 维护者 / 安全团队']
  const cjkIdentitySurfaces = ['', '的 Web 面板', '的会话视图', '的本地工具']
  for (const prefix of cjkPrefixes) {
    for (const group of cjkIdentityGroups) {
      for (const surface of cjkIdentitySurfaces) {
        const text = `${prefix}${group}${surface}。`
        assert.equal(practicalEvidence(`# Demo\n${text}`).usecase_items, 0, text)
      }
    }
  }

  const wrappers = [
    (text) => text,
    (text) => `- ${text}`,
    (text) => `1. ${text}`,
    (text) => `> ${text}`,
    (text) => `**${text}**`,
    (text) => `<p><strong>${text}</strong></p>`,
  ]
  for (const text of ['Built for developers.', '面向开发者的 Web 面板。']) {
    for (const wrap of wrappers) assert.equal(practicalEvidence(`# Demo\n${wrap(text)}`).usecase_items, 0, wrap(text))
  }
  for (const text of ['Designed for developers auditing failed releases.', '面向审查失败发布的开发者提供 Web 面板。']) {
    for (const wrap of wrappers) assert.equal(practicalEvidence(`# Demo\n${wrap(text)}`).usecase_items, 1, wrap(text))
  }
})

test('explicitly own Chinese plugin inventory headings route capability without crediting catalogs', () => {
  for (const heading of ['运行时插件（两个）', '内置插件', '本项目插件', '包含两个插件']) {
    const evidence = practicalEvidence(`# Demo
## ${heading}
| 插件 | 作用 | 挂载平面 |
|---|---|---|
| audit | 校验签名报告并写入回执 | 宿主 |
| search | 搜索本地证据索引 | 宿主 |
`)
    assert.equal(evidence.capability_items, 1, heading)
    assert.equal(evidence.reliability_items, 1, heading)
  }

  const catalog = practicalEvidence(`# Demo
## 精选插件榜
| 插件 | 作用 |
|---|---|
| audit | 校验签名报告并写入回执 |
| search | 搜索本地证据索引 |
`)
  assert.equal(catalog.capability_items, 0)
})

test('main-path prose requires concrete semantics and rejects length or marketing farming', () => {
  const filler = Array.from({ length: 14 }, (_, index) => `The tool delivers a smooth experience for everyday productivity workflows number ${index}.`).join('\n\n')
  const marketing = Array.from({ length: 12 }, (_, index) => `This is the world's best and most powerful plugin trusted by developers everywhere, edition ${index}.`).join('\n\n')
  const capability = practicalEvidence(`# Demo\n## Features\n${filler}\n${marketing}`)
  const usageFiller = practicalEvidence(`# Demo\n## Usage\n${filler}`)
  const real = practicalEvidence(`# Demo\n## Features\nThe service provides local semantic search and exports signed JSON reports.\n## Usage\nOpen the workspace view and select a completed session.`)
  assert.equal(capability.capability_items, 0)
  assert.equal(usageFiller.usage_items, 0)
  assert.equal(real.capability_items, 1)
  assert.equal(real.usage_items, 1)
})

test('claim normalization collapses punctuation quotes and markdown-link variants', () => {
  const evidence = practicalEvidence(`# Demo
## Features
- Export reports as JSON
- Export reports as JSON.
- "Export reports as JSON"
- [Export reports as JSON](https://example.com/docs)
## Use cases
- EXPORT REPORTS AS JSON!
`)
  assert.equal(evidence.capability_items + evidence.usecase_items, 1)
})

test('configuration content cannot create usage items or actions', () => {
  const evidence = practicalEvidence(`# Demo
## Features
- Add OPENAI_API_KEY to your environment file to enable the provider.
- Enter your license key in the settings dialog to activate offline mode.
## Usage
Set the timeout value in your configuration file before running the command.
| Option | Default |
|---|---|
| theme | dark |
| timeout | 30 |
`)
  assert.equal(evidence.usage_actions, 0)
  assert.equal(evidence.usage_items, 0)
})

test('short explicit bilingual copies take per-dimension max', () => {
  const evidence = practicalEvidence(`# 中文
## 功能
- 导出审计报告
- 解析PDF文件
# English
## Features
- Export audit reports
- Parse PDF files
`)
  assert.equal(evidence.capability_items, 2)
})

test('endpoint IO has marginal value below cap without a three-row cliff', () => {
  for (const [rows, expected] of [[1, 1], [2, 2], [3, 3]]) {
    const body = Array.from({ length: rows }, (_, index) => `| \`GET /api/item/${index}\` | Returns JSON item ${index} |`).join('\n')
    const evidence = practicalEvidence(`# Demo\n## REST API\n| Endpoint | Response |\n|---|---|\n${body}`)
    assert.equal(evidence.io_pairs, expected, String(rows))
  }
})

test('fallback shares the semantic claim key and CJK compound actions reject noun prefixes', () => {
  const fallback = practicalEvidence(`# Demo
## 技术
- The token is encrypted at rest.
- Second benign capability bullet here.
`)
  const nouns = practicalEvidence(`# Demo
## Features
- 点击率：显示每个入口的转化统计
- 选中状态：高亮当前聚焦的条目
- 长按提示：显示快捷键帮助
`)
  const emptyTable = practicalEvidence('# Demo\n## Examples\n| Input | Output |\n|---|---|\n')
  const onePairTable = practicalEvidence('# Demo\n## Examples\n| Input | Output |\n|---|---|\n| foo | bar |\n')
  assert.equal(emptyTable.io_pairs, 0)
  assert.equal(onePairTable.io_pairs, 1)
  assert.equal(fallback.reliability_items, 1)
  assert.equal(fallback.capability_items, 0)
  assert.equal(nouns.usage_actions, 0)
})

test('meta headings avoid capability-name collisions and non-GitHub catalog links stay external', () => {
  for (const heading of ['License Plate Recognition', 'Release notes viewer', 'Roadmap visualization']) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n- Detect license plates and export JSON.\n`)
    assert.equal(evidence.capability_items, 1, heading)
  }
  const catalog = practicalEvidence(`# Demo
## Related tools
- [Parser](https://gitlab.com/owner/parser) — Parse PDFs and export JSON.
- [Guard](https://gitee.com/owner/guard) — Scan dependencies for vulnerabilities.
`)
  assert.equal(catalog.capability_items, 0)
})

test('developer fences, bare test-suite mentions, identity bullets and planned mockups add no evidence', () => {
  const evidence = practicalEvidence(`# Demo
- A fast CLI for developers and teams
## Build tools
\`\`\`sh
npm run compile
npm run bundle
\`\`\`
## Notes
- The repo has a test suite for contributors.
## Design direction
![planned dashboard mockup](docs/mock.png)
`)
  assert.equal(evidence.capability_items, 0)
  assert.equal(evidence.usage_actions, 0)
  assert.equal(evidence.reliability_items, 0)
  assert.equal(evidence.media, 0)
})

test('explicit capability predicates migrate only current-project claims', () => {
  const positive = practicalEvidence(`
# Demo
## Notes
- Supports local semantic search.
- Provides signed JSON audit reports.
- The runtime exposes a local status endpoint.
`)
  const guarded = practicalEvidence(`
# Demo
## Notes
- Coming soon: supports video export.
- Requires Node 22 and provides npm workspaces.
- README provides installation instructions.
- The documentation includes setup examples.
- This package includes example configurations.
- This package ships a LICENSE file.
- The repository includes a changelog.
- README includes API documentation.
- README includes usage examples.
- The documentation provides a quickstart guide.
- This repository ships source code and documentation.
- [Parser](https://github.com/owner/parser) — provides PDF parsing.
- This project is not recommended and does not support offline use.
`)
  assert.equal(positive.capability_items, 3)
  for (const text of [
    'This repository includes a host instruction skill.',
    'This package includes an example classifier.',
    'This package provides a documentation parser.',
    'This project offers a sample manager.',
  ]) assert.equal(practicalEvidence(`# Demo\n## Notes\n- ${text}`).capability_items, 1, text)
  assert.equal(guarded.capability_items, 0)
})

test('CJK compound actions require an operational verb start and punctuation', () => {
  const operational = practicalEvidence(`
# Demo
## Features
- 拖动角色：调整显示位置
- 单击角色：触发状态反馈
- 点击活跃会话：切换聚焦会话
`)
  const nouns = practicalEvidence(`
# Demo
## Features
- 按钮状态会持久化保存
- 按键映射支持自定义
- 滚动条样式跟随主题
- 单击与双击事件均转发到宿主页面
`)
  const install = practicalEvidence('# Demo\n## 安装\n- 双击安装包：运行 setup.exe')
  assert.equal(operational.usage_actions, 3)
  assert.equal(nouns.usage_actions, 0)
  assert.equal(install.usage_actions, 0)
})

test('inverse when-to-use and persona headings route to use cases before generic usage', () => {
  for (const [heading, bullets] of [
    ['Use this plugin when', ['you need a local audit.', 'you want a signed report.']],
    ['什么时候该用 ForkProbe', ['需要比较候选技能。', '需要先试跑再选择。']],
    ['Who is it for?', ['Teams maintaining production services with strict contracts.', 'Reviewers approving releases in regulated environments.']],
  ]) {
    const evidence = practicalEvidence(`# Demo\n## ${heading}\n${bullets.map((item) => `- ${item}`).join('\n')}\n`)
    assert.equal(evidence.usecase_items, 2, heading)
    assert.equal(evidence.usage_items, 0, heading)
  }
})

test('use-it-when tables count scenarios but command tables and compatibility headings do not', () => {
  const scenarios = practicalEvidence(`
# Demo
## Skills
| Skill | Use it when |
|---|---|
| Audit | You need a signed release receipt |
| Compare | You need to compare candidates |
`)
  const commands = practicalEvidence(`
# Demo
## Command reference
| Task | Command |
|---|---|
| Audit | \`demo audit\` |
| Export | \`demo export\` |
`)
  const compatibility = practicalEvidence(`
# Demo
## 适用平台
- macOS 14
- Windows 11
`)
  const troubleshooting = practicalEvidence(`
# Demo
## When things go wrong
- Retry after the service recovers.
`)
  assert.equal(scenarios.usecase_items, 2)
  assert.equal(commands.usecase_items, 0)
  assert.equal(compatibility.usecase_items, 0)
  assert.equal(troubleshooting.usecase_items, 0)
})

test('code blocks remain examples unless their heading is a command reference', () => {
  const example = practicalEvidence(`
# Demo
## Usage
\`\`\`bash
npm install demo
demo audit ./release --json
demo export report.json
\`\`\`
`)
  const reference = practicalEvidence(`
# Demo
## CLI
\`\`\`bash
npm install demo
demo audit ./release --json
demo export report.json
\`\`\`
`)
  assert.equal(example.usage_actions, 0)
  assert.equal(example.code_examples, 1)
  assert.equal(reference.usage_actions, 2)
})

test('capability prose recognizes bounded subject verbs and CJK bold labels', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
The runtime persists run state and writes each result to a local receipt.
The package bundles its own workflow definitions for offline review.

**交互式 UI** — 内联渲染图表、表格和进度视图。

**编排能力** — Subagent 并行委派，并记录每个阶段的结果。
`)
  assert.equal(evidence.capability_items, 3)

  const excluded = practicalEvidence(`
# Demo
## Configuration
The package writes each provider key to a configuration file.
**API Key** — 设置服务访问密钥。
## Sponsors
**Cloud Vendor** — 提供稳定、全面的模型 API。
`)
  assert.equal(excluded.capability_items, 0)
})

test('quoted natural-language prompts count only inside usage guidance', () => {
  const usage = practicalEvidence(`
# Demo
## Quick start
> *"Make me a collage video about street food."*
`)
  const capability = practicalEvidence(`
# Demo
## Features
> *"Make me a collage video about street food."*
`)
  const notes = practicalEvidence(`
# Demo
## Notes
> *"Make me a collage video about street food."*
`)
  const slogan = practicalEvidence(`
# Demo
## Quick start
> *"The best agent experience for everyone."*
`)
  const actionSlogan = practicalEvidence(`
# Demo
## Quick start
> *"Build the future today."*
> *"Create a better tomorrow."*
> *"Generate endless possibilities."*
> *"Create amazing experiences."*
> *"Run faster today."*
> *"Run efficiently."*
> *"Write something."*
> *"Make it happen."*
> *"Write the future."*
> *"创建美好未来。"*
> *"运行更快。"*
> *"渲染得更漂亮。"*
> *"生成无限可能。"*
`)
  const cjkPrompt = practicalEvidence(`
# Demo
## 快速开始
> *"生成一份本地审计报告。"*
> *"分析这些日志并总结失败原因。"*
`)
  assert.equal(usage.usage_items, 1)
  assert.equal(usage.usage_actions, 1)
  assert.equal(cjkPrompt.usage_items, 2)
  assert.equal(cjkPrompt.usage_actions, 2)
  assert.equal(slogan.usage_items, 0)
  assert.equal(slogan.usage_actions, 0)
  assert.equal(actionSlogan.usage_items, 0)
  assert.equal(actionSlogan.usage_actions, 0)
  assert.equal(capability.usage_items, 0)
  assert.equal(capability.usage_actions, 0)
  assert.equal(notes.usage_items, 0)
  assert.equal(notes.usage_actions, 0)
})

test('numbered process fences count only in explanation capability sections', () => {
  const process = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
topic
  ├─ 1. beat map        pick an arc → write beats.json
  ├─ 2. keyframes       render one poster per beat
  ├─ 3. motion          animate each poster
  └─ final.mp4
\`\`\`
`)
  assert.equal(process.capability_items, 3)

  for (const heading of ['Usage', 'Examples', 'How installation works', 'Development']) {
    const evidence = practicalEvidence(`# Demo
## ${heading}
\`\`\`text
1. install the package
2. configure API_KEY
3. deploy the service
\`\`\`
`)
    assert.equal(evidence.capability_items, 0, heading)
  }

  const proseFence = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
The system is fast and delightful.
The system is powerful and modern.
\`\`\`
`)
  const numberedMarketing = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
1. fast and delightful
2. powerful and modern
3. seamless experience
\`\`\`
`)
  const numberedNouns = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
1. Planning
2. Execution
3. Results
\`\`\`
`)
  const oneRealStage = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
1. render the signed report
\`\`\`
`)
  const cjkRealStages = practicalEvidence(`
# Demo
## 工作原理
\`\`\`text
1. 生成审计报告
2. 分析失败日志
\`\`\`
`)
  const verbOnlyStages = practicalEvidence(`
# Demo
## How a run works
\`\`\`text
1. run
2. build
3. render
4. run fast
5. run efficiently
6. write something
7. build the future
8. create amazing experiences
9. render beautifully
10. generate endless possibilities
11. write better
12. 运行更快
13. 渲染得更漂亮
14. 生成无限可能
\`\`\`
`)
  assert.equal(proseFence.capability_items, 0)
  assert.equal(numberedMarketing.capability_items, 0)
  assert.equal(numberedNouns.capability_items, 0)
  assert.equal(verbOnlyStages.capability_items, 0)
  assert.equal(oneRealStage.capability_items, 1)
  assert.equal(cjkRealStages.capability_items, 2)
})

test('top-level documentation can expose explicit own features without reopening doc catalogs', () => {
  const ownFeatures = practicalEvidence(`
# Demo
## Documentation
### Key Features
- **Security Guard**: Blocks dangerous shell commands.
- **RAM Monitoring**: Prevents memory exhaustion with bounded limits.
- **Async execution**: Supports concurrent calls for multi-client workflows.
`)
  assert.equal(ownFeatures.capability_items, 2)
  assert.equal(ownFeatures.reliability_items, 1)

  const documentationOnly = practicalEvidence(`
# Demo
## Documentation
### Key Features
- Read the full guide.
- Browse API docs.
- See examples.
`)
  assert.equal(documentationOnly.capability_items, 0)

  const nestedMarketing = practicalEvidence(`
# Demo
## Documentation
### Key Features
#### Why it is great
- The best seamless modern experience.
- Powerful and delightful for everyone.
`)
  assert.equal(nestedMarketing.capability_items, 0)

  const catalog = practicalEvidence(`
# Demo
## Documentation
### Key Features
- [External parser](https://github.com/owner/parser) — parses PDF files.
### Core Documentation
- [Complete docs](https://example.com/docs) — all features and examples.
`)
  assert.equal(catalog.capability_items, 0)

  const nestedInstall = practicalEvidence(`
# Demo
## Install
### Documentation
#### Key Features
- Supports concurrent calls for multi-client workflows.
`)
  assert.equal(nestedInstall.capability_items, 0)
})

test('heading-trusted structures reject marketing plans requirements and abstract actions', () => {
  const evidence = practicalEvidence(`
# Demo
## Features
- Powerful and delightful for everyone.
- The ultimate modern experience.
- Coming soon: automatic reports.
- Planned: team dashboards.
- Requires Node.js 22.
- Needs an API token.
| Feature | Description |
|---|---|
| Magic | The ultimate experience |
| Future | Build the future today |
## Usage
| Step | Description |
|---|---|
| Dream | Create amazing experiences |
| Speed | Run faster |
## Use cases
1. Powerful future
2. Amazing experience
3. Better tomorrow
4. Seamless magic
5. Endless possibilities
6. Delightful world
## Results
The ultimate modern experience for everyone.
## Reliability
The ultimate modern experience for everyone.
## 功能
- 强大、现代、无缝的极致体验。
- 面向每个人的美好未来。
## 使用
| 步骤 | 说明 |
|---|---|
| 梦想 | 创建美好未来 |
| 奇迹 | 运行得更快 |
`)
  assert.equal(evidence.capability_items, 0)
  assert.equal(evidence.usage_items, 0)
  assert.equal(evidence.usage_actions, 0)
  assert.equal(evidence.usecase_items, 0)
  assert.equal(evidence.output_items, 0)
  assert.equal(evidence.reliability_items, 0)
})

test('global actions require a concrete object and usecase numbering is not an action', () => {
  const abstract = practicalEvidence(`
# Demo
## Quick start
- Create the future today.
- Run faster.
- Open it.
- Run this.
## Use cases
1. Powerful future
2. Amazing experience
`)
  const concrete = practicalEvidence(`
# Demo
## Quick start
1. Open the audit panel.
2. Run a local audit.
3. Create a signed report.
`)
  assert.equal(abstract.usage_actions, 0)
  assert.equal(concrete.usage_actions, 3)
})

test('generic fenced command harvesting stays inside usage and external package rows stay external', () => {
  const architecture = practicalEvidence(`
# Demo
## Architecture
\`\`\`text
demo run first
demo run second
\`\`\`
`)
  const usage = practicalEvidence(`
# Demo
## Common tasks
\`\`\`text
demo run first
demo run second
\`\`\`
`)
  const external = practicalEvidence(`
# Demo
## Features
- [npm package](https://www.npmjs.com/package/external-demo) — parses PDF files.
- [HF model](https://huggingface.co/owner/model) — generates reports.
`)
  assert.equal(architecture.usage_actions, 0)
  assert.equal(usage.usage_actions, 2)
  assert.equal(external.capability_items, 0)
})

test('enumerated own workflow headings expose module behavior without generic workflow fallback', () => {
  for (const heading of ['4 模块工作流', '四大阶段工作流', 'Four-stage workflow']) {
    const evidence = practicalEvidence(`# Demo
## ${heading}
- Bilingual search-query planning.
- Candidate aggregation and top-five ranking.
- Dependent-claim evidence expansion.
`)
    assert.equal(evidence.capability_items, 3, heading)
  }

  const generic = practicalEvidence('# Demo\n## Workflow\n- Bilingual search-query planning.\n')
  assert.equal(generic.capability_items, 0)
})

// ===== 冻结评审修复钉死回归（parser revision 3，2026-09-09 repair round 1）=====
// 对应 freeze-adjudication.md：owner F-2 / adversarial F-2 / adversarial-fresh2 F1·F2 / owner-fresh2 F1

test('repair: roadmap bullets under capability heading contribute zero (owner F-2)', () => {
  const evidence = practicalEvidence('# Demo\n\n## Features\n\n- Will add support for PDF export in a future release\n- Will ship a dashboard next quarter\n- Reads CSV files and produces per-column summaries\n')
  assert.equal(evidence.capability_items, 1)
  assert.equal(evidence.parser_revision, 3)
})

test('repair: neutral filler paragraphs under reliability heading contribute zero (adversarial F-2)', () => {
  const fillers = Array.from({ length: 10 }, (_, i) => 'Paragraph ' + String(i + 1) + ' mentions the project.').join('\n')
  const evidence = practicalEvidence('# Demo\n\n## Reliability\n\n' + fillers + '\n')
  assert.equal(evidence.reliability_items, 0)
})

test('repair: neutral filler paragraphs under use cases heading contribute zero, real scenario still counts (owner F-3)', () => {
  const fillers = Array.from({ length: 10 }, (_, i) => 'Item number ' + String(i + 1) + ' is listed here.').join('\n')
  const farmed = practicalEvidence('# Demo\n\n## Use cases\n\n' + fillers + '\n')
  assert.equal(farmed.usecase_items, 0)
  const real = practicalEvidence('# Demo\n\n## Use cases\n\nUse this to audit a release before deployment.\n' + fillers + '\n')
  assert.ok(real.usecase_items >= 1, 'real scenario must still count')
})

test('repair: neutral filler paragraphs under output heading contribute zero (adversarial F-2)', () => {
  const fillers = Array.from({ length: 8 }, (_, i) => 'Output paragraph ' + String(i + 1) + ' text.').join('\n')
  const evidence = practicalEvidence('# Demo\n\n## Output\n\n' + fillers + '\n')
  assert.equal(evidence.output_items, 0)
})

test('repair: identity bullets under why/motivation heading contribute zero half-credit (adversarial-fresh2 F1)', () => {
  const identityBullets = ['- For developers and teams.', '- Built for professionals.', '- For users who want speed.'].join('\n')
  const evidence = practicalEvidence('# Demo\n\n## Why\n\n' + identityBullets + '\n')
  assert.equal(evidence.usecase_items, 0)
})

test('repair: cjk punctuation-qualified and preference-only personas contribute zero, task personas count (adversarial-fresh2 F2 / adversarial F-3)', () => {
  const zero = practicalEvidence('# Demo\n\n## 使用场景\n\n- 适合：专业人士\n- 适合喜欢快速的工具的用户\n')
  assert.equal(zero.usecase_items, 0)
  const concrete = practicalEvidence('# Demo\n\n## 使用场景\n\n- 适合需要批量重命名一万份文件的用户\n')
  assert.ok(concrete.usecase_items >= 1, 'concrete task persona must still count')
})

test('repair: bare release-channel label table rows contribute zero capability (owner-fresh2 F1)', () => {
  const evidence = practicalEvidence('# Demo\n\n## Features\n\n| Stable | Beta |\n| --- | --- |\n| 1.0 | 1.1 |\n')
  assert.equal(evidence.capability_items, 0)
})

// ===== 修复轮 2 钉死回归（lock-repair-1 → lock-repair-2）=====
test('repair2: TODO-prefixed roadmap bullets contribute zero (owner I-1)', () => {
  const evidence = practicalEvidence('# Demo\n## Features\n- TODO: oauth integration\n- Will ship a new dashboard\n- We will build mobile support\n- We will extend the API\n- We will improve performance\n- We will release new themes\n- Roadmap: rewrite in Rust\n')
  assert.equal(evidence.capability_items, 0)
})

test('repair2: subjective-quality praise bullets contribute zero in three families (adversarial I-2)', () => {
  const fills = ['The tool feels smooth and fast today.', 'Its layout stays clean in daily use.', 'A pleasant workflow for everyone involved.', 'Polished details make it stand out.', 'Simple design with an elegant touch.', 'A tidy interface keeps things calm.', 'Nice colors and balanced spacing.', 'Gentle learning curve for new users.', 'Refreshed look across every screen.', 'A calm rhythm guides each task.', 'Soft accents improve visual comfort.', 'A quiet layout reduces clutter.']
  const md = ['# Demo\n## Use cases\n' + fills.map((f0) => '- ' + f0).join('\n') + '\n'].join('')
  const uc = practicalEvidence(md)
  assert.equal(uc.usecase_items, 0)
  const rel = practicalEvidence('# Demo\n## Reliability\n' + fills.map((f0) => '- ' + f0).join('\n') + '\n')
  assert.equal(rel.reliability_items, 0)
})

test('repair2: identity bullets with trailing digits contribute zero (adversarial I-3)', () => {
  const ids = Array.from({ length: 11 }, (_, i) => '- Built for professionals ' + i).join('\n')
  const evidence = practicalEvidence('# Demo\n## Use cases\n' + ids + '\n')
  assert.equal(evidence.usecase_items, 0)
})

test('repair2: cjk solution-suffix personas contribute zero (adversarial M-1)', () => {
  const evidence = practicalEvidence('# Demo\n## 使用场景\n- 面向人士的解决方案\n')
  assert.equal(evidence.usecase_items, 0)
})

test('repair2: functional feature bullets without planned prefix still count (adversarial M-2 boundary)', () => {
  const evidence = practicalEvidence('# Demo\n## Features\n- Nightly report scheduler for batch jobs\n')
  assert.ok(evidence.capability_items >= 1, 'real feature must not be killed by roadmap gate')
})

// ===== 修复轮 3 钉死回归（lock-repair-3）=====
test('repair3: CJK todo/planning bullets contribute zero reliability via migrated path (adversarial I-1)', () => {
  const evidence = practicalEvidence('# Demo\n## 可靠性\n- 待办：为失败的导出增加重试与告警日志。\n- 计划中：支持导出加密归档。\n')
  assert.equal(evidence.reliability_items, 0)
})

test('repair3: planning-to SSO promise contributes zero capability (adversarial I-2)', () => {
  const evidence = practicalEvidence('# Demo\n## Features\n- We are planning to add SSO support next quarter.\n')
  assert.equal(evidence.capability_items, 0)
})

test('repair3: preamble roadmap bullets contribute zero capability (owner I1)', () => {
  const evidence = practicalEvidence('# Demo\n- Coming soon: SSO integration\n- Will add audit trails\n## Features\n- Parses input files and produces structured reports.\n')
  assert.equal(evidence.capability_items, 1)
})

test('repair3: domain-qualified pure identity personas contribute zero (owner I2 / adversarial I-3)', () => {
  const evidence = practicalEvidence('# Demo\n## 使用场景\n- 适合金融投资人士。\n- 面向广告营销人士。\n')
  assert.equal(evidence.usecase_items, 0)
})

test('repair3: feature names with Planned prefix count again (C1/I-4 positive control)', () => {
  const evidence = practicalEvidence('# Demo\n## Features\n- Planned report scheduler for nightly jobs\n- Future-proof config format\n')
  assert.ok(evidence.capability_items >= 1, 'feature names with planned/future prefix must not be mis-killed')
})

test('repair3b: reliability prose privacy/boundary lines count via RELIABILITY_PROSE_FACT_RE', () => {
  const evidence = practicalEvidence('# Demo\n## Reliability\n\nNever logs your data or shares telemetry with third parties.\n\nIs not supported on legacy browsers without WSL installed.\n')
  assert.ok(evidence.reliability_items >= 2, 'privacy/boundary prose must count as reliability')
})

test('repair: parser revision bumped to 3', () => {
  assert.equal(README_PRACTICAL_PARSER_REVISION, 3)
  assert.equal(README_PRACTICAL_VERSION, 3)
})

