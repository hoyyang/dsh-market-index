const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/
const README_MAX_CHARS = 200_000
const HEADING_SUFFIX = String.raw`(?:$|\s|[:：/|&+、,()（）—-])`
const STRICT_HEADING_SUFFIX = String.raw`(?:$|[:：/|&+、,()（）—-])`
const INSTALL_HEADING_RE = new RegExp(String.raw`^(?:install(?:ation)?|setup|deploy(?:ment)?|安装|部署|セットアップ|インストール|설치|instalaci[oó]n|instala[cç][aã]o|установка)${HEADING_SUFFIX}`, 'i')
const CONFIG_HEADING_RE = new RegExp(String.raw`^(?:config(?:ure|uration)?|settings?|environment variables?|配置|设置|環境変数|設定|구성|설정|configuraci[oó]n|konfiguration|configura[cç][aã]o|конфигурация|настройка)${HEADING_SUFFIX}`, 'i')
// 只排除明确的元信息标题；不能用前缀式 `support/docs/about` 吞掉
// "Support matrix"、"Documentation architecture"、"About + 具体能力" 等实证章节。
const EXCLUDED_HEADING_RE = new RegExp(String.raw`^(?:table of contents|contents|acknowledgements?|see also|related(?: projects?)?|links?|awesome|resources?|support|contact|credits|thanks|thank you|sponsors?|donate|community|documentation|docs|目录|目次|许可证|许可|贡献|致谢|更多|相关(?:项目)?|链接|资源|支持|联系|社区|感谢|赞助|作者|免责声明|参考资料|목차|라이선스|contribui[cç][aã]o|licen[cç]a|лицензия)${STRICT_HEADING_SUFFIX}`, 'i')
const META_HEADING_RE = /^(?:(?:project|product|development)\s+)?(?:changelog|change log|roadmap|release notes?|star history|license|licence|contributing|contributors?|for contributors?|community and contributing|acknowledgements?|sponsors?|donate|(?:☕\s*)?赞赏支持(?:\s*\/\s*sponsor)?|更新日志|路线图|版本记录|发布说明|许可证|许可|贡献|贡献者|致谢|赞助|변경 로그|로드맵|라이선스)(?:$|[:：/|&+、,()（）—-])/i
const SOFT_USECASE_HEADING_RE = /(?:^|\s)(?:why|motivation|problem|为什么|为何|动机|なぜ|왜|por qu[eéê]|pourquoi|warum|зачем)(?:$|\s|[:：/|&+、,()（）—-])/i
const SOFT_OUTPUT_HEADING_RE = /(?:^|\s)(?:preview|(?:界面|在线|效果)?预览|プレビュー|미리보기)(?:$|\s|[:：/|&+、,()（）—-])/i
const MARKDOWN_LINK_HEADING_RE = /^\s*\[[^\]]+\]\([^)]+\)\s*$/
const EXPLANATION_HEADING_RE = /(?:^how (?:(?:it|this)|(?:(?:an?|the|our|your)\s+)?[a-z0-9][\w-]*(?:\s+[a-z0-9][\w-]*){0,4}) works?(?:$|\s|[:：/|&+、,()（）—-])|^(?:它怎么工作|如何工作|工作原理|[^\s]{1,24}工作原理)(?:$|\s|[:：/|&+、,()（）—-]))/i
const SETUP_EXPLANATION_HEADING_RE = /^how\b.{0,60}\b(?:setup|install(?:ation)?|config(?:uration)?|deploy(?:ment)?)\b.{0,60}\bworks?\b/i
const WORK_MODE_HEADING_RE = /^(?:(?:[一二三四五六七八九十百\d]+)(?:个|种)?工作模式|(?:work|operating|execution) modes?)(?:$|\s|[:：/|&+、,()（）—-])/i
const OWN_WORKFLOW_HEADING_RE = /^(?:(?:[一二两三四五六七八九十百\d]+)\s*(?:个|大)?\s*(?:模块|阶段|步骤)(?:内部)?工作流|(?:[a-z]+|\d+)[- ](?:stage|module) workflow)(?:$|\s|[:：/|&+、,()（）—-])/i
const OWN_PLUGIN_INVENTORY_HEADING_RE = /^(?:(?:运行时|内置|自带|本项目(?:的)?)插件|包含(?:了|的)?[一二两三四五六七八九十百\d]+(?:个|款|种)?插件)(?:$|\s|[:：/|&+、,()（）—-])/i
const DOCUMENTATION_PARENT_HEADING_RE = /^(?:documentation|docs)$/i
const DOCUMENTATION_CAPABILITY_CHILD_RE = /^(?:(?:key|core|main)\s+)?(?:features?|capabilit(?:y|ies))$|^(?:(?:核心|主要))?(?:功能|特性|能力)$/i
const DOCUMENTATION_FEATURE_ITEM_RE = /^\s*(?:[-+*]|\d+[.)])\s+(?:\*\*[^*\n]{2,80}\*\*|`[^`\n]{2,80}`)\s*(?:[-–—:：]\s*)?(?:blocks?|prevents?|supports?|captures?|reports?|guards?|allows?|provides?|exposes?|adds?|registers?|integrates?|connects?|runs?|generates?|renders?|records?|searches?|indexes?|manages?|阻止|防止|支持|捕获|报告|保护|允许|提供|暴露|添加|注册|集成|连接|运行|生成|渲染|记录|搜索|索引|管理)(?:\b|[：:、，。\s])/i
const OWN_CREATION_TUTORIAL_HEADING_RE = /^(?:(?:从零(?:开始)?(?:生成|制作|创建)|用[^。；\n]{1,32}(?:做|制作|生成|创建))你自己的[^。；\n]{1,40}|(?:build|create|make) your own\b.{0,60})(?:$|\s|[:：/|&+、,()（）—-])/i
const TIMED_OPERATIONAL_START_HEADING_RE = /^(?:\d+[- ]?(?:second|minute)s? start|try it in (?:one|two|three|four|five|\d+) minutes?)(?:$|\s|[:：/|&+、,()（）—-])/i
const STRONG_RUNNABLE_LINE_RE = /(?:(?:^|\s)(?:--?[\w-]+(?:=[^\s#]+)?|\.?\.?\/[\w./:{}$&=<>\[\]@|-]+|[\w-]+\.(?:json|ya?ml|toml|md|html?|pdf|csv|js|mjs|cjs|ts|tsx|py|sh))\b|^(?:await\s+)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\([^\n]*\)\s*;?$|^\/[\w:-]+(?:\s+\S.*)?$)/i
const COMMAND_HEADING_RE = /^(?:(?!(?:one|a|the|single|each|every|this|your|their|its|any|no|with|per|my|our|another|new)\s)[\w./-]+\s+)?(?:cli|command line|commands?|command reference|命令(?:说明|列表|大全|参数|速查)?|命令行参数|命令\s*[/／]\s*commands?)$/i
const TOOL_REFERENCE_HEADING_RE = /(?:^|\s)(?:tools?|tool reference|available tools?|commands?|工具|工具列表|命令)(?:$|\s|[:：/|&+、,()（）—-])/i
const COMMAND_TABLE_CELL_RE = /^(?:`(?:\/[\w:-]+(?:\s+[^|`]{1,80})?|(?:GET|POST|PUT|PATCH|DELETE)\s+\/[\w./{}$&=?:-]+|[a-z][\w.@/-]*(?:\s+[\w./:{}$&=<>\[\]@-]+){1,6})`|\/[\w:-]+(?:\s+[^|]{1,80})?|(?:GET|POST|PUT|PATCH|DELETE)\s+\/[\w./{}$&=?:-]+)$/i
const TOOL_TABLE_CELL_RE = /^`[a-z][\w.:-]{2,}`$/i
const BARE_COMMAND_LINE_RE = /^(?:\/[\w:-]+(?:\s+[^#]{0,120})?|[a-z][\w.@/-]*(?:\s+(?:--?[\w-]+(?:=[^\s#]+)?|[\w./:{}$&=<>\[\]@|-]+|"[^"]{1,60}"|'[^']{1,60}')){0,8})(?:\s+#\s*\S.*)?$/
const API_HEADING_RE = /(?:^|\s)(?:api|rest|http|endpoints?|interfaces?|接口|端点|协议)(?:$|\s|[:：/|&+、,()（）—-])/i
const REPO_HOST_PATH = String.raw`(?:github\.com|gitlab\.com|gitee\.com|bitbucket\.org|codeberg\.org)\/[^/)\s]+\/[^/)#\s]+`
const PACKAGE_HOST_PATH = String.raw`(?:npmjs\.com/package/[^/)\s]+|huggingface\.co/(?:spaces/|datasets/)?[^/)\s]+/[^/)#\s]+)`
const EXTERNAL_PROJECT_PATH = String.raw`(?:${REPO_HOST_PATH}|${PACKAGE_HOST_PATH})`
const CATALOG_TABLE_ROW_RE = new RegExp(String.raw`\[[^\]]+\]\(https?:\/\/(?:www\.)?${EXTERNAL_PROJECT_PATH}[^)]*\)`, 'i')

const HEADING_KIND_RE = {
  // v3 新增：providers/model pools/path picker/path handling 及同类"能力名标题"
  capability: /(?:features?|highlights?|capabilit(?:y|ies)|what (?:it|this) does|what (?:it|this) is|what is|what are|what you get|what'?s in the box|overview|core|components?|architecture|tools?|plugins?|\bcli\b|\bcommands?\b|api|interfaces?|endpoints?|metrics?|protocol|providers?|model pools?|(?:file|folder|directory|path) pick(?:er|ing)?|path (?:handling|management)|routing|handlers?|功能|特性|特点|能力|特色|主要功能|亮点|核心|组件|组成|架构|工具|命令|接口|指标|协议|提供什么|能做什么|它做什么|是什么|已实现|機能|特徴|概要|構成|ツール|コマンド|기능|특징|개요|구성|도구|명령|funciones?|caracter[ií]sticas|resumen|componentes?|herramientas?|comandos?|fonctionnalit[eé]s?|aperçu|composants?|outils?|commandes?|funktionen?|überblick|komponenten?|werkzeuge?|befehle|recursos|vis[aã]o geral|ferramentas?|возможности|функции|обзор|компоненты|инструменты|команды)/i,
  // v3 新增：Use / Use it / Quickstart / CLI guide / Common commands
  usage: /(?:quick\s*start|getting started|get started|start here|examples?|tutorials?|walkthrough|how (?:it|to) works?|how to (?:use|start)|usage|\buse(?: it| the (?:cli|app|tool))?\b|guide(?: for humans)?|cookbook|benchmark document|run (?:it|locally)|launch|common (?:tasks?|commands?)|command reference|操作|玩法|快速开始|快速上手|三步上手|开始使用|跑起来|接入|使用|用法|怎么用|使用方式|使用说明|使用指南|上手指南|操作指南|使用指引|快速使用|使用教程|使用示例|示例|教程|使用方法|操作步骤|命令行(?:$|[（(:：])|使い方|クイックスタート|例|チュートリアル|빠른 시작|사용 예|예제|사용법|inicio r[aá]pido|ejemplos?|tutoriales?|gu[ií]a|d[eé]marrage rapide|exemples?|tutoriel|schnellstart|beispiele?|anleitung|in[ií]cio r[aá]pido|exemplos?|быстрый старт|руководство|примеры|использование)/i,
  // 明确场景/案例走主通道；Why/Motivation 另以半权重条目通道处理。
  usecase: /(?:use cases?|case stud(?:y|ies)|practice cases?|scenarios?|when to use|\buse\b.{0,32}\bwhen\b|who (?:is|are) (?:it|this) for\??|applications?|best for|(?:example|sample|user) requests?|choose your (?:journey|path)|stor(?:y|ies)\s*\d+|(?:应用|使用)?场景|用例|案例|适用(?!平台|环境|版本|范围|系统|机型)|什么时候(?:该|适合)?用|何时(?:该|适合)?用|适合谁|给谁用|解决什么问题|实战(?:展示|案例)|適用例|ユースケース|シナリオ|사용 사례|시나리오|casos? de uso|escenarios?|cas d['’]usage|sc[eé]narios?|szenarien|anwendungsf[aä]lle|cen[aá]rios?|сценарии|варианты использования)/i,
  // v3 新增：What you'll see（撇号形式）；What you will see / What you see 兼容
  output: /(?:^|\s)(?:demo|showcase|preview|screenshots?|results?|outputs?|output artifacts?|storage structure|display surfaces?|result metadata|see it work|what (?:you(?:'ll| will)? see|a session looks like)|status|效果展示|运行效果|输出示例|运行结果|效果演示|效果|演示|截图|输出|结果|预览|你会看到什么|状态|デモ|スクリーンショット|出力|結果|출력|결과|데모|스크린샷|demostraci[oó]n|capturas?|resultados?|salida|résultats?|démo|captures?|sortie|ergebnisse?|ausgabe|demonstra[cç][aã]o|sa[ií]da|результат|демо|скриншот|вывод)(?:$|[:：/|&+、,()（）—-])/i,
  // v3 新增：Safety
  reliability: /(?:reliability|troubleshoot(?:ing)?|(?:(?:known|current|platform|usage|operational)\s+)?(?:limits|limitations?)\b|compatibility|faq|known issues?|debug(?:ging)?|caveats?|platform notes?|runtime requirements?|tests?|verification|validation|acceptance|security|safety|governance|constraints?|contract|故障|排错|(?:已知)?限制|暂不支持|兼容|常见问题|已知问题|已知边界|边界|注意事项|平台|测试|验证|验收|安全|治理|约束|契约|运行要求|环境要求|可靠性|トラブル|制限|互換|既知の問題|テスト|検証|セキュリティ|문제 해결|제한|호환|알려진 문제|테스트|검증|보안|soluci[oó]n de problemas|limitaciones|compatibilidad|problemas conocidos|pruebas?|verificaci[oó]n|seguridad|dépannage|limites|compatibilité|problèmes connus|vérification|sécurité|fehlerbehebung|einschränkungen|kompatibilität|bekannte probleme|überprüfung|sicherheit|solu[cç][aã]o de problemas|limita[cç][oõ]es|compatibilidade|problemas conhecidos|testes?|verifica[cç][aã]o|seguran[cç]a|устранение неполадок|ограничения|совместимость|известные проблемы|тесты|проверка|безопасность)/i,
}

const INSTALL_COMMAND_RE = /(?:(?:npm|pnpm|yarn|pip|brew|cargo|uv)\s+(?:i|install|add)\b|dsh\s+plugin(?:\s+--[\w-]+(?:=\S+|\s+(?!add\b)\S+)?)*\s+add\b|npx\s+skills\s+add\b|git\s+clone\b|curl\s+[^\n]*install)/i
const DEVELOPER_CONTEXT_HEADING_RE = /(?:^(?:开发|打包|构建|发布)(?:命令|指南|流程|说明|工具)?$|(?:^|\s)(?:development|developer|building|build (?:commands?|tools?)|dev tools?|packaging|release commands?)(?:$|\s|[:：/|&+、,()（）—-]))/i
const GENERIC_USAGE_HEADING_RE = /^(?:usage|use|examples?|使用|用法|示例|例|使用示例)$/i
const INSTALL_STEP_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:install|installation|setup|configure|configuration|deploy|(?:下载)?安装|配置|部署|インストール|設定|설치|설정|instalar|instalaci[oó]n|configurar|installer|konfiguration|instala[cç][aã]o|configura[cç][aã]o|установ|настро)(?:(?:[^*\n]{0,12})?\*\*)?(?:\b|[：:、，。\s])/i
const INPUT_RE = /(?:\binput\b|\brequest\b|输入|请求|入力|입력|entrada|eingabe|ввод)\s*[:：]/i
const OUTPUT_RE = /(?:\boutput\b|\bresponse\b|输出|响应|出力|출력|salida|sortie|ausgabe|вывод)\s*[:：]/i
const TABLE_INPUT_HEADER_RE = /^(?:input|request|user action|action|event|decision|situation|scenario|use case|you|输入|请求|用户操作|操作|事件|决策|情况|场景)$/i
const TABLE_OUTPUT_HEADER_RE = /^(?:output|response|result|effect|behavior|what (?:happens|runs|you get|it does)|data effect|outcome|输出|响应|结果|效果|行为|实际执行|数据影响|会得到什么)$/i
const TABLE_USECASE_HEADER_RE = /^(?:task|scenario|use case|use it when|when to use|user request|job to be done|you need(?:…+)?|任务|场景|用例|使用时机|适合场景|用户请求|适用任务|你需要(?:…+)?)[？?]?$/i
const TABLE_METHOD_HEADER_RE = /^(?:method|verb|方法|请求方法)$/i
const TABLE_PATH_HEADER_RE = /^(?:path|endpoint|route|url|路径|端点|路由|接口)$/i
const API_RESULT_CELL_RE = /^(?:returns?|responds? with|outputs?|exports?|downloads?|streams?|creates?|返回|响应|输出|导出|下载|流式返回|创建)(?:\b|[：:、，。\s])/i
const BASIC_FLOW_HEADING_RE = /^(?:basic|typical|example) flow(?:$|\s|[:：/|&+、,()（）—-])/i
const QUOTED_PROMPT_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:>\s*)?[_*]{0,2}["“][^"”]{3,180}["”][_*]{0,2}\s*$/
const QUOTED_PROMPT_ACTION_RE = /^(?:make|create|build|generate|write|draft|render|compare|review|audit|analy[sz]e|summarize|find|search|show|list|explain|convert|export|check|inspect|login|log in|open|send|run|pick|click|select|choose|enter|type|use|ask|call|execute|start|press|drag|upload|add|help|tell|give|plan|design|translate|buy)\b/i
const QUOTED_PROMPT_CJK_ACTION_RE = /^(?:制作|创建|生成|写|起草|渲染|比较|审查|分析|总结|查找|搜索|展示|列出|解释|转换|导出|检查|打开|选择|点击|输入|上传|拖动|使用|调用|执行|启动|发送|运行|规划|设计|翻译)/
const PROMPT_GUIDANCE_HEADING_RE = /^(?:(?:good|example|sample|recommended)\s+)?prompts?(?:$|\s|[:：/|&+、,()（）—-])/i
const FLOW_STAGE_RE = /^\s*[│├└┬┼╰╭┌┐┘─━>+*=-]*\s*(?:step\s*)?\d{1,2}\s*[.)：:-]?\s+(.+)$/i
const FLOW_STAGE_OPERATION_RE = /\b(?:pick|write|render|animate|assemble|concat|burn|draft|generate|create|convert|export|produce|return|save|route|stream|sync|validate|verify|extract|transcribe|summarize|compare|analy[sz]e|detect|build|record|publish|parse|index|search|rank|filter|fetch|load|send|map|merge|transform|compile|run)\b|(?:选择|写入|渲染|动画|组装|拼接|生成|创建|转换|导出|保存|路由|同步|验证|提取|转录|总结|比较|分析|检测|构建|记录|发布|解析|索引|搜索|排序|过滤|抓取|加载|发送|映射|合并|运行)/i
const NON_OBJECT_ACTION_TAIL_RE = /^(?:(?:very|more|most)\s+)?(?:[a-z]+ly|fast(?:er)?|better|best|today|tomorrow|now|like magic)(?:\s+(?:today|tomorrow|now))?[.!?]*$/i
const VAGUE_ACTION_OBJECT_RE = /^(?:(?:it\s+(?:happen|work)|(?:something|anything|everything|stuff|things?)(?:\s+(?:useful|better|great|amazing))?|it|this|that)(?:\s+(?:today|tomorrow|now))?)[.!?]*$/i
const ABSTRACT_ACTION_OBJECT_RE = /^(?:(?:a|an|the|our|your|my)\s+)?(?:(?:better|best|brighter|new|endless|infinite|amazing|great|seamless|beautiful|modern|powerful|delightful|ultimate)\s+){0,3}(?:future|difference|possibilities|potential|experiences?|tomorrow|world|magic|success|dreams?|innovation|life|value|impact|growth|excellence|things?)(?:\s+(?:today|tomorrow|now|for everyone))?[.!?]*$/i
const MARKETING_BENEFIT_ADJECTIVE_RE = /\b(?:powerful|delightful|ultimate|seamless|amazing|incredible|awesome|beautiful|modern|best|better|endless)\b/i
const MARKETING_ABSTRACT_OBJECT_RE = /\b(?:everyone|future|experience|world|magic|possibilities|tomorrow|success|dream|innovation|life|value|impact|growth)\b/i
const AUDIENCE_ONLY_IDENTITY_RE = /^(?:(?:an?|the|our|your|this|that|it|\bis\b)\s+)*(?:[a-z][\w-]*\s+){0,5}(?:dashboard|panel|view|editor|timeline|stage|workspace|canvas|tool|plugin|app|platform)\s+(?:for|built for|made for)\s+(?:(?:everyone|anyone|anybody|everybody)|(?:[a-z][\w-]*\s+){0,2}(?:users?|developers?|teams?|enterprises?|companies?|organizations?|people|researchers?|engineers?|maintainers?|reviewers?|responders?|beginners?|professionals?|students?))[.!?]*$/i
const NON_OBJECT_ACTION_CJK_TAIL_RE = /^(?:得|地)?(?:更|很|非常|特别|越来越)?(?:快|慢|好|漂亮|高效|智能|强大|流畅|稳定|便捷|轻松|自动)(?:地|些|一点|一些)?[。！？]*$/
const VAGUE_ACTION_CJK_OBJECT_RE = /^(?:它|这个|那个|某个东西|一些东西|任何东西)(?:发生|工作|更好)?[。！？]*$/
const ABSTRACT_ACTION_CJK_OBJECT_RE = /^(?:一(?:份|个|段|篇|张|部|套|次))?(?:(?:更?美好|更好|无限|无尽|全新|最佳))?(?:未来|明天|梦想|可能性?|体验|世界|成功|奇迹|人生|价值|影响力|成长)(?:从现在开始|今天|明天)?[。！？]*$/
const ACTION_VERB_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:run|open|click|select|choose|enter|type|send|create|add|use|ask|call|execute|start|press|drag|upload|运行|打开|点击|选择|输入|发送|创建|添加|询问|提问|调用|执行|启动|按下|拖拽|上传|撤销|右键|触发|说|点|実行|開く|クリック|選択|入力|送信|作成|追加|呼び出|실행|열기|클릭|선택|입력|전송|생성|추가|호출|ejecuta|abre|haz clic|selecciona|introduce|env[ií]a|cr[eé]e|utiliza|ex[eé]cute|ouvrez|cliquez|sélectionnez|saisissez|envoyez|créez|utilisez|führen|öffnen|klicken|wählen|eingeben|senden|erstellen|verwenden|execute|abra|clique|selecione|digite|envie|crie|utilize|запуст|открой|нажм|выбер|введ|отправ|созда|использ)(?:\b|[：:、，。\s*`「“\"])/i
const CJK_ACTION_COMPOUND_START_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:点击|拖动|单击|双击|长按|粘贴|滚动|选中)/
const CJK_ACTION_NOUN_PREFIX_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:点击率|选中状态|长按提示)/
const CJK_ACTION_OPERATIONAL_PUNCT_RE = /[:：/、，。,（）()]/

function concreteActionTail(tail) {
  const value = String(tail).trim().replace(/^(?:me|us)\s+/i, '')
  if (!value || /^(?:and|or|then)\b/i.test(value) || NON_OBJECT_ACTION_TAIL_RE.test(value) || NON_OBJECT_ACTION_CJK_TAIL_RE.test(value)) return false
  if (VAGUE_ACTION_OBJECT_RE.test(value) || VAGUE_ACTION_CJK_OBJECT_RE.test(value) || ABSTRACT_ACTION_OBJECT_RE.test(value) || ABSTRACT_ACTION_CJK_OBJECT_RE.test(value)) return false
  return /[\p{L}\p{N}`/_.-]/u.test(value)
}

function concreteActionClaim(value) {
  const actionText = String(value).replace(/^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?/, '').trim()
  const action = actionText.match(QUOTED_PROMPT_ACTION_RE)?.[0] ?? actionText.match(QUOTED_PROMPT_CJK_ACTION_RE)?.[0]
  return Boolean(action) && concreteActionTail(actionText.slice(action.length))
}

function concreteInstructionClaim(value) {
  const actionText = String(value).replace(/^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?/, '').trim()
  const match = actionText.match(ACTION_VERB_RE)
  return Boolean(match) && concreteActionTail(actionText.slice((match.index ?? 0) + match[0].length))
}

function concreteFlowStage(value) {
  const match = String(value).match(FLOW_STAGE_OPERATION_RE)
  return Boolean(match) && concreteActionTail(String(value).slice((match.index ?? 0) + match[0].length))
}

function quotedPromptAction(line) {
  if (!QUOTED_PROMPT_RE.test(line)) return false
  const value = String(line)
    .replace(/^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:>\s*)?[_*]{0,2}["“]/, '')
    .replace(/["”][_*]{0,2}\s*$/, '')
    .trim()
  return concreteActionClaim(value)
}

function cjkCompoundActionLine(line) {
  return !CJK_ACTION_NOUN_PREFIX_RE.test(line) && CJK_ACTION_COMPOUND_START_RE.test(line) && CJK_ACTION_OPERATIONAL_PUNCT_RE.test(line)
}

const RELIABILITY_FACT_RE = /(?:credentials? never|encrypted at rest|mode 0?600|refresh(?:es)? automatically|only logged[- ]in [^.\n]{0,80} appear|fail(?:s)? over|cooldowns?|stays? synced|never (?:returned|sent|exposed|stored)|fail(?:s|ed|ure)? (?:with|without|and)|does not (?:implement|support|add)|not (?:supported|available|logged in)|stays? live|remain(?:s)? live|read[- ]only|cannot call|crash(?:es|ed)?|resumes? from|checkpoint|back it up|unreadable|unstable|do not rely|likely unavailable|buggy|compatib(?:le|ility)|cross[- ]platform|deprecated|known (?:issue|limit)|current limit|outside (?:the )?(?:scope|boundary)|加密|脱敏|失败|报错|不支持|不可用|不稳定|兼容|已验证|测试通过|限制|边界|回滚|恢复|崩溃|拒绝启动|明文不落盘|不会影响)/i
// rev3：可靠性散文正向语义门补充（平台/运行时边界、失败+恢复、密钥边界、不支持声明）。
// 仅用于 reliability 标题作用域的散文段落；中性填充散文必须零贡献。
const RELIABILITY_PROSE_FACT_RE = new RegExp([
  String.raw`\b(?:works?|runs?|supported)\s+on\b[^.\n]{0,60}\b(?:macos|mac os|osx|linux|windows|wsl|node(?:js)?|deno|bun|python|java|golang|rust|docker|kubernetes|arm64|x86|freebsd|ubuntu|debian|chromium|chrome)\b`,
  String.raw`(?:支持|兼容|运行于|适配)[^。；\n]{0,40}(?:macos|mac\s?os|linux|windows|wsl|node|python|docker|chromium|chrome|移动端|浏览器)`,
  String.raw`\brequire[sd]?\b[^.\n]{0,60}\b(?:chrome|chromium|node(?:js)?|python|java|docker|wsl|token|key|api[_ ]?key|executable|binary|local|network|internet|admin|macos|linux|windows)\b`,
  String.raw`(?:需要|要求)[^。；\n]{0,30}(?:wsl|node|python|docker|chrome|chromium|密钥|令牌|api|网络|管理员|macos|linux|windows)`,
  String.raw`\bfail(?:s|ed|ure)?\b[^.\n]{0,80}\b(?:retry|re-?run|clear|recover|restart|fallback|check|log|cache|report)\b`,
  String.raw`(?:失败|失败时)[^。；\n]{0,40}(?:重试|清理|恢复|重启|回退|查看|检查|日志)`,
  String.raw`\b(?:rejected?|denied|expired|invalid)\b[^.\n]{0,60}\b(?:re-?run|retry|refresh|auth|token|check|renew)\b`,
  String.raw`\bnever\b[^.\n]{0,40}\b(?:log|sent|exposed|stored|leave|written)\b`,
  String.raw`\b(?:token|secret|credential|api[_ ]?key|password)\b[^.\n]{0,40}\b(?:private|secret|safe|secure|redact|masked|never|confidential)\b`,
  String.raw`(?:令牌|密钥|token|secret|密码)[^。；\n]{0,30}(?:保密|私密|不落盘|不写入|不打印|脱敏|加密|私存)`,
  String.raw`\b(?:is not|not yet)\b[^.\n]{0,40}\b(?:supported|available|implemented)\b`,
  String.raw`(?:尚不支持|暂不支持|还不支持|未支持)`,
].join('|'), 'i')

const RELIABILITY_CLAIM_RE = new RegExp([
  String.raw`\b(?:is|are|was|were|be|been|being|get|gets|got|remains?)\s+(?:(?:both|fully|independently|automatically|cryptographically)\s+)?(?:[\w-]+-)?(?:validated|verified|tested|redacted|sandboxed|audited|scrubbed|sanitized|masked|notarized|signed)\b`,
  String.raw`\b(?:validated|verified|tested|audited|proven)\s+(?:against|with|by|on|under|across|in|to)\b`,
  String.raw`\b(?:tested|validated|verified|proven|battle[- ]?proven)\s+(?:and\s+)?(?:proven|trusted|in\s+(?:production|practice|ci))\b`,
  String.raw`\b(?:\d+\s+)?(?:unit|integration|smoke|regression|acceptance|e2e)\s+tests?\b`,
  String.raw`\btests?\s+(?:pass(?:ed|ing)?|fail(?:ed|ing)?|cover(?:s|ed|ing)?)\b`,
  String.raw`\btest\s+suites?\s+(?:pass(?:es|ed|ing)?|fail(?:s|ed|ing)?|cover(?:s|ed|ing)?|verif(?:y|ies|ied|ying)|validat(?:e|es|ed|ing))\b`,
  String.raw`\b(?:auto|pre|fully|always|never)[- ](?:redact|scrub|sanitiz|mask|verif)\w*\b`,
  String.raw`\b[\w-]+-verified\b`,
  String.raw`已(?:经)?通过[^。\n]{0,20}(?:验证|测试)`,
].join('|'), 'i')
const RELIABILITY_DOMAIN_RE = /\b(?:security|sandbox|permissions?|redact\w*|audits?)\b|安全|权限|沙箱|加密|脱敏/i
const RELIABILITY_VERIFICATION_BOUNDARY_RE = /(?:(?:invalid|incomplete|fail(?:s|ed|ure)?|last[- ]good).{0,120}(?:validated|verified|tested)|(?:validated|verified|tested).{0,120}(?:invalid|incomplete|fail(?:s|ed|ure)?|last[- ]good)|(?:validated|verified|tested).{0,120}\bonly\b.{0,80}\b(?:authenticated\s+)?human\b.{0,80}\baccept|\bonly\b.{0,80}\b(?:authenticated\s+)?human\b.{0,80}\baccept.{0,80}(?:validated|verified|tested))/i
const RELIABILITY_CONSEQUENCE_RE = /(?:\bnever\b|\bcannot\b|can't|won't|\bwithout\b|\brequires?\b|\bden(?:y|ies|ied)\b|\bblock(?:s|ed|ing)?\b|\bforbid(?:s|den)?\b|\benfor(?:ce|ced|ces)\b|\bprevent\w*\b|\bprotect\w*\b|\brestrict\w*\b|\bisolat\w*\b|\bescap\w*\b|\bleak\w*\b|\bexposed\b|\ballowlist\b|\bdenylist\b|\bapproval\b|\bopt-?in\b|\bopt-?out\b|\bat[- ]rest\b|\bin transit\b|\bonly\b|\bhardened?\b|\bout of\b|\bdisabled by default\b|\bno telemetry\b|\bmode\s*0[0-9]{3}\b|\b0[0-7]{3}\b|不|无法|不能|未|禁止|拒绝|仅|只|需|申请|授权|审批|隔离|限制|边界|明文|泄露|防|避免|阻断|校验|签名|回滚|降级|兜底|白名单|黑名单|只读|公证|弹窗)/i
const EXPLICIT_USECASE_FACT_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:use (?:[\w*-]+\s+){0,3}when\b|when to use\s*(?:\*\*)?\s*[:：]|best for\s*(?:\*\*)?\s*[:：]|适合谁\s*(?:\*\*)?\s*[:：]|适用场景\s*(?:\*\*)?\s*[:：]|使用场景\s*(?:\*\*)?\s*[:：])/i
const PERSONA_COMPAT_NEGATIVE_RE = /\b(?:windows|macos|mac os|osx|os x|linux|unix|node(?:js)?|deno|bun|python|java|golang|rust|ruby|php|dotnet|\.net|docker|kubernetes|k8s|wsl|android|ios|ipados|win32|arm64|x86|freebsd|centos|ubuntu|debian|fedora|视窗|鸿蒙)\b|\bv?\d+(?:\.\d+)+\b/i
const PERSONA_USECASE_FACT_RE = /(?:designed for|built for|intended for|created for|made for|meant for|target(?:ed)? (?:at|audience|users?)|aimed at|good fit for|goal users? (?:is|are)|目标用户(?:是)?|面向|适合|适用于|定位(?:是|为))([^。；\n]{0,48}?)(?:\b(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?)\b|(?:研究人员|工程师|开发者|开发人员|贡献者|用户|机构|团队|工作室|企业|公司|组织|新手|初学者|专业人士|学生|人士)(?!级))/i

const TASK_QUALIFIED_PERSONA_RE = /\bfor\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?)\s+(?:(?:who|that)\s+(?:(?:(?:want|need|prefer|seek)\s+to\s+)?(?:audit|review|maintain|debug|test|compare|manage|operate|monitor|build|develop|ship|triage|investigate|validate|verify|analy[sz]e)s?)\s+\S|(?:auditing|reviewing|maintaining|debugging|testing|comparing|managing|operating|monitoring|building|developing|shipping|triaging|investigating|validating|verifying|analy[sz]ing)\s+\S|seeking\s+to\s+(?:audit|review|maintain|debug|test|compare|manage|operate|monitor|build|develop|ship|triage|investigate|validate|verify|analy[sz]e)\s+\S|looking\s+for\s+(?:(?:an?|the|their|local|shared|signed|durable|searchable)\s+){0,3}(?:audit\s+trail|failure\s+reports?|release\s+evidence|logs?|traces?|reports?|artifacts?|workflow|dashboard))/i
const GENERIC_PERSONA_BENEFIT_RE = /(?:designed for|built for|intended for|created for|made for|meant for|aimed at)\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?)\s+(?:(?:with|using)\s+(?:(?:an?|the)\s+)?(?:beautiful|modern|powerful|delightful|easy|simple|better|local)\b|who\s+want\s+(?:(?:an?|the)\s+)?(?:beautiful|modern|powerful|delightful|easy|simple|better)\b|seeking\s+(?:(?:an?|the)\s+)?(?:better|beautiful|modern|powerful|delightful|easy|simple)\b)/i
const GENERIC_PERSONA_PREFERENCE_RE = /(?:designed for|built for|intended for|created for|made for|meant for|aimed at)\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?)\s+(?:(?:who|that)\s+(?:want|need|prefer|value|seek)\b|seeking\b|looking\s+for\b)/i
const GENERIC_PERSONA_ONLY_RE = new RegExp([
  String.raw`^(?:(?:the|this|our)\s+(?:project|tool|plugin|app|application)\s+)?(?:is\s+)?(?:designed|built|intended|created|made|meant)\s+for\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?)(?:\s+(?:and|or)\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?))?[.!?]*$`,
  String.raw`^(?:target(?:ed)?\s+(?:audience|users?)|goal users?)\s+(?:is|are)\s+(?:[a-z][\w-]*\s+){0,2}(?:researchers?|engineers?|developers?|contributors?|users?|teams?|agencies?|studios?|companies?|enterprises?|startups?|organizations?|beginners?|professionals?|students?|maintainers?|reviewers?|responders?)[.!?]*$`,
].join('|'), 'i')
const CJK_PERSONA_PREFIX_RE = /^(?:目标用户(?:是|为)?|面向|适合|适用于|定位(?:是|为))/
const CJK_GENERIC_PERSONA_QUALIFIER_RE = /^(?:(?:安全|工程|开发|产品|研究|维护|审查|响应|技术|业务|企业级|个人|专业)\s*){0,3}$/
const CJK_SPECIFIC_PERSONA_RE = /(?:个人工作室|小(?:型)?公司|小(?:型)?团队|独立开发者|初创公司)/
// 修复（冻结评审 adversarial-fresh2 F2 / adversarial F-3）：限定词含标点或偏好措辞时，
// 旧逻辑把任何非白名单限定词判为「具体人设」，导致纯职业身份与偏好型人设得分。
const CJK_PERSONA_PREFERENCE_ONLY_RE = /(?:喜欢|追求|想要|希望|偏好|注重|看重)/
const CJK_CONCRETE_TASK_CUE_RE = /(?:需要|可用于|用来|以便|得以|实现|完成|处理|管理|生成|分析|审查|验证|校验|审计|批量|自动化|部署|运行|搭建|接入|集成|拥有|实验室|本地|离线|每\s*[天夜周月]|小时|分钟|数千|上万|万份|文件|数据|报告|日志|仓库|代码库|密钥|令牌|合规|维护|搜索|展示|整理|筛选)/

function concreteCjkPersona(value, qualifier) {
  if (!CJK_PERSONA_PREFIX_RE.test(value)) return false
  if (CJK_SPECIFIC_PERSONA_RE.test(value)) return true
  // 修复轮 3（评审 owner I2 / adversarial I-3）：领域限定纯身份（金融投资/广告营销
  // 人士等）整行无操作线索 → 零分；有具体操作/场景线索（在终端中快速连接、批量
  // 重命名、拥有实验室等）→ 计 usecase。
  const q = String(qualifier ?? '').trim().replace(/^[：:，,。.、·—\-—\s]+|[：:，,。.、·—\-—\s]+$/g, '')
  if (!q) return false
  if (CJK_GENERIC_PERSONA_QUALIFIER_RE.test(q)) return false
  if (CJK_PERSONA_PREFERENCE_ONLY_RE.test(q) && !CJK_CONCRETE_TASK_CUE_RE.test(q)) return false
  if (!CJK_CONCRETE_TASK_CUE_RE.test(value)) return false
  return true
}

function semanticPlainText(line) {
  return String(line)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, ' ')
    .replace(/^\s*(?:(?:[-+*]|\d+[.)])\s+|>\s*)/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const PERSONA_META_CONTENT_RE = /(?:面向|适合|适用于|定位(?:是|为)|designed for|built for|intended for|created for|made for|meant for|aimed at)[^。；\n]{0,100}(?:接入指南|开发指南|使用指南|安装包|安装程序|签名包|installer|installation package|setup package|developer guide|integration guide|user guide|documentation)|(?:默认|stable|beta|nightly|preview)[^。；\n]{0,60}(?:频道|channel|release)[^。；\n]{0,60}(?:适合|best for|designed for)[^。；\n]{0,40}(?:绝大多数|大多数|most|general)\s*(?:用户|users?)/i
const RELEASE_CHANNEL_LABEL_PATTERN = String.raw`(?:stable|beta|nightly|preview|稳定(?:版|频道)?|测试(?:版|频道)?|预览(?:版|频道)?)`
const RELEASE_CHANNEL_LABEL_RE = new RegExp(String.raw`^${RELEASE_CHANNEL_LABEL_PATTERN}$`, 'i')
const RELEASE_CHANNEL_INLINE_RE = new RegExp(String.raw`^${RELEASE_CHANNEL_LABEL_PATTERN}\s*(?:[:：]|[—–-])\s*(.+)$`, 'i')
const RELEASE_CHANNEL_SENTENCE_RE = new RegExp(String.raw`^${RELEASE_CHANNEL_LABEL_PATTERN}\s+(?:is|are)\s+(.+)$`, 'i')
const RELEASE_CHANNEL_METADATA_CUE_RE = /(?:\b(?:default|recommended)\b[^.\n]{0,80}\b(?:(?:release|update)\s+)?channel\b|\b(?:release|update)\s+channel\b|\b(?:most|general)\s+users?\b|\bnewer\s+(?:features?|releases?|versions?)\b|\bexperimental\s+builds?\b|\bearly\s+(?:access|adopters?)\b|默认[^。；\n]{0,24}(?:频道|通道)|(?:更新|发布)(?:频道|通道)|(?:绝大多数|大多数)用户|体验[^。；\n]{0,16}较新的?(?:功能|版本)|实验(?:性)?构建|早期体验|主动切换)/i
const RELEASE_CHANNEL_DISTRIBUTION_ONLY_RE = /^(?:(?:supports?|provides?|offers?|includes?|ships?|publishes?)\s+)?(?:experimental\s+builds?\s+(?:for|to)\s+early\s+access|(?:access\s+to\s+)?newer\s+(?:features?|releases?|versions?)(?:\s+early)?|early\s+access\s+to\s+experimental\s+builds?)\s*[.!]?$/i
const RELEASE_CHANNEL_CJK_DISTRIBUTION_ONLY_RE = /^(?:(?:支持|提供|包含|发布))?(?:实验(?:性)?构建(?:用于|供)早期(?:体验|访问)|早期(?:体验|访问)实验(?:性)?构建|体验较新的?(?:功能|版本))\s*[。！!]?$/i
const RELEASE_CHANNEL_CAPABILITY_VERB_RE = /(?:\b(?:supports?|provides?|exposes?|includes?|offers?|adds?|ships?|registers?|integrates?|connects?|bridges?|embeds?|persists?|bundles?|writes?|checks?|manages?|renders?|records?|parses?|converts?|exports?|watches?|monitors?|searches?|indexes?|compares?|analy[sz]es?|detects?|saves?|creates?|generates?|returns?|produces?|routes?|streams?|syncs?|displays?|shows?|validates?|verifies?|documents?|switches)\b\s+\S|\bbuild(?:s|ing)?\b\s+(?!for\b)\S|\bupdates\s+(?:signed|downloaded|installed|local)\b|(?:支持|提供|暴露|包含|集成|接入|连接|内嵌|渲染|委派|记录|调节|启用|禁用|管理|搜索|解析|生成|导出|展示|显示|写入|保存|比较|验证|校验))/i

function releaseChannelDetails(value) {
  const cells = value.split('|').map((cell) => cell.trim()).filter(Boolean)
  if (cells.length >= 2 && cells.some((cell) => RELEASE_CHANNEL_LABEL_RE.test(cell))) {
    return cells.filter((cell) => !RELEASE_CHANNEL_LABEL_RE.test(cell))
  }
  const inline = value.match(RELEASE_CHANNEL_INLINE_RE)
  if (inline) return [inline[1].trim()]
  const sentence = value.match(RELEASE_CHANNEL_SENTENCE_RE)
  return sentence ? [sentence[1].trim()] : []
}

function releaseChannelDistributionOnly(detail) {
  const value = String(detail).trim()
  return RELEASE_CHANNEL_DISTRIBUTION_ONLY_RE.test(value)
    || RELEASE_CHANNEL_CJK_DISTRIBUTION_ONLY_RE.test(value)
}

function releaseChannelCapabilityFact(line) {
  const details = releaseChannelDetails(semanticPlainText(line))
  return details.some((detail) => !releaseChannelDistributionOnly(detail) && RELEASE_CHANNEL_CAPABILITY_VERB_RE.test(detail))
}

function releaseChannelLabelRowOnly(value) {
  const cells = value.split('|').map((cell) => cell.trim()).filter(Boolean)
  if (cells.length < 2) return false
  // 裸 channel 标签行与纯版本号行同为发布元信息（Stable|Beta 表 + 1.0|1.1 数据行）。
  return cells.every((cell) => RELEASE_CHANNEL_LABEL_RE.test(cell) || /^v?\d+(?:\.\d+)*$/.test(cell))
}

function semanticMetaContent(line) {
  const value = semanticPlainText(line)
  // 修复（冻结评审 owner-fresh2 F1）：全为裸 channel-label 的表格行是纯发布元信息，
  // releaseChannelDetails 对其返回空数组会绕过排除，必须直接判为 meta content。
  if (releaseChannelLabelRowOnly(value)) return true
  const channelDetails = releaseChannelDetails(value)
  const channelHasMetadataCue = channelDetails.some((detail) => RELEASE_CHANNEL_METADATA_CUE_RE.test(detail))
  const channelHasCapability = channelDetails.some((detail) => !releaseChannelDistributionOnly(detail) && RELEASE_CHANNEL_CAPABILITY_VERB_RE.test(detail))
  const channelMetadata = channelDetails.length > 0 && channelHasMetadataCue && !channelHasCapability
  return PERSONA_META_CONTENT_RE.test(value) || channelMetadata
}

function personaUsecaseFact(line) {
  // 修复轮 2（评审 adversarial I-3）：尾缀数字/单字符扰动不得让纯身份 bullet 逃过身份门。
  const value = semanticPlainText(line).replace(/\s+\d+(?:\.\d+)*\s*$/, '').trim()
  const taskQualified = TASK_QUALIFIED_PERSONA_RE.test(value)
  if (AUDIENCE_ONLY_IDENTITY_RE.test(value)
    || GENERIC_PERSONA_ONLY_RE.test(value)
    || GENERIC_PERSONA_BENEFIT_RE.test(value)
    || (GENERIC_PERSONA_PREFERENCE_RE.test(value) && !taskQualified)
    || semanticMetaContent(value)) return false
  const match = value.match(PERSONA_USECASE_FACT_RE)
  if ((!match && !taskQualified) || PERSONA_COMPAT_NEGATIVE_RE.test(value)) return false
  if (!match) return true
  if (CJK_PERSONA_PREFIX_RE.test(value)) return concreteCjkPersona(value, match[1] ?? '')
  const remainder = value.slice((match.index ?? 0) + match[0].length)
  return !/^\s*(?:tools?|工具)\s*(?:[.,;:，。；：]|$)/i.test(remainder)
}

function personaIdentityContent(line) {
  const value = semanticPlainText(line)
  return (PERSONA_USECASE_FACT_RE.test(value) || TASK_QUALIFIED_PERSONA_RE.test(value))
    && !personaUsecaseFact(value)
}

// rev3：usecase 标题作用域内容的正向语义门（任务上下文 bullet / 操作动词）；中性填充零贡献
// 修复轮 2（评审 adversarial I-2）：主观质量赞美（smooth/clean/elegant…）不是任何
// 家族的可观察证据；含此类形容词且无具体操作/事实信号的 bullet 在三族标题下零贡献。
const SUBJECTIVE_QUALITY_RE = /\b(?:smooth|fast|clean|pleasant|polished|simple|elegant|tidy|nice|balanced|gentle|refreshed|calm|soft|quiet|sleek|beautiful|modern|powerful|delightful|amazing|incredible|awesome|ultimate|seamless|effortless|stunning|gorgeous|intuitive|better|best|endless)\b/i

const USECASE_TASK_CONTEXT_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\\*)?(?:audit|review|inspect|analy[sz]e|compare|monitor|triage|investigate|validate|verify|debug|test|track|scan|search|filter|summar(?:ize|ise)|automate|convert|export|generate|manage|sync|migrate|trace|plan|ask)\b/i
function usecaseSemanticFact(line) {
  return EXPLICIT_USECASE_FACT_RE.test(line) || personaUsecaseFact(line)
}

const CONCRETE_OUTPUT_FACT_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*[^*]+\*\*\s*(?:[-–—:：]\s*)?)?(?:generates|returns|produces|renders|writes|saves|creates|emits|outputs|displays|shows|records|publishes|生成|返回|产出|渲染|写入|保存|创建|输出|显示|展示|记录|发布)(?:\b|[：:、，。\s]).{0,180}(?:\b(?:jsonl?|csv|markdown|html|pdf|report|receipt|summary|result|response|artifact|file|path|url|preview|image|video|clip|dashboard|panel|card|list|table|tree|transcript|log|archive|snapshot|diff|metrics?|statistics?|status|timeline|presentation|slides?|notebook)\b|报告|回执|摘要|结果|响应|产物|文件|路径|链接|预览|图像|视频|面板|卡片|列表|表格|树|记录|日志|归档|快照|差异|统计|状态|时间线|演示文稿|幻灯片)/i
const MEASURED_OUTPUT_VERB_RE = /(?:\b(?:produced|rebuilt|rendered|generated|obtained|analy[sz]ed|processed|exported|passed)\b|成功取得|成功获取|共分析|产出|生成|重建|渲染|通过)/i
const MEASURED_OUTPUT_VALUE_RE = /(?:\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d[\d,.]*)\s*(?:%|percent|files?|items?|records?|rows?|tokens?|runners?|reports?|quotes?|candles?|tests?|checks?|gains?)\b|\d+\s*\/\s*\d+|\d+(?:\.\d+)?%|\d[\d,.]*\s*(?:只|根|条|份|项|个|次))/i
const MEASURED_OUTPUT_NOUN_RE = /(?:\b(?:result|outcome|gain|report|artifact|dashboard|projection|quote|candle|record|token|runner|test|check|metric|kpi)\w*\b|结果|成果|行情|报告|产物|通过数|有效可交易日|统计|指标)/i
const MEASURED_TABLE_CELL_RE = /(?:^|\s)(?:[+-]\d+(?:\.\d+)?%?|\d+\s*\/\s*\d+|\d+(?:\.\d+)?%|\d[\d,.]*\s*(?:ms|s|fps|tokens?|files?|items?|records?|rows?|tests?|checks?|只|根|条|份|项|个|次))(?:$|\s)/i
const RESULT_LABELED_FACT_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:expected|actual|observed|run|execution|预期|实际|运行|执行|输出)(?:\s+|的)?(?:result|outcome|结果|效果)(?:\*\*)?\s*[:：]\s*\S/i
const EXACT_OUTPUT_HEADING_RE = /^(?:效果展示|运行效果|输出示例|运行结果)$/i
const MAINTENANCE_STATUS_HEADING_RE = /^(?:repository|repo|project|package|build|release|maintenance|development)\s+status$/i
const DECORATIVE_MEDIA_RE = /(?:^|[/_.-])(?:logo|banner|icon|avatar|hero|cover|badge)(?:[/_.-]|$)/i

const INSTALL_SECTION_RE = /^(install|installation|setup|getting started|quick start|deploy|安装|快速开始|开始使用|使用说明)/i
const INSTALL_CMD_RE = /^(git clone|git submodule|dsh plugin|dsh\s+.*\sadd|pnpm (add|i)\b|npm (install|i)\b|npx skills add|npx @[^\s]+ add|curl .*install|pip install|uv (tool )?install|brew install|cargo install|yarn (add|global add))/
const CONFIG_KEY_RE = /(?:^|[^A-Za-z])(GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|LLM_API_KEY|API_KEY|CLAUDE_API_KEY|AZURE_OPENAI|AWS_ACCESS_KEY|STRIPE_API_KEY|WEBHOOK_SECRET|SESSION_KEY)(?:[^A-Za-z]|$)/i
const NEGATION_RE = /(?:不需要|无需|不用|免[^。；\n]{0,10}(?:配置|token|key)|no (?:api ?key|token|config|setup|configuration)|without (?:any )?(?:api ?key|token|config)|no configuration required|zero-?config|works (?:out of the box|without))/i

// 代码块内按行过滤：install/config 行（npm install / export KEY=...）剔除，run 行保留
const CONFIG_ASSIGN_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+|>\s*)?(?:[*~`]{1,3})?(?:export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*\S/
const CONFIG_CONTENT_RE = /(?:\b(?:api|license|secret|access|auth)\s*keys?\b|\benvironment\s+(?:file|variable)\b|\b(?:configuration|config|settings?)\s+(?:file|dialog|panel|value|option)\b|(?:配置|设置)(?:文件|项|值|面板)|环境变量)/i
const CONFIG_TABLE_KEY_HEADER_RE = /^(?:key|option|setting|variable|parameter|config(?:uration)?|键|选项|设置|变量|参数|配置)$/i
const CONFIG_TABLE_VALUE_HEADER_RE = /^(?:default|value|meaning|description|默认值|值|含义|说明)$/i

function configurationContent(line) {
  return CONFIG_KEY_RE.test(line) || CONFIG_ASSIGN_RE.test(line) || CONFIG_CONTENT_RE.test(line)
}

function practicalContentEligible(line) {
  return !INSTALL_COMMAND_RE.test(line) && !INSTALL_STEP_RE.test(line) && !configurationContent(line)
}

function marketingContent(line) {
  const value = String(line).replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '').trim()
  const cells = value.split('|').map((cell) => cell.replace(/[*_`]/g, '').trim()).filter(Boolean)
  const candidates = line.includes('|') ? [value, ...cells.slice(1)] : [value]
  return candidates.some((candidate) => {
    if (FALLBACK_MARKETING_PROSE_RE.test(candidate) || AUDIENCE_ONLY_IDENTITY_RE.test(candidate) || (MARKETING_BENEFIT_ADJECTIVE_RE.test(candidate) && MARKETING_ABSTRACT_OBJECT_RE.test(candidate)) || ABSTRACT_ACTION_OBJECT_RE.test(candidate) || ABSTRACT_ACTION_CJK_OBJECT_RE.test(candidate)) return true
    const startsWithAction = QUOTED_PROMPT_ACTION_RE.test(candidate) || QUOTED_PROMPT_CJK_ACTION_RE.test(candidate) || ACTION_VERB_RE.test(candidate)
    return startsWithAction && !concreteActionClaim(candidate) && !concreteInstructionClaim(candidate)
  })
}

function semanticContentEligible(line) {
  return practicalContentEligible(line)
    && !semanticMetaContent(line)
    && !personaIdentityContent(line)
    && !CATALOG_ENTRY_RE.test(line)
    && !EXTERNAL_REPO_LINK_RE.test(line)
    && !DECOR_BULLET_RE.test(line)
    && !marketingContent(line)
    && !CAPABILITY_REQUIREMENT_GUARD_RE.test(line)
    && !fallbackPlannedContent(line)
    && !IDENTITY_ONLY_RE.test(line)
}

function fallbackPlannedContent(line) {
  const value = semanticPlainText(line)
  // 修复轮 2（评审 adversarial I-1 / owner I-1 / M-2）：只打击「未来交付承诺」——
  // will+动词、coming soon、planned/proposed to、TODO/待办 前缀、CJK 计划/即将/将来词族；
  // 移除裸 ^planned/future 前缀规则（「Planned report scheduler」等真实特性名被误杀）。
  return /\bwill\s+(?:be\s+)?[a-z]+/i.test(value)
    || /\b(?:coming soon|planned to|planning to|plans to|proposed to|planned for)\b/i.test(value)
    || /^(?:planned|proposed|future)\s*[:：]/i.test(value)
    || /\broadmap\b/i.test(value)
    || /(?:^|\b)(?:todo|to-do|待办)\s*[:：]/i.test(value)
    || /^(?:计划|规划)\s*[:：]|(?:计划|规划)中|(?:即将|后续|将来|日后|未来版本)(?:会|将)?(?:新增|增加|提供|支持|发布|推出|实现|开发|完善|改进|优化)/i.test(value)
}

function fallbackSetupDeliveredBehavior(line) {
  const value = semanticPlainText(line)
  return /\b(?:panel|plugin|app|application|service|runtime|client|server|renderer|manager|bundle\s+patch|prepare\s+script)\b[^.\n]{0,160}\b(?:manages?|assembles?|cleans?|renders?|plays?|switches?|stores?|loads?|builds?|exports?|sanitizes?|generates?)\b/i.test(value)
    || /(?:拥有[^。；\n]{0,80}(?:模式|功能)|(?:点|点击)[^。；\n]{0,40}(?:应用|切换)|(?:动态壁纸|插件|应用|bundle\s+patch|prepare\s+脚本)[^。；\n]{0,100}(?:循环播放|负责装配|清理侧栏|管理|切换|自行构建|导出|剥离))/.test(value)
}

function fallbackSetupContent(line) {
  const value = semanticPlainText(line)
  const setup = INSTALL_COMMAND_RE.test(value)
    || INSTALL_STEP_RE.test(value)
    || /^(?:set|export|configure|enter|add|provide|paste|save)\b.{0,120}(?:api[_ -]?key|token|secret|environment|env\b|config(?:uration)?|settings?)\b/i.test(value)
    || /^(?:设置|配置|填写|输入|添加|保存)[^。；\n]{0,100}(?:密钥|令牌|环境变量|配置|设置)/.test(value)
  return setup && !fallbackSetupDeliveredBehavior(value)
}

function fallbackSemanticContentEligible(line) {
  return !(configurationContent(line) && !fallbackSetupDeliveredBehavior(line))
    && !fallbackSetupContent(line)
    && !semanticMetaContent(line)
    && !personaIdentityContent(line)
    && !marketingContent(line)
    && !CAPABILITY_REQUIREMENT_GUARD_RE.test(line)
    && !fallbackPlannedContent(line)
    && !IDENTITY_ONLY_RE.test(line)
}

// 媒体徽章判定（v3）：优先看 URL/文件名徽章模式（shields.io、badge.svg、
// GitHub Actions workflow badge 等），alt 只拒绝明确徽章词；workflow/demo/截图等自然词不再误杀
const BADGE_URL_RE = /(?:shields\.io|img\.shields|badgen\.net|badge(?:\.svg|[/_.-])|status\.svg|\/badges?\/|\.svg\?(?:style|label|logo)=|(?:actions|workflows)\/[^/) ]+\/badge\.svg)/i
const BADGE_ALT_RE = /\b(?:badge|shield|logo|license|coverage|stars?|forks?|downloads?|npm|build(?: status)?|status\s*badge|(?:test|release)\s*(?:badge|status)|(?:ci|maintenance|activity|contributors?|issues?|pulls?)\s*(?:badge|status)?)\b/i
const MEDIA_LINK_TEXT_RE = /(?:视频|录像|录屏|演示|效果|demo|video|screencast|screen\s*recording|walkthrough)/i
const MEDIA_VIDEO_URL_RE = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/|youtu\.be\/|bilibili\.com\/video\/|b23\.tv\/|douyin\.com\/|vimeo\.com\/|loom\.com\/share\/)|\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i

// Q&A / 提醒框（GitHub admonition）逐行识别，用于 usecase/output/reliability 计数
const QA_LINE_RE = /^\s*(?:>\s*)?(?:\*\*)?(?:q|question|a|answer)\s*[:：]/i
const QA_QUESTION_RE = /^\s*(?:>\s*)?(?:\*\*)?(?:q|question)\s*[:：]/i
const ADMONITION_RE = /^\s*>\s*\[![A-Za-z][A-Za-z0-9-]*\]/i

// 纯链接/装饰性条目：catalog 链接文档不得靠"-[name](url)"或裸 URL 刷出能力证据
const DECOR_BULLET_RE = /^\s*(?:[-+*]|\d+[.)])\s+(?:!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>|\[[^\]]*\]\([^)\s]*\)|<https?:\/\/\S+>|https?:\/\/\S+)\s*$/i
// 外部 GitHub 项目的一行式“链接 — 描述”是目录条目，不是当前项目自身能力。
const CATALOG_ENTRY_RE = new RegExp(String.raw`^\s*(?:[-+*]|\d+[.)])\s+(?:-\s+)?(?:\*\*)?\[[^\]]+\]\(https?:\/\/(?:www\.)?${EXTERNAL_PROJECT_PATH}[^)]*\)(?:\*\*)?\s*(?:[—–-]|:)\s+\S`, 'i')
const EXTERNAL_REPO_LINK_RE = new RegExp(String.raw`\[[^\]]*\]\(https?:\/\/(?:www\.)?${EXTERNAL_PROJECT_PATH}[^)]*\)`, 'i')

// ---- v3 确定性回退（brand/nonstandard 标题）的严格假阳性控制 ----
// 只有 kind='other' 且非排除、非文档标题、父级不是未知标题的章节才可能进入回退；
// 权重 0.5，且必须通过噪声标题/营销标题/内容门。
const FALLBACK_WEIGHT = 0.5
const FALLBACK_NOISE_RE = new RegExp(String.raw`^(?:description|descriptions|intro|introduction|about|name|names?|notes?|note|notice|disclaimer|legal|privacy|privacy policy|terms?|tos|changelog|history|releases?|release notes|roadmap|milestones?|planned|planning|todo|todos?|backlog|coming soon|what'?s next|next steps?|support|contact|credits|thanks|thank you|acknowledg|authors?|maintainers?|contributors?|contributing|contribute|join|get involved|community|discord|telegram|slack|donate|sponsors?|backers?|related|see also|links?|link|awesome|catalog|directory|resources?|reference|references|documentation|docs|website|homepage|repository|repo|issues?|bug reports?|feature requests?|pull requests?|pulls?|stars?|license|copyright|glossary|index|outline|summary|conclusion|简介|关于|说明|备注|附注|注意|免责|声明|术语|词汇表|大纲|索引|摘要|总结|结论|背景|计划|待办|路线图|版本|发布|迁移|升级|更多|相关|链接|资源|支持|联系|社区|感谢|致谢|赞助|作者|参考资料|常见链接)${HEADING_SUFFIX}`, 'i')
const FALLBACK_MARKETING_TITLE_RE = /(?:world['’]?s|best|ultimate|most|amazing|incredible|awesome|powerful|lightweight|light[- ]weight|blazing|fast|simple|simplest|easy|easiest|effortless|seamless|modern|beautiful|stunning|revolutionary|cutting[- ]edge|next[- ]gen|premium|deluxe|super|mega|ultra|extreme|top[- ]rated|must[- ]have|game[- ]chang|one[- ]click|zero[- ]config|turbo|hyper|pro\b|max\b|plus\b|plugin of the|best[- ]of|state[- ]of[- ]the[- ]art|world[- ]class)/i
const FALLBACK_MARKETING_PROSE_RE = /(?:world['’]?s (?:best|most|leading|fastest)|the (?:best|ultimate|most|fastest)|(?:demand|deserve) the very best|(?:blazing|lightning|super)[ -]?fast|extremely fast|incredibly|amazingly|effortless|seamless|game[- ]changing|must[- ]have|revolutionary|cutting[- ]edge|state[- ]of[- ]the[- ]art|top[- ]rated|trusted by|loved by|used by (?:millions?|thousands?|hundreds?)|(?:millions?|thousands?) of (?:users?|developers?|downloads?|stars?)|one[- ]click (?:setup|install)|zero[- ]config|no (?:setup|config(?:uration)?) required|out of the box|batteries included|the most powerful|the ultimate|unmatched|unparalleled|unrivaled|best[- ]in[- ]class|world[- ]class|highly recommended|(?:强大|现代|无缝|极致|最佳|顶级|领先|革命性|惊艳|卓越|完美|令人惊叹)[、，和与及\s]*(?:强大|现代|无缝|极致|最佳|顶级|领先|革命性|惊艳|卓越|完美|令人惊叹)*(?:的)?(?:体验|未来|世界|选择|工具|产品|平台)|美好未来|无限可能|面向每个人)/i
// 前言（preamble）要点里的"需求/依赖"类要点不构成能力证据
const REQUIREMENT_BULLET_RE = /(?:requires?|needs?|prerequisit|depend(?:s|ency|encies)|works on|compatible with|环境要求|依赖|需要|要求)/i
const CAPABILITY_REQUIREMENT_GUARD_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:requires?|needs?|prerequisites?|dependencies?|环境要求|依赖|需要|要求)(?:\b|[：:、，。\s])/i
const CAPABILITY_FACT_RE = /(?:^|\s)(?:supports?|provides?|exposes?|includes?|offers?|adds?|ships?)\s+\S/i
const PARAGRAPH_CAPABILITY_FACT_RE = /(?:\b(?:supports?|provides?|exposes?|includes?|offers?|adds?|ships?|registers?|integrates?|connects?|bridges?|embeds?)\b|(?:支持|提供|暴露|包含|集成|接入|连接|内嵌|渲染|委派|记录|调节|启用|禁用|管理|搜索))/i
const SUBJECT_CAPABILITY_VERB_RE = /\b(?:persists?|bundles?|writes?|checks?|manages?|renders?|records?)\s+(?!(?:is|are|was|were|has|have|can|may|will)\b)\S+|\bturns?\s+\S+(?:\s+\S+){0,8}\s+into\s+\S+/i
const INLINE_ACTION_VERB_RE = /(?:^|[.!?。！？]\s*|\b(?:then|next),?\s+|\b(?:once installed|after installation|when ready),?\s+)(?:run|open|click|select|choose|enter|type|send|create|add|use|ask|call|execute|start|press|drag|upload|audit|review|inspect|save)\b/i
const MECHANISM_FACT_RE = /\b(?:routes?|passes?|sends?|forwards?|maps?|connects?|registers?|loads?|streams?|stores?|keeps?|runs?)\b[^.\n]{0,100}\b(?:through|to|from|into|via|with|before|after|inside|within|across)\b/i
const CAPABILITY_ACTION_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:\*\*)?(?:(?:the|this|our)\s+(?:tool|plugin|project|app|application|runtime|service|agent|client|server|interface)\s+)?(?:can\s+)?(?:parse|convert|export|watch|monitor|search|index|compare|analy[sz]e|detect|render|write|save|create|generate|return|produce|manage|route|stream|sync|bridge|embed|display|show|record|publish|validate|verify)\b/i
const CJK_CAPABILITY_FACT_RE = /(?:把|将)[^。；\n]{1,120}(?:接入|接进|嵌入|内嵌|显示|同步|锁进|装进|导出|解析|生成|管理|运行)/
const PREAMBLE_PRODUCT_SURFACE_RE = /(?:\b(?:dsh|web|browser|desktop|mobile|session|conversation)\b[^.\n]{0,100}\b(?:view|editor|panel|timeline|stage|workspace|canvas|dashboard)\b|(?:DSH|Web|浏览器|桌面|移动端|会话页|会话标签栏|界面)[^。；\n]{0,100}(?:视图|编辑器|面板|时间线|舞台|工作区|画板|仪表盘|对话框))/i
const PREAMBLE_COMPOUND_SURFACE_RE = /(?:\b(?:view|editor|panel|timeline|stage|workspace|canvas|dashboard)\b|(?:视图|编辑器|面板|时间线|舞台|工作区|画板|仪表盘|对话框))[^.。；\n]{0,80}(?:\+|\band\b|[·、，,])[^.。；\n]{0,80}(?:\b(?:view|editor|panel|timeline|stage|workspace|canvas|dashboard)\b|(?:视图|编辑器|面板|时间线|舞台|工作区|画板|仪表盘|对话框))/i
const PREAMBLE_PRODUCT_ACTION_RE = /(?:\b(?:adds?|embeds?|integrates?|renders?)\b[^.\n]{0,120}\b(?:view|editor|panel|timeline|stage|workspace|canvas|dashboard)\b|(?:在[^。；\n]{1,60}(?:加入|添加|嵌入)|内置[^。；\n]{1,100}(?:可|支持))[^。；\n]{1,120}(?:视图|编辑器|面板|时间线|舞台|拖拽|修改|切换|同步|输入))/i
const PREAMBLE_DELIVERED_BEHAVIOR_RE = /\b(?:bring(?:s|ing)?|giv(?:e|es|ing)|gain(?:s|ing)?|open(?:s|ing)?|rebuild(?:s|ing)?|manag(?:e|es|ing)|driv(?:e|es|en|ing)|stream(?:s|ed|ing)?|control(?:s|led|ling)?|connect(?:s|ed|ing)?|continu(?:e|es|ed|ing)|record(?:s|ed|ing)?|display(?:s|ed|ing)?|show(?:s|ed|ing)?|edit(?:s|ed|ing)?|delet(?:e|es|ed|ing)|sort(?:s|ed|ing)?)\b|(?:加入|添加|嵌入|内置|提供|记录|展示|显示|连接|接入|继续|启停|管理|打包|组织|编辑|删除|插话|排序|调试|截图|验证|控制|驱动|监视|同步|拖拽|修改|切换|输入|导出|解析|生成|运行)/i
const PREAMBLE_CONCRETE_BEHAVIOR_OBJECT_RE = /\b(?:workspace|director(?:y|ies)|files?|conversations?|sessions?|messages?|tools?|plugins?|terminals?|devices?|simulators?|phones?|tabs?|rows?|cards?|properties|layers?|targets?|assets?|vulnerabilit(?:y|ies)|results?|releases?|subagents?|github|gitlab|mcp|vscode|vs code)\b|(?:工作区|目录|文件|会话|消息|工具|插件|终端|设备|模拟器|手机|标签|卡片|属性|图层|目标|资产|漏洞|结果|版本|发布|审计|场景|元素|队列|排队消息|子代理|开发工具|插件生态)/i
function preambleDeliveredBehavior(line) {
  const match = line.match(PREAMBLE_DELIVERED_BEHAVIOR_RE)
  if (!match) return false
  const before = line.slice(0, match.index ?? 0)
  const after = line.slice((match.index ?? 0) + match[0].length)
  return PREAMBLE_CONCRETE_BEHAVIOR_OBJECT_RE.test(after)
    || (PREAMBLE_CONCRETE_BEHAVIOR_OBJECT_RE.test(before)
      && (PREAMBLE_PRODUCT_SURFACE_RE.test(after) || /[:：][^:：]{0,80}$/.test(before)))
}
function preambleProductFact(line) {
  if (PREAMBLE_PRODUCT_ACTION_RE.test(line)) return true
  if (!PREAMBLE_PRODUCT_SURFACE_RE.test(line)) return false
  return (PREAMBLE_COMPOUND_SURFACE_RE.test(line) && PREAMBLE_CONCRETE_BEHAVIOR_OBJECT_RE.test(line))
    || preambleDeliveredBehavior(line)
}
const IDENTITY_ONLY_RE = /^\s*(?:(?:[-+*]|\d+[.)])\s+)?(?:an?|the)?\s*(?:(?:fast|simple|lightweight|powerful|modern|local|open[- ]source)\s+)*(?:cli|plugin|tool|app|application|project|service|platform)\s+for\s+(?:developers?|users?|teams?|enterprises?|companies?|organizations?)\b/i
const PLANNED_MEDIA_RE = /(?:planned|proposed|future|concept|mockup|wireframe|roadmap|coming soon|计划|规划|概念图|原型图|线框图)/i

function concreteCapabilityFact(line) {
  return !FALLBACK_MARKETING_PROSE_RE.test(line)
    && (CAPABILITY_FACT_RE.test(line) || CAPABILITY_ACTION_RE.test(line) || CJK_CAPABILITY_FACT_RE.test(line) || releaseChannelCapabilityFact(line))
}

function semanticClaimKey(value) {
  return normalizeEvidence(value).replace(/\b(number|edition)\s+\d+\b/g, '$1 <n>')
}
const CAPABILITY_MIGRATION_GUARD_RE = new RegExp([
  INSTALL_COMMAND_RE.source,
  INSTALL_STEP_RE.source,
  CONFIG_KEY_RE.source,
  CONFIG_ASSIGN_RE.source,
  CATALOG_ENTRY_RE.source,
  EXTERNAL_REPO_LINK_RE.source,
  DECOR_BULLET_RE.source,
  CATALOG_TABLE_ROW_RE.source,
  FALLBACK_MARKETING_PROSE_RE.source,
  CAPABILITY_REQUIREMENT_GUARD_RE.source,
  String.raw`^\s*(?:the\s+)?(?:readme|documentation|docs?)\b[^.\n]{0,80}\b(?:provides?|includes?|offers?|adds?|ships?|contains?)\b`,
  String.raw`\b(?:readme|documentation|docs?|repository|repo|package)\b[^.\n]{0,80}\b(?:provides?|includes?|offers?|adds?|ships?)\b[^.\n]{0,80}\b(?:install(?:ation)?|setup|config(?:urations?)?|license|licence|changelog|release notes?|安装|配置|许可证|更新日志)\b`,
  String.raw`\b(?:readme|documentation|docs?|repository|repo|package|project|plugin)\b[^.\n]{0,40}\b(?:provides?|includes?|offers?|adds?|ships?)\s+(?:(?:an?|the|its|our|complete|detailed|comprehensive|full|api|usage|user|developer|quickstart|getting[- ]started)\s+){0,4}(?:documentation|docs?|guides?|instructions?|examples?|samples?|templates?|source code(?:\s+and\s+(?:documentation|docs?))?)\b(?=\s*(?:[.,;:)]|$|(?:for|about|covering|with|of)\b))`,
  String.raw`(?:roadmap|coming soon|planned|planning|todo|next steps?|will (?:add|support|ship|land)|路线图|计划|即将|后续|待办|规划|展望)`,
  String.raw`(?:\bis not\b|\bare not\b|不是|并非|而非|推荐|建议|\brecommended\b)`,
].join('|'), 'i')

export const README_PRACTICAL_VERSION = 3
export const README_PRACTICAL_PARSER_REVISION = 3

function normalizeActionEvidence(value) {
  return String(value).replace(/\s+#\s*\S.*$/, '').trim()
}

function uniqueActionCount(values, limit = Infinity) {
  return uniqueCount(values.map(normalizeActionEvidence), limit)
}

function normalizeEvidence(text) {
  return text
    .toLowerCase()
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[`*_~#>|()[\]{}“”"'‘’]/g, ' ')
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
    .replace(/[.!?。！？,，;；:：、…—–-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function uniqueCount(values, limit = Infinity) {
  const unique = new Set()
  for (const value of values) {
    const normalized = normalizeEvidence(value)
    if (normalized.length < 4) continue
    unique.add(normalized)
    if (unique.size >= limit) break
  }
  return unique.size
}

function normalizedHeadingTitle(title) {
  return String(title)
    .replace(/[\u00a0\u2007\u2009\u200a\u202f\u3000]/g, ' ')
    .replace(/^\s*(?:\d+[.)]\s+)?(?:[^\p{L}\p{N}`]+\s*)*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function headingIsExcluded(title) {
  const normalizedTitle = normalizedHeadingTitle(title)
  return INSTALL_HEADING_RE.test(normalizedTitle) || CONFIG_HEADING_RE.test(normalizedTitle) || SETUP_EXPLANATION_HEADING_RE.test(normalizedTitle) || EXCLUDED_HEADING_RE.test(normalizedTitle) || META_HEADING_RE.test(normalizedTitle)
}

function headingKind(title) {
  const normalizedTitle = normalizedHeadingTitle(title)
  // Soft problem statements are handled by their constrained half-credit path;
  // do not let a project name such as "Demo" reroute "Why Demo" to output.
  if (SOFT_USECASE_HEADING_RE.test(normalizedTitle)) return null
  // Maintenance metadata is not a delivered output artifact.
  if (MAINTENANCE_STATUS_HEADING_RE.test(normalizedTitle)) return null
  // Preview compounds use the constrained output path rather than unknown fallback.
  if (SOFT_OUTPUT_HEADING_RE.test(normalizedTitle)) return 'output'
  // Whole compound outcome headings beat generic example/示例 usage tokens.
  if (EXACT_OUTPUT_HEADING_RE.test(normalizedTitle)) return 'output'
  // Explicit use-case headings must beat generic "use/使用" tokens.
  if (HEADING_KIND_RE.usecase.test(normalizedTitle)) return 'usecase'
  // Enumerated operating modes, bounded own workflows, and own plugin inventories are concrete project capabilities.
  if (WORK_MODE_HEADING_RE.test(normalizedTitle) || OWN_WORKFLOW_HEADING_RE.test(normalizedTitle) || OWN_PLUGIN_INVENTORY_HEADING_RE.test(normalizedTitle)) return 'capability'
  // Mechanism explanations describe capability, not operational usage.
  if (EXPLANATION_HEADING_RE.test(normalizedTitle)) return 'capability'
  // Explicit make-your-own walkthroughs are operational tutorials, not install quick starts.
  if (OWN_CREATION_TUTORIAL_HEADING_RE.test(normalizedTitle)) return 'usage'
  // Timed start / try-it headings describe operation; install variants remain excluded.
  if (TIMED_OPERATIONAL_START_HEADING_RE.test(normalizedTitle)) return 'usage'
  // Usage then beats capability for compound headings such as "Quick start (CLI)".
  if (HEADING_KIND_RE.usage.test(normalizedTitle) || COMMAND_HEADING_RE.test(normalizedTitle)) return 'usage'
  for (const kind of ['output', 'reliability', 'capability']) {
    if (HEADING_KIND_RE[kind].test(normalizedTitle)) return kind
  }
  return null
}

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([A-Za-z0-9_+.-]*)[ \t]*$/

function fenceRanges(lines) {
  const ranges = []
  for (let start = 0; start < lines.length; start++) {
    const opener = lines[start].match(FENCE_OPEN_RE)
    if (!opener) continue
    const marker = opener[1][0]
    const minimum = opener[1].length
    const closeRe = new RegExp(`^ {0,3}${marker === '`' ? '`' : '~'}{${minimum},}[ \\t]*$`)
    let end = -1
    for (let cursor = start + 1; cursor < lines.length; cursor++) {
      if (closeRe.test(lines[cursor])) {
        end = cursor
        break
      }
    }
    if (end < 0 && opener[2] === '') {
      // A bare unmatched fence may be an orphan closer. Resume only at an
      // unambiguously structural heading; never do this when a real closer exists.
      const structuralHeading = lines.findIndex((line, index) => {
        if (index <= start) return false
        const heading = line.match(HEADING_RE)
        return Boolean(heading && (headingKind(heading[2]) !== null || headingIsExcluded(heading[2])))
      })
      if (structuralHeading >= 0) end = structuralHeading - 1
    }
    if (end < 0) end = lines.length - 1
    ranges.push([start, end])
    start = end
  }
  return ranges
}

function indentedCodeLineSet(lines) {
  const hidden = new Set()
  let inBlock = false
  const indentOf = (line) => line.match(/^(?: +|\t)/)?.[0].replace(/\t/g, '    ').length ?? 0
  const isListItem = (line) => /^\s*(?:[-+*]|\d+[.)])\s+\S/.test(line)
  const nestedListUnderParent = (index) => {
    const line = lines[index]
    if (!/^(?: {4}|\t)(?:[-+*]|\d+[.)])\s+\S/.test(line)) return false
    const indent = indentOf(line)
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      if (lines[cursor].trim() === '') continue
      return isListItem(lines[cursor]) && indentOf(lines[cursor]) < indent
    }
    return false
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (nestedListUnderParent(index)) {
      inBlock = false
      continue
    }
    if (/^(?: {4}|\t)\S/.test(line) && (inBlock || index === 0 || lines[index - 1].trim() === '' || HEADING_RE.test(lines[index - 1]))) {
      inBlock = true
      hidden.add(index)
      continue
    }
    if (inBlock && (line.trim() === '' || /^(?: {4}|\t)/.test(line))) {
      hidden.add(index)
      continue
    }
    inBlock = false
  }
  return hidden
}

function hiddenLineSet(lines) {
  const hidden = new Set()
  for (const [start, end] of fenceRanges(lines)) {
    for (let index = start; index <= end; index++) hidden.add(index)
  }
  for (const index of indentedCodeLineSet(lines)) hidden.add(index)
  return hidden
}

function parseSections(text) {
  const sections = []
  const headingStack = []
  const lines = String(text).split(/\r?\n/)
  const hiddenLines = hiddenLineSet(lines)
  let sawDocumentTitle = false
  const documentTitles = new Set()
  let current = { title: '', level: 0, excluded: false, kind: 'other', isDocumentTitle: false, parentIsOther: false, documentationCapabilityEscape: false, lines: [], visible: [] }
  sections.push(current)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const markdownMatch = hiddenLines.has(index) ? null : line.match(HEADING_RE)
    const labelMatch = markdownMatch || hiddenLines.has(index)
      ? null
      : line.match(/^\s*\*\*([^*\n]{1,80})\*\*\s*(?:[（(][^\n]{0,160}[)）]\s*)?[:：]\s*(.*?)\s*$/)
    let semanticLabel = null
    if (labelMatch) {
      const visibleTitle = labelMatch[1].trim()
      const title = /^(?:会得到什么|what (?:you(?:'ll| will)? get))$/i.test(visibleTitle) ? '运行结果' : visibleTitle
      if (headingKind(title) !== null || headingIsExcluded(title)) {
        semanticLabel = { title, visibleTitle, body: labelMatch[2].trim() }
      }
    }
    const nearestMarkdownLevel = [...headingStack].reverse().find((item) => !item.semanticLabel)?.level ?? 1
    const virtualLevel = Math.min(6, nearestMarkdownLevel + 1)
    const match = markdownMatch ?? (semanticLabel ? ['', '#'.repeat(virtualLevel), semanticLabel.title] : null)
    if (!match) {
      current.lines.push(line)
      if (!hiddenLines.has(index)) current.visible.push(line)
      continue
    }
    const level = match[1].length
    const title = match[2]
      .replace(/[*_`#]/g, '')
      .replace(/[\u00a0\u2007\u2009\u200a\u202f\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[?!！。]+$/, '')
      .trim()
    const titleSignature = normalizeEvidence(title)
    const repeatedDocumentTitle = level === 1 && titleSignature !== '' && documentTitles.has(titleSignature)
    if (repeatedDocumentTitle) headingStack.length = 0
    while (headingStack.length > 0 && headingStack.at(-1).level >= level) headingStack.pop()
    const parent = headingStack.at(-1)
    const documentTitle = (!sawDocumentTitle && level === 1) || repeatedDocumentTitle
    if (level === 1 && titleSignature !== '') documentTitles.add(titleSignature)
    if (documentTitle) sawDocumentTitle = true
    // v3：自己的 reliability/troubleshooting/verification 子节可以从排除的 install/config 父节逃生
    const selfExcluded = headingIsExcluded(title)
    const escapesInstallConfig =
      headingKind(title) === 'reliability' &&
      !selfExcluded &&
      Boolean(parent?.excluded && (INSTALL_HEADING_RE.test(parent.title) || CONFIG_HEADING_RE.test(parent.title)))
    // A top-level Documentation/Docs chapter may directly contain a canonical
    // own-feature subsection. Only that explicit direct child escapes; catalogs,
    // links, and documentation nested inside excluded setup trees stay excluded.
    const escapesDocumentationCapability =
      level === 3 &&
      headingKind(title) === 'capability' &&
      DOCUMENTATION_CAPABILITY_CHILD_RE.test(normalizedHeadingTitle(title)) &&
      Boolean(parent?.level === 2 && parent.excluded && DOCUMENTATION_PARENT_HEADING_RE.test(normalizedHeadingTitle(parent.title)))
    const excluded = documentTitle ? false : selfExcluded || Boolean(parent?.excluded && !escapesInstallConfig && !escapesDocumentationCapability)
    const ownKind = excluded || documentTitle ? null : headingKind(title)
    const inheritsParent = !MARKDOWN_LINK_HEADING_RE.test(title)
    const kind = excluded ? 'excluded' : (documentTitle ? 'other' : ownKind ?? (inheritsParent ? parent?.kind : null) ?? 'other')
    // v3：未知标题的子节不进入回退（避免 "## Section A" + "### Sub" 双重计）
    const parentIsOther = Boolean(parent && !parent.isDocumentTitle && parent.title !== '' && parent.kind === 'other' && !parent.excluded)
    const documentationCapabilityEscape = escapesDocumentationCapability || Boolean(parent?.documentationCapabilityEscape)
    current = { title, level, excluded, kind, isDocumentTitle: documentTitle, parentIsOther, documentationCapabilityEscape, lines: [], visible: [] }
    sections.push(current)
    headingStack.push({ level, excluded, kind, title, isDocumentTitle: documentTitle, documentationCapabilityEscape, semanticLabel: Boolean(semanticLabel) })
    if (semanticLabel?.body) {
      const semanticBody = `${semanticLabel.visibleTitle}：${semanticLabel.body}`
      current.lines.push(semanticBody)
      current.visible.push(semanticBody)
    }
  }
  return sections
}

function classifySection(section) {
  return section.kind ?? (section.excluded ? 'excluded' : headingKind(section.title) ?? 'other')
}

function visibleLines(section) {
  return section.visible ?? section.lines
}

function contentLineEligible(line) {
  const trimmed = line.trim()
  if (!trimmed || /^[-=]{3,}$/.test(trimmed)) return false
  if (/^(?:!\[[^\]]*\]\([^)]*\)|<img\b|<a\b|\[!\[)/i.test(trimmed)) return false
  return true
}

function contentLines(section) {
  return visibleLines(section).filter(contentLineEligible)
}

function markdownTextBlocks(section) {
  const blocks = []
  let current = null
  const flush = () => {
    if (!current) return
    current.value = current.lines.map((line) => line.trim()).join(' ').replace(/\s+/g, ' ').trim()
    blocks.push(current)
    current = null
  }
  for (const line of visibleLines(section)) {
    if (!contentLineEligible(line) || line.includes('|')) {
      flush()
      continue
    }
    const list = /^\s*(?:[-+*]|\d+[.)])\s+\S/.test(line)
    if (list) {
      flush()
      current = { kind: 'list', lines: [line] }
      continue
    }
    if (current?.kind === 'list' && /^\s{2,}\S/.test(line)) {
      current.lines.push(line)
      continue
    }
    if (current?.kind !== 'prose') {
      flush()
      current = { kind: 'prose', lines: [line] }
    } else {
      current.lines.push(line)
    }
  }
  flush()
  return blocks
}

function listItems(section, excludeSetupSteps = false) {
  return markdownTextBlocks(section)
    .filter((block) => block.kind === 'list')
    .map((block) => block.value)
    .filter((line) => !INSTALL_COMMAND_RE.test(line) && (!excludeSetupSteps || !INSTALL_STEP_RE.test(line)))
    .filter((line) => !DECOR_BULLET_RE.test(line) && !CATALOG_ENTRY_RE.test(line) && !EXTERNAL_REPO_LINK_RE.test(line))
}

function paragraphs(section, excludeSetupSteps = false) {
  return markdownTextBlocks(section)
    .filter((block) => block.kind === 'prose')
    .map((block) => block.value)
    .filter((line) => line.trim().length >= 24 && !INSTALL_COMMAND_RE.test(line) && !EXTERNAL_REPO_LINK_RE.test(line) && (!excludeSetupSteps || !INSTALL_STEP_RE.test(line)))
    .filter((line) => !/^\[[^\]]*\]\([^)]*\)\s*$/.test(line) && !/^https?:\/\/\S+$/.test(line))
}

function semanticParagraphs(section) {
  return markdownTextBlocks(section)
    .filter((block) => block.kind === 'prose')
    .map((block) => block.value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))
    .filter((line) => (line.trim().length >= 24 || releaseChannelCapabilityFact(line)) && !INSTALL_COMMAND_RE.test(line) && !INSTALL_STEP_RE.test(line))
    .filter((line) => !/^https?:\/\/\S+$/.test(line))
}

function capabilityParagraphs(section) {
  return paragraphs(section, false)
    .filter((line) => !semanticMetaContent(line))
    .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line) && !configurationContent(line))
    .filter((line) => !CAPABILITY_MIGRATION_GUARD_RE.test(line))
    .filter((line) => PARAGRAPH_CAPABILITY_FACT_RE.test(line) || SUBJECT_CAPABILITY_VERB_RE.test(line) || CAPABILITY_ACTION_RE.test(line) || MECHANISM_FACT_RE.test(line) || CJK_CAPABILITY_FACT_RE.test(line))
}

function usageParagraphs(section) {
  return [
    ...paragraphs(section, true)
      .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line) && !configurationContent(line))
      .filter((line) => ACTION_VERB_RE.test(line) || INLINE_ACTION_VERB_RE.test(line) || cjkCompoundActionLine(line) || quotedPromptAction(line)),
    ...contentLines(section).filter(quotedPromptAction),
  ]
}

function tableRows(section) {
  const lines = contentLines(section)
  return lines.filter((line, index) => {
    if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) return false
    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
    if (cells.length < 2) return false
    if (cells.every((cell) => /^\[[^\]]*\]\([^)\s]*\)$/.test(cell) || /^https?:\/\/\S+$/.test(cell))) return false
    if (CATALOG_TABLE_ROW_RE.test(line) || EXTERNAL_REPO_LINK_RE.test(line)) return false
    const next = lines[index + 1] ?? ''
    const previous = lines[index - 1] ?? ''
    const nextDivider = /^\s*\|?\s*:?-{3,}/.test(next)
    const previousDivider = /^\s*\|?\s*:?-{3,}/.test(previous)
    return previousDivider || (!nextDivider && index > 1)
  })
}

function shortScreenshotCaptionRow(cells, tableHasMedia) {
  if (!tableHasMedia || cells.some((cell) => /!\[[^\]]*\]\([^)]*\)|<img\b/i.test(cell))) return false
  const labels = cells.map((cell) => normalizeEvidence(cell))
  return labels.length >= 2 && labels.every((label) => label.length > 0 && [...label].length <= 8)
}

function semanticTableRows(section) {
  const lines = contentLines(section)
  const rows = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const headers = (lines[divider - 1] ?? '').split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
    if (section.kind === 'usage'
      && headers.some((cell) => CONFIG_TABLE_KEY_HEADER_RE.test(cell))
      && headers.some((cell) => CONFIG_TABLE_VALUE_HEADER_RE.test(cell))) continue
    const table = []
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (CATALOG_TABLE_ROW_RE.test(line) || EXTERNAL_REPO_LINK_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
      if (cells.length >= 2) table.push({ line: line.trim(), cells, first: cells[0].replace(/\*\*/g, '').trim() })
    }
    const tableHasMedia = /!\[[^\]]*\]\([^)]*\)|<img\b/i.test(lines[divider - 1] ?? '')
      || table.some(({ line }) => /!\[[^\]]*\]\([^)]*\)|<img\b/i.test(line))
    const semantic = table.filter(({ cells }) => !shortScreenshotCaptionRow(cells, tableHasMedia))
    const methodPathReference = headers.some((cell) => TABLE_METHOD_HEADER_RE.test(cell)) && headers.some((cell) => TABLE_PATH_HEADER_RE.test(cell))
    const commandReference = semantic.filter(({ first }) => COMMAND_TABLE_CELL_RE.test(first) || (TOOL_REFERENCE_HEADING_RE.test(section.title) && TOOL_TABLE_CELL_RE.test(first))).length >= 2
    const values = semantic.map(({ line }) => line)
    rows.push(...((methodPathReference || commandReference) ? values.slice(0, 1) : values))
  }
  return rows
}

function commandTableActions(section) {
  if (section.excluded || DEVELOPER_CONTEXT_HEADING_RE.test(normalizedHeadingTitle(section.title))) return []
  const lines = contentLines(section)
  const actions = []
  const slashCellContext = COMMAND_HEADING_RE.test(section.title)
    || TOOL_REFERENCE_HEADING_RE.test(section.title)
    || API_HEADING_RE.test(section.title)
    || section.kind === 'usage'
  for (let index = 1; index < lines.length; index++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[index - 1])) continue
    for (let cursor = index; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (CATALOG_TABLE_ROW_RE.test(line) || EXTERNAL_REPO_LINK_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
      if (cells.length < 2) break
      const first = cells[0].replace(/\*\*/g, '').trim()
      if (actionEligibleCommand(first) && (COMMAND_TABLE_CELL_RE.test(first) || (TOOL_REFERENCE_HEADING_RE.test(section.title) && TOOL_TABLE_CELL_RE.test(first)))) actions.push(first)
      if (!slashCellContext) continue
      for (const cell of cells) {
        for (const match of cell.matchAll(/`(\/[\w:-]+(?:\s+[\w-]+)?)`/g)) {
          if (actionEligibleCommand(match[1])) actions.push(match[1])
        }
      }
    }
  }
  return actions
}

function commandSectionActions(section) {
  if (section.excluded || DEVELOPER_CONTEXT_HEADING_RE.test(normalizedHeadingTitle(section.title)) || !COMMAND_HEADING_RE.test(section.title)) return []
  return contentLines(section)
    .filter((line) => !line.includes('|'))
    .map((line) => line.trim().replace(/^`|`$/g, ''))
    .filter((line) => actionEligibleCommand(line) && BARE_COMMAND_LINE_RE.test(line))
}

function actionEligibleCommand(line) {
  return !INSTALL_COMMAND_RE.test(line)
    && !INSTALL_STEP_RE.test(line)
    && !configurationContent(line)
    && !EXTERNAL_REPO_LINK_RE.test(line)
    && !/^https?:\/\//i.test(line)
}

function slashCommandActions(section) {
  if (section.excluded) return []
  return contentLines(section)
    .map((line) => line.trim().replace(/^[-+*]\s+/, '').replace(/^`|`$/g, ''))
    .filter((line) => actionEligibleCommand(line) && /^\/[\w:-]+(?:\s+[^#]{0,120})?(?:\s+#\s*\S.*)?$/.test(line))
}

function fencedReferenceActions(section) {
  if (section.excluded || DEVELOPER_CONTEXT_HEADING_RE.test(normalizedHeadingTitle(section.title)) || !(COMMAND_HEADING_RE.test(section.title) || API_HEADING_RE.test(section.title) || TOOL_REFERENCE_HEADING_RE.test(section.title))) return []
  return fencedBlocks(section.lines.join('\n'))
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim().replace(/^[$>]\s*/, '').replace(/\\\s*$/, '').trim())
    .filter((line) => actionEligibleCommand(line) && BARE_COMMAND_LINE_RE.test(line))
}

function fencedOperationalActions(section) {
  if (section.excluded || (section.kind !== 'usage' && !PROMPT_GUIDANCE_HEADING_RE.test(normalizedHeadingTitle(section.title))) || DEVELOPER_CONTEXT_HEADING_RE.test(normalizedHeadingTitle(section.title)) || GENERIC_USAGE_HEADING_RE.test(section.title)) return []
  const candidates = fencedBlocks(section.lines.join('\n')).flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim().replace(/^[$>]\s*/, '').replace(/\\\s*$/, '').trim())
    .filter((line) => actionEligibleCommand(line) && BARE_COMMAND_LINE_RE.test(line))
  if (candidates.length < 2) return []
  const tokenCounts = new Map()
  for (const line of candidates) {
    const token = line.match(/^[^\s]+/)?.[0]?.toLowerCase()
    if (token) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1)
  }
  const dominant = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!dominant || dominant[1] < 2) return []
  return candidates.filter((line) => line.toLowerCase().startsWith(`${dominant[0]} `) || line.toLowerCase() === dominant[0])
}

function fencedCapabilityStages(section) {
  if (section.excluded || section.kind !== 'capability' || !EXPLANATION_HEADING_RE.test(normalizedHeadingTitle(section.title))) return []
  const stages = fencedBlocks(section.lines.join('\n'), 4).flatMap((block) => {
    const candidates = block.split(/\r?\n/).map((line) => line.match(FLOW_STAGE_RE)?.[1]?.trim()).filter(Boolean)
    return candidates
      .filter((line) => practicalContentEligible(line) && concreteFlowStage(line))
      .filter((line) => !CATALOG_ENTRY_RE.test(line) && !EXTERNAL_REPO_LINK_RE.test(line) && !FALLBACK_MARKETING_PROSE_RE.test(line))
  })
  return stages
}

function semanticTablePairs(section) {
  if (section.excluded) return []
  const lines = contentLines(section)
  const pairs = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const headers = (lines[divider - 1] ?? '').split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
    const inputIndex = headers.findIndex((cell) => TABLE_INPUT_HEADER_RE.test(cell))
    const outputIndex = headers.findIndex((cell) => TABLE_OUTPUT_HEADER_RE.test(cell))
    if (inputIndex < 0 || outputIndex < 0) continue
    const ambiguousSemantics = /^(?:situation|scenario|use case|情况|场景)$/i.test(headers[inputIndex])
      && /^(?:behavior|effect|行为|效果)$/i.test(headers[outputIndex])
    const candidateRows = []
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (EXTERNAL_REPO_LINK_RE.test(line) || INSTALL_COMMAND_RE.test(line) || INSTALL_STEP_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
      if (cells.length >= 2) candidateRows.push({ line: line.trim(), input: cells[inputIndex] ?? '' })
    }
    if (ambiguousSemantics) {
      const userShaped = candidateRows.filter(({ input }) => /[?？]$/.test(input) || /^[_*]*["“].+["”][_*]*$/.test(input) || ACTION_VERB_RE.test(input))
      if (userShaped.length * 2 < candidateRows.length) continue
    }
    pairs.push(...candidateRows.map(({ line }) => line))
  }
  return pairs
}

function endpointTablePairs(section) {
  if (section.excluded || !API_HEADING_RE.test(section.title)) return []
  const lines = contentLines(section)
  const pairs = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const headers = (lines[divider - 1] ?? '').split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
    const endpointIndex = headers.findIndex((cell) => /^(?:endpoint|route|url|端点|路由|接口)$/i.test(cell))
    const hasExplicitOutputColumn = headers.some((cell) => TABLE_OUTPUT_HEADER_RE.test(cell))
    if (endpointIndex < 0) continue
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (EXTERNAL_REPO_LINK_RE.test(line) || INSTALL_COMMAND_RE.test(line) || INSTALL_STEP_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
      if (!/(?:GET|POST|PUT|PATCH|DELETE)\s+\//i.test(cells[endpointIndex] ?? '')) continue
      if (hasExplicitOutputColumn || cells.some((cell, index) => index !== endpointIndex && API_RESULT_CELL_RE.test(cell))) pairs.push(line.trim())
    }
  }
  return pairs
}

function splitEndpointTablePairs(section) {
  if (section.excluded || !API_HEADING_RE.test(section.title)) return []
  const lines = contentLines(section)
  const pairs = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const headers = (lines[divider - 1] ?? '').split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
    const methodIndex = headers.findIndex((cell) => TABLE_METHOD_HEADER_RE.test(cell))
    const pathIndex = headers.findIndex((cell) => TABLE_PATH_HEADER_RE.test(cell))
    if (methodIndex < 0 || pathIndex < 0) continue
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (EXTERNAL_REPO_LINK_RE.test(line) || INSTALL_COMMAND_RE.test(line) || INSTALL_STEP_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
      if (!/^(?:GET|POST|PUT|PATCH|DELETE)$/i.test(cells[methodIndex] ?? '') || !/^\/?api\//i.test(cells[pathIndex] ?? '')) continue
      const hasExplicitOutputColumn = headers.some((cell) => TABLE_OUTPUT_HEADER_RE.test(cell))
      if (hasExplicitOutputColumn || cells.some((cell, index) => index !== methodIndex && index !== pathIndex && API_RESULT_CELL_RE.test(cell))) pairs.push(line.trim())
    }
  }
  return pairs
}

const IO_PAIR_WINDOW = 3

function labeledIoPairs(lines) {
  const pairs = []
  let pendingInput = null
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')) continue
    const isInput = INPUT_RE.test(line)
    const isOutput = OUTPUT_RE.test(line)
    if (isInput && isOutput) {
      pairs.push(line)
      pendingInput = null
      continue
    }
    if (isInput) {
      pendingInput = { line, index }
      continue
    }
    if (isOutput && pendingInput && index - pendingInput.index <= IO_PAIR_WINDOW) {
      pairs.push(`${pendingInput.line} | ${line}`)
      pendingInput = null
    }
  }
  return pairs
}

function measuredResultTableRows(section) {
  if (section.excluded || META_HEADING_RE.test(section.title) || INSTALL_HEADING_RE.test(section.title) || CONFIG_HEADING_RE.test(section.title)) return []
  const lines = contentLines(section)
  const tables = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const rows = []
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (CATALOG_TABLE_ROW_RE.test(line) || EXTERNAL_REPO_LINK_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
      if (cells.filter((cell) => MEASURED_TABLE_CELL_RE.test(cell)).length >= 2) rows.push(line.trim())
    }
    if (rows.length >= 2) tables.push(...rows)
  }
  return tables
}

function usecaseTableRows(section) {
  if (section.excluded || section.kind === 'usecase' || COMMAND_HEADING_RE.test(section.title) || TOOL_REFERENCE_HEADING_RE.test(section.title) || API_HEADING_RE.test(section.title)) return []
  const lines = contentLines(section)
  const items = []
  for (let divider = 1; divider < lines.length; divider++) {
    if (!/^\s*\|?\s*:?-{3,}/.test(lines[divider])) continue
    const headers = (lines[divider - 1] ?? '').split('|').map((cell) => cell.replace(/[*`]/g, '').trim()).filter(Boolean)
    const usecaseIndex = headers.findIndex((cell) => TABLE_USECASE_HEADER_RE.test(cell))
    if (usecaseIndex < 0) continue
    for (let cursor = divider + 1; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      if (!line.includes('|') || /^\s*\|?\s*:?-{3,}/.test(line)) break
      if (EXTERNAL_REPO_LINK_RE.test(line) || INSTALL_COMMAND_RE.test(line) || INSTALL_STEP_RE.test(line)) continue
      const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
      const value = cells[usecaseIndex]?.replace(/[*`]/g, '').trim()
      if (value && value.length >= 8) items.push(value)
    }
  }
  return items
}

function qaItems(section) {
  const lines = contentLines(section)
  const items = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim()
    if (line.length < 12 || !QA_LINE_RE.test(line)) continue
    const previous = index > 0 ? lines[index - 1].trim() : ''
    // 紧跟问题行的回答并入问题项，避免一对 Q&A 计成两项
    if (QA_QUESTION_RE.test(previous) && !QA_QUESTION_RE.test(line)) continue
    items.push(line)
  }
  return items
}

function admonitionItems(section) {
  return contentLines(section).filter((line) => {
    const trimmed = line.trim()
    return ADMONITION_RE.test(trimmed) && trimmed.length >= 16
  })
}

function fencedBlocks(text, minimumLength = 12) {
  const lines = String(text).split(/\r?\n/)
  return fenceRanges(lines)
    .map(([start, end]) => lines.slice(start + 1, end))
    .map((blockLines) => blockLines
      .filter((line) => !INSTALL_COMMAND_RE.test(line) && !CONFIG_KEY_RE.test(line) && !CONFIG_ASSIGN_RE.test(line))
      .join('\n')
      .trim())
    .filter((block) => block.length >= minimumLength)
}

function operationFenceSkeleton(block) {
  return block.split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:[$/]\S+)\s+/, '').replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean)
}

function dedupeOperationFences(blocks) {
  const kept = []
  for (const block of blocks) {
    const skeleton = operationFenceSkeleton(block)
    const duplicate = kept.some((candidate) => {
      const prior = operationFenceSkeleton(candidate)
      const overlap = skeleton.filter((line) => prior.includes(line)).length
      return overlap >= 2 && (overlap === skeleton.length || overlap === prior.length)
    })
    if (!duplicate) kept.push(block)
  }
  return kept
}

function mediaWeight(src) {
  if (!src) return 1
  if (/^(?:https?:)?\/\//.test(src)) {
    return /githubusercontent\.com|github\.com\//i.test(src) ? 1 : 0.5
  }
  return 1
}

// v3：徽章过滤看 URL/文件名模式；本地/仓库托管的真实截图权重 1，外部图床权重 0.5
function mediaEvidence(text) {
  const markdown = [...String(text).matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]
    .map((match) => ({ alt: match[1] ?? '', src: match[2] ?? '' }))
  const html = [...String(text).matchAll(/<img\b[^>]*>/gi)].map((match) => {
    const tag = match[0]
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? ''
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? ''
    return { alt, src }
  })
  const best = new Map()
  for (const { alt, src } of [...markdown, ...html]) {
    const combined = `${alt} ${src}`.trim()
    if (!combined) continue
    if (BADGE_URL_RE.test(src)) continue
    if (BADGE_ALT_RE.test(alt)) continue
    if (PLANNED_MEDIA_RE.test(combined)) continue
    if (DECORATIVE_MEDIA_RE.test(src)) continue
    const key = normalizeEvidence(combined)
    if (!key || key.length < 4) continue
    best.set(key, Math.max(best.get(key) ?? 0, mediaWeight(src)))
  }
  for (const match of String(text).matchAll(/(^|[^!\[])\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (match[2].includes('![')) continue
    if (EXTERNAL_REPO_LINK_RE.test(match[0])) continue
    if (!MEDIA_LINK_TEXT_RE.test(match[2]) || !MEDIA_VIDEO_URL_RE.test(match[3])) continue
    const key = match[3].toLowerCase().replace(/\s+/g, '').trim()
    if (!key || key.length < 4) continue
    best.set(key, Math.max(best.get(key) ?? 0, mediaWeight(match[3])))
  }
  return [...best.values()]
}

function collapseExactDocumentCopies(text) {
  let value = String(text)
  let changed = true
  while (changed) {
    changed = false
    for (let separatorLength = 0; separatorLength <= 4; separatorLength++) {
      const contentLength = value.length - separatorLength
      if (contentLength <= 0 || contentLength % 2 !== 0) continue
      const midpoint = contentLength / 2
      const separator = value.slice(midpoint, midpoint + separatorLength)
      if (!/^\s*$/.test(separator)) continue
      if (value.slice(0, midpoint) !== value.slice(midpoint + separatorLength)) continue
      value = value.slice(0, midpoint)
      changed = true
      break
    }
  }
  return value
}

const LANGUAGE_HEADING_PATTERNS = [
  ['zh', /(?:^|[（(]\s*)(?:简体中文|繁體中文|繁体中文|中文)(?:\s*[)）]|$)/i],
  ['en', /(?:^|[（(]\s*)english(?:\s*[)）]|$)/i],
  ['ru', /(?:^|[（(]\s*)(?:русский|русская версия)(?:\s*[)）]|$)/i],
  ['ja', /(?:^|[（(]\s*)(?:日本語|日本語版)(?:\s*[)）]|$)/i],
  ['ko', /(?:^|[（(]\s*)(?:한국어|한국어판)(?:\s*[)）]|$)/i],
  ['es', /(?:^|[（(]\s*)(?:español|castellano)(?:\s*[)）]|$)/i],
]

function explicitLanguageCopies(text) {
  const lines = String(text).split(/\r?\n/)
  const markers = []
  for (let index = 0; index < lines.length; index++) {
    const heading = lines[index].match(/^(#{1,2})\s+(.+?)\s*$/)
    if (!heading) continue
    const title = heading[2].replace(/[*_`#]/g, '').trim()
    const language = LANGUAGE_HEADING_PATTERNS.find(([, pattern]) => pattern.test(title))?.[0]
    if (language) markers.push({ index, language })
  }
  if (new Set(markers.map((marker) => marker.language)).size < 2) return null
  const preamble = lines.slice(0, markers[0].index).join('\n').trim()
  const copies = markers.map((marker, index) => {
    const end = markers[index + 1]?.index ?? lines.length
    const body = lines.slice(marker.index, end).join('\n').trim()
    return preamble ? `${preamble}\n\n${body}` : body
  })
  return copies.length >= 2 && copies.every((copy) => copy.length >= 24) ? copies : null
}

function maxCopyEvidence(copies) {
  const parsed = copies.map((copy) => practicalEvidence(copy)).filter(Boolean)
  const fields = ['capability_items', 'usage_items', 'usage_actions', 'io_pairs', 'code_examples', 'usecase_items', 'output_items', 'media', 'reliability_items']
  const result = Object.fromEntries(fields.map((field) => [field, Math.max(...parsed.map((item) => item[field]))]))
  const values = fields.map((field) => result[field])
  const coverage = values.filter((value) => value > 0).length / values.length
  const fallback_share = Math.max(...parsed.map((item) => item.confidence.fallback_share))
  const totalUnits = values.reduce((sum, value) => sum + value, 0)
  const overall = totalUnits === 0 ? 0 : Math.min(0.5 * coverage + 0.5 * (1 - fallback_share), 1)
  const round3 = (value) => Math.round(value * 1000) / 1000
  return {
    version: README_PRACTICAL_VERSION,
    parser_revision: README_PRACTICAL_PARSER_REVISION,
    ...result,
    confidence: { overall: round3(overall), coverage: round3(coverage), fallback_share: round3(fallback_share) },
  }
}

// 模块级等价实现：practicalEvidence 内部的同名 const 仅在其函数作用域可见，
// fallback 路径（模块层）需要同样的判定时使用本函数（内层遮蔽，行为一致）。
function measuredOutputFact(line) {
  const value = String(line).replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
  return value.length <= 240
    && MEASURED_OUTPUT_VERB_RE.test(value)
    && MEASURED_OUTPUT_VALUE_RE.test(value)
    && MEASURED_OUTPUT_NOUN_RE.test(value)
}

function fallbackReplacementSubstantive(line) {
  return concreteCapabilityFact(line)
    || PARAGRAPH_CAPABILITY_FACT_RE.test(line)
    || SUBJECT_CAPABILITY_VERB_RE.test(line)
    || MECHANISM_FACT_RE.test(line)
    || concreteInstructionClaim(line)
    || USECASE_TASK_CONTEXT_RE.test(line)
    && !(CONCRETE_OUTPUT_FACT_RE.test(line) || RESULT_LABELED_FACT_RE.test(line) || measuredOutputFact(line))
    || concreteActionClaim(line)
    || preambleProductFact(line)
    || RELIABILITY_FACT_RE.test(line)
    || RELIABILITY_CLAIM_RE.test(line)
    || RELIABILITY_VERIFICATION_BOUNDARY_RE.test(line)
    || CONCRETE_OUTPUT_FACT_RE.test(line)
}

// 未知标题的确定性内容门控回退：仅当内容达到实质门槛且标题通过噪声/营销控制。
// 返回回退条目标题（以 0.5 权重计入 capability），否则 null。
function fallbackItemFor(section) {
  const title = section.title
  if (!title || section.isDocumentTitle || section.parentIsOther) return null
  if (section.level < 2) return null
  const trimmed = title.trim()
  if (trimmed.length < 2 || trimmed.length > 48) return null
  if (FALLBACK_NOISE_RE.test(title)) return null
  if (FALLBACK_MARKETING_TITLE_RE.test(title)) return null
  const tokens = trimmed.split(/\s+/)
  const allCjk = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u.test(trimmed)
  if (tokens.length === 1 && !/[-—]/.test(trimmed) && !allCjk) return null
  const lines = contentLines(section)
  const proseCandidates = lines
    .filter((line) => !/^\s*(?:[-+*]|\d+[.)])\s+/.test(line) && !line.includes('|'))
    .map((line) => line.trim())
    .filter((line) => line.length >= 32)
  const bulletCandidates = listItems(section, true)
  if (proseCandidates.length === 0 && bulletCandidates.length < 2) return null
  const legacyProse = proseCandidates
    .filter((line) => !semanticMetaContent(line))
  const legacyBullets = bulletCandidates
    .filter((line) => !semanticMetaContent(line))
    .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line))
  if (legacyProse.length === 0 && legacyBullets.length === 0) return null
  if (legacyProse.some((line) => FALLBACK_MARKETING_PROSE_RE.test(line))) return null
  const legacySelected = legacyBullets[0] ?? legacyProse[0]
  if (fallbackSemanticContentEligible(legacySelected)) return legacySelected
  const replacements = [...legacyBullets, ...legacyProse]
    .filter((line) => line !== legacySelected)
    .filter(fallbackSemanticContentEligible)
    .filter(fallbackReplacementSubstantive)
  const selected = replacements[0]
  if (!selected) return null
  // Use the substantive content itself as the shared claim key. Prefixing the
  // heading creates a second key and can double-own the same reliability fact.
  return selected
}

function normalizeHtmlTables(text) {
  return String(text).replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (table, body) => {
    const media = [...table.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0])
    const prose = []
    for (const match of body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)) {
      const cell = match[1]
      if (!/(?:<br\s*\/?\s*>\s*){2,}/i.test(cell)) continue
      for (const part of cell.split(/(?:<br\s*\/?\s*>\s*){2,}/i)) {
        const value = part.replace(/<img\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|amp|lt|gt);/gi, ' ').replace(/\s+/g, ' ').trim()
        if (value.length >= 24) prose.push(value)
      }
    }
    return [...prose, ...media].join('\n\n')
  })
}

export function practicalEvidence(text) {
  if (text == null || !String(text).trim()) return null
  const bounded = normalizeHtmlTables(String(text).slice(0, README_MAX_CHARS))
  const copies = explicitLanguageCopies(bounded)
  if (copies) return maxCopyEvidence(copies)
  const source = collapseExactDocumentCopies(bounded)
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => {
      const title = body
        .replace(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/gi, ' $1 ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&(?:nbsp|amp|lt|gt);/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return title ? `\n${'#'.repeat(Number(level))} ${title}\n` : '\n'
    })
  const sections = parseSections(source)
  const classified = sections.map((section) => ({ ...section, kind: classifySection(section) }))
  const byKind = (kind) => classified.filter((section) => section.kind === kind)
  const sectionItems = (kind) => byKind(kind).flatMap((section) => {
    const items = [
      ...listItems(section, kind === 'usage'),
      ...semanticTableRows(section),
    ].filter(semanticContentEligible)
      // 修复（冻结评审 owner F-2）：capability 列表项主路径未过迁移守卫，
      // roadmap 未来式 bullet（Will add/Will ship/计划/即将）不得计任何家族证据。
      // 修复轮 2（评审 adversarial I-2）：主观质量赞美 bullet 在三族标题下零贡献。
      .filter((line) => !fallbackPlannedContent(line))
      .filter((line) => {
        if (kind !== 'reliability' && kind !== 'usecase' && kind !== 'output') return true
        return !SUBJECTIVE_QUALITY_RE.test(line) || substantiveStatement(line)
      })
    if (kind === 'capability' && section.documentationCapabilityEscape) {
      return items
        .filter((line) => DOCUMENTATION_FEATURE_ITEM_RE.test(line))
        .filter((line) => practicalContentEligible(line) && !CAPABILITY_MIGRATION_GUARD_RE.test(line))
    }
    return items
  })
  const sectionParagraphs = (kind) => byKind(kind).flatMap((section) => {
    const values = kind === 'usage' ? usageParagraphs(section) : kind === 'capability' ? capabilityParagraphs(section) : paragraphs(section, false)
    return kind === 'capability' && section.documentationCapabilityEscape ? [] : values
  })
  // Any non-excluded section can contain a statement whose sentence semantics
  // are more specific than its heading (for example, a concrete artifact in a
  // scenario). Collect the same bounded evidence shapes everywhere; the shared
  // claim set still assigns each substantive statement to exactly one family.
  const semanticFactLines = classified
    .filter((section) => !section.excluded)
    .flatMap((section) => [
      ...listItems(section, false),
      ...tableRows(section),
      ...semanticParagraphs(section),
    ])
  // v3：usecase/output/reliability 也统计受约束段落 + Q&A + admonition
  const sectionProse = (kind) => byKind(kind).flatMap((section) => {
    // rev3：标题作用域散文补实质语义门（QA/admonition 为结构化证据，保持既有资格门）；
    // reliability/usecase/output 三族散文必须过 substantiveStatement（灌水向量实证均为段落）。
    const prose = paragraphs(section, false).filter((line) => !QA_LINE_RE.test(line.trim()))
    const gated = kind === 'reliability' || kind === 'usecase' || kind === 'output'
      ? prose.filter((l) => substantiveStatement(l) || (kind === 'reliability' && RELIABILITY_PROSE_FACT_RE.test(l)))
      : prose
    return [
      ...gated,
      ...qaItems(section),
      ...admonitionItems(section),
    ].filter(semanticContentEligible)
  })
  const activeSections = classified.filter((section) => section.kind !== 'excluded')
  const actionEligible = (line) => !CATALOG_ENTRY_RE.test(line)
    && !EXTERNAL_REPO_LINK_RE.test(line)
    && !INSTALL_COMMAND_RE.test(line)
    && !INSTALL_STEP_RE.test(line)
    && !configurationContent(line)
  const globalActionLines = activeSections.flatMap((section) => contentLines(section).filter((line) =>
    actionEligible(line)
    && (((['usage', 'usecase'].includes(section.kind) || BASIC_FLOW_HEADING_RE.test(section.title))
      && (concreteActionClaim(line)
        || concreteInstructionClaim(line)
        || (section.kind === 'usage' && quotedPromptAction(line))
        || (BASIC_FLOW_HEADING_RE.test(section.title) && quotedPromptAction(line))))
      || (section.kind !== 'other' && cjkCompoundActionLine(line))
      || (section.kind !== 'other' && /^\s*(?:(?:[-+*]|\d+[.)])\s+)?ask\s+for\b/i.test(line) && concreteActionClaim(line))),
  ))
  const labeledIoPairLines = activeSections.flatMap((section) => labeledIoPairs(contentLines(section)))

  // v3 全局精确/近似去重：同一归一化主张在 capability/usage/usecase/output/reliability
  // 之间只计一次（usage_actions / io / code / media 为结构计数，不共享该集合）
  const globalSeen = new Set()
  const claim = (value, weight = 1) => {
    const key = semanticClaimKey(value)
    if (!key || key.length < 4) return 0
    if (globalSeen.has(key)) return 0
    globalSeen.add(key)
    return weight
  }
  const claimAll = (values, weight = 1) => values.reduce((sum, value) => sum + claim(value, weight), 0)

  const migratedReliabilityLines = semanticFactLines.filter((line) =>
    !fallbackPlannedContent(line)
    && !personaUsecaseFact(line)
    && (RELIABILITY_FACT_RE.test(line)
    || RELIABILITY_CLAIM_RE.test(line)
    || RELIABILITY_VERIFICATION_BOUNDARY_RE.test(line)
    || (RELIABILITY_DOMAIN_RE.test(line) && RELIABILITY_CONSEQUENCE_RE.test(line))))
  const measuredOutputFact = (line) => {
    const value = line.replace(/^\s*(?:(?:[-+*]|\d+[.)])\s+)/, '')
    return value.length <= 240
      && MEASURED_OUTPUT_VERB_RE.test(value)
      && MEASURED_OUTPUT_VALUE_RE.test(value)
      && MEASURED_OUTPUT_NOUN_RE.test(value)
  }
  const migratedOutputLines = semanticFactLines.filter((line) =>
    !fallbackPlannedContent(line)
    && !RELIABILITY_FACT_RE.test(line)
    && !FALLBACK_MARKETING_PROSE_RE.test(line)
    && (CONCRETE_OUTPUT_FACT_RE.test(line) || measuredOutputFact(line) || RESULT_LABELED_FACT_RE.test(line)))
  const personaShortProseLines = classified
    .filter((section) => !section.excluded)
    .flatMap((section) => contentLines(section))
    .map((line) => line.trim())
    .filter((line) => line.length >= 4 && line.length < 24)
    .filter((line) => !/^\s*(?:[-+*]|\d+[.)])\s+\S/.test(line) && !line.includes('|'))
    .filter((line) => !INSTALL_COMMAND_RE.test(line) && !INSTALL_STEP_RE.test(line) && !EXTERNAL_REPO_LINK_RE.test(line))
    .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line))
    .filter((line) => !CONCRETE_OUTPUT_FACT_RE.test(line))
    .filter(personaUsecaseFact)
  const migratedUsecaseLines = [
    ...semanticFactLines.filter((line) =>
      !fallbackPlannedContent(line)
      && !CONCRETE_OUTPUT_FACT_RE.test(line)
      && !FALLBACK_MARKETING_PROSE_RE.test(line)
      && usecaseSemanticFact(line)),
    ...personaShortProseLines,
  ]
  // 修复（冻结评审 adversarial F-2）：标题作用域证据要求实质内容。采用全解析器
  // 具体语义信号并集（各家族既有门的总和），只拒绝零语义填充行，保住格式等价
  // （bullets/table/heading+description/Q&A 同语义同分）不变量；家族归属仍由
  // 标题分类 + 全局 claim 顺序决定。
  const substantiveStatement = (line) =>
    // 祈使场景句（Audit a release before deployment. / 比较两次运行的回归结果。）
    /(?:^|\n)\s*(?:[-+*]|\d+[.)])?\s*(?:audit|review|compare|validate|verify|debug|test|triage|investigate|monitor|manage|operate|build|develop|ship|migrate|rename|export|import|convert|generate|deploy|install\b.{0,40}(?:verify|run))\b[^.!?]*[.!?]?/i.test(line)
    || /(?:审查|审核|比较|对比|验证|校验|调试|测试|排查|监控|管理|迁移|重命名|导出|导入|转换|生成|部署|批量|保存|召回|筛选|接收|继续|记住|展示|搜索|打开|选择|整理|清理|同步|追踪|记录|读取|写入|检查|修复|恢复|备份|上传|下载|发送|执行|启动|撰写|编写|构建|编译)[^。\n]*[。！!]?/.test(line)
    || PARAGRAPH_CAPABILITY_FACT_RE.test(line)
    || SUBJECT_CAPABILITY_VERB_RE.test(line)
    || CAPABILITY_ACTION_RE.test(line)
    || MECHANISM_FACT_RE.test(line)
    || CJK_CAPABILITY_FACT_RE.test(line)
    || CAPABILITY_FACT_RE.test(line)
    || ACTION_VERB_RE.test(line)
    || INLINE_ACTION_VERB_RE.test(line)
    || cjkCompoundActionLine(line)
    || quotedPromptAction(line)
    || EXPLICIT_USECASE_FACT_RE.test(line)
    || personaUsecaseFact(line)
    || concreteActionClaim(line)
    || concreteInstructionClaim(line)
    || concreteCapabilityFact(line)
    || RELIABILITY_FACT_RE.test(line)
    || RELIABILITY_CLAIM_RE.test(line)
    || RELIABILITY_VERIFICATION_BOUNDARY_RE.test(line)
    || RELIABILITY_DOMAIN_RE.test(line)
    || RELIABILITY_CONSEQUENCE_RE.test(line)
    || /(?:\b(?:is\s+|are\s+)?supported\b|\brequires\b|\bcompatib(?:le|ility)\b|\bunsupported\b|\bworks?\s+(?:on|with)\b|不(?:支持|兼容)|仅(?:支持|兼容)|需要|兼容)/i.test(line)
    || /\bif\b[^.\n]{0,60}\b(?:fails?|failed|rejected|errors?|broken)\b/i.test(line)
    || /\b(?:includes?|contains?)\b/i.test(line)
    || /\b(?:saves?|stores?|writes?)\b[^.\n]{0,60}\b(?:to|into)\b/i.test(line)
    || /\b(?:the\s+)?(?:result|outcome)\s+is\b/i.test(line)
    || /\b(?:outside|beyond)\b[^.\n]{0,40}\bscope\b|\bnot\s+yet\b/i.test(line)
    || CONCRETE_OUTPUT_FACT_RE.test(line)
    || measuredOutputFact(line)
    || RESULT_LABELED_FACT_RE.test(line)
  const hardOutputSections = byKind('output').filter((section) => !SOFT_OUTPUT_HEADING_RE.test(section.title))
  const hardOutputValues = hardOutputSections.flatMap((section) => {
    // 修复（冻结评审 adversarial F-2）：output 标题下的段落必须陈述具体产出/结果；
    // 结构化行排除 roadmap 未来式 bullet。
    const structured = [...listItems(section), ...tableRows(section)].filter(semanticContentEligible).filter((line) => !fallbackPlannedContent(line))
    const qaAndAdmonitions = [...qaItems(section), ...admonitionItems(section)].filter(semanticContentEligible)
    const prose = mediaEvidence(visibleLines(section).join('\n')).length > 0
      ? [
          ...paragraphs(section, false).filter((line) => !QA_LINE_RE.test(line.trim())).filter(semanticContentEligible).filter(substantiveStatement).map((line) => ({ value: line, weight: 0.5 })),
          ...qaAndAdmonitions.map((line) => ({ value: line, weight: 1 })),
        ]
      : paragraphs(section, false).filter((line) => !QA_LINE_RE.test(line.trim())).filter(semanticContentEligible).filter(substantiveStatement).concat(qaAndAdmonitions).map((line) => ({ value: line, weight: 1 }))
    return [...structured.map((line) => ({ value: line, weight: 1 })), ...prose]
  })

  // Semantic ownership follows the frozen oracle rubric: the most specific
  // family claims a statement before broader usage/capability fallback.
  // 修复（冻结评审 adversarial F-2）：reliability 标题下的中性散文/填充 bullet 必须有
  // 可靠性语义（事实/声明/验证边界/领域+后果），否则零贡献，不再刷满族上限。
  // 灌水向量实证为段落（12 段中性散文刷满族上限）；bullet/table 行受格式等价约束
  // 不做内容白名单，身份/roadmap 排除仍在 semanticContentEligible 链上。
  const reliabilityUnits = claimAll(migratedReliabilityLines)
    + claimAll(sectionItems('reliability'))
    + claimAll(sectionProse('reliability'))
  let outputUnits = claimAll(migratedOutputLines) + hardOutputValues.reduce((sum, item) => sum + claim(item.value, item.weight), 0)
  outputUnits += claimAll(classified.flatMap(measuredResultTableRows))
  // 修复（冻结评审 adversarial F-2 / owner F-3）：usecase 段落要求实质语义，纯身份
  // bullet 排除；bullet/table 行保持格式等价原行为。
  let usecaseUnits = claimAll(migratedUsecaseLines)
    + claimAll(sectionItems('usecase').filter((line) => !personaIdentityContent(line)))
    + claimAll(sectionProse('usecase'))
  usecaseUnits += claimAll(classified.flatMap(usecaseTableRows))
  const usageUnits = claimAll([...sectionItems('usage'), ...sectionParagraphs('usage')])
  const capabilityMain = claimAll([
    ...sectionItems('capability'),
    ...sectionParagraphs('capability'),
    ...byKind('capability').flatMap(fencedCapabilityStages),
  ])

  // Why/Motivation/Problem often mixes a real problem statement with positioning.
  // Credit only concrete list/table items at half weight; never reward marketing prose.
  for (const section of classified.filter((item) => item.kind === 'other' && SOFT_USECASE_HEADING_RE.test(item.title))) {
    const items = [...listItems(section, false), ...tableRows(section)]
      // 修复（冻结评审 adversarial-fresh2 F1）：Why/Motivation 半分路径缺身份/meta 门，
      // 纯职业/团队身份 bullet 每条 0.5 可刷满 usecase 上限。
      .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line)
        && !personaIdentityContent(line)
        && !semanticMetaContent(line)
        && !fallbackPlannedContent(line)
        && substantiveStatement(line))
    usecaseUnits += claimAll(items, 0.5)
  }
  // Preview is not itself a delivered result. Structured facts receive half
  // credit; rendered-state prose receives the same constrained half credit
  // only when the section contains non-decorative media evidence.
  for (const section of byKind('output').filter((item) => SOFT_OUTPUT_HEADING_RE.test(item.title))) {
    outputUnits += claimAll([...listItems(section), ...tableRows(section)], 0.5)
    if (mediaEvidence(visibleLines(section).join('\n')).length > 0) {
      outputUnits += claimAll(
        paragraphs(section, false)
          .filter((line) => !QA_LINE_RE.test(line.trim()))
          .filter((line) => !FALLBACK_MARKETING_PROSE_RE.test(line)),
        0.5,
      )
    }
  }

  // v3 前言实质要点 → capability（身份/描述段落不计，只计非安装、非需求、非营销的要点）
  const preambleBullets = classified
    .filter((section) => section.title === '' || section.isDocumentTitle)
    .flatMap((section) => listItems(section, true))
    .filter(semanticContentEligible)
    .filter((bullet) => !REQUIREMENT_BULLET_RE.test(bullet))
    .filter((bullet) => !fallbackPlannedContent(bullet))
    .filter((bullet) => !IDENTITY_ONLY_RE.test(bullet))
  const preambleParagraphs = classified
    .filter((section) => section.title === '' || section.isDocumentTitle)
    .flatMap((section) => markdownTextBlocks(section)
      .filter((block) => block.kind === 'prose')
      .map((block) => block.value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')))
    .filter(semanticContentEligible)
    .filter((line) => !CAPABILITY_MIGRATION_GUARD_RE.test(line))
    .filter(preambleProductFact)
  const preambleUnits = claimAll([...preambleBullets, ...preambleParagraphs])

  // v3 品牌/非标准标题回退：严格门控 + 0.5 低权重
  let fallbackWeighted = 0
  for (const section of classified) {
    if (section.kind !== 'other' || section.excluded) continue
    if (SOFT_USECASE_HEADING_RE.test(section.title)) continue
    const item = fallbackItemFor(section)
    if (item) fallbackWeighted += claim(item, FALLBACK_WEIGHT)
  }

  const migratedCapabilityLines = semanticFactLines.filter((line) =>
    normalizeEvidence(line).length >= 12
    && semanticContentEligible(line)
    && concreteCapabilityFact(line)
    && !CAPABILITY_MIGRATION_GUARD_RE.test(line))
  const migratedCapabilityUnits = claimAll(migratedCapabilityLines)

  const mediaUnits = Math.min(
    mediaEvidence(activeSections
      .filter((section) => !PLANNED_MEDIA_RE.test(section.title))
      .map((section) => visibleLines(section).join('\n'))
      .join('\n'))
      .reduce((sum, weight) => sum + weight, 0),
    6,
  )

  const capability_items = Math.min(capabilityMain + preambleUnits + fallbackWeighted + migratedCapabilityUnits, 12)
  const usage_items = Math.min(usageUnits, 10)
  const usage_actions = uniqueActionCount([
    ...globalActionLines,
    ...activeSections.flatMap(commandTableActions),
    ...activeSections.flatMap(commandSectionActions),
    ...activeSections.flatMap(slashCommandActions),
    ...activeSections.flatMap(fencedReferenceActions),
    ...activeSections.flatMap(fencedOperationalActions),
  ], 10)
  const endpointPairs = uniqueCount(classified.flatMap(endpointTablePairs), 8)
  const splitEndpointPairs = uniqueCount(classified.flatMap(splitEndpointTablePairs), 8)
  const tablePairs = uniqueCount(classified.flatMap(semanticTablePairs), 8)
  const io_pairs = Math.min(Math.max(uniqueCount(labeledIoPairLines, 8), endpointPairs, splitEndpointPairs, tablePairs), 8)
  const usageCodeBlocks = dedupeOperationFences(fencedBlocks(byKind('usage').map((section) => section.lines.join('\n')).join('\n'))
    .filter((block) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      const hasQuotedPrompt = lines.some((line) => /^>\s+\S/.test(line))
      const hasStrongRunnableLine = lines.some((line) => !/^>\s/.test(line) && STRONG_RUNNABLE_LINE_RE.test(line))
      return !hasQuotedPrompt || hasStrongRunnableLine
    }))
  const code_examples = uniqueCount(usageCodeBlocks, 4)
  const usecase_items = Math.min(usecaseUnits, 10)
  const output_items = Math.min(outputUnits, 8)
  const media = mediaUnits
  const reliability_items = Math.min(reliabilityUnits, 10)

  const values = [capability_items, usage_items, usage_actions, io_pairs, code_examples, usecase_items, output_items, media, reliability_items]
  const totalUnits = values.reduce((sum, value) => sum + value, 0)
  const coverage = values.filter((value) => value > 0).length / values.length
  const fallback_share = totalUnits > 0 ? Math.min(fallbackWeighted / totalUnits, 1) : 0
  // 没有任何证据时整体置信度为 0（而不是公式空转出的 0.5）
  const overall = totalUnits === 0 ? 0 : Math.min(0.5 * coverage + 0.5 * (1 - fallback_share), 1)
  const round3 = (value) => Math.round(value * 1000) / 1000

  return {
    version: README_PRACTICAL_VERSION,
    parser_revision: README_PRACTICAL_PARSER_REVISION,
    capability_items,
    usage_items,
    usage_actions,
    io_pairs,
    code_examples,
    usecase_items,
    output_items,
    media,
    reliability_items,
    confidence: {
      overall: round3(overall),
      coverage: round3(coverage),
      fallback_share: round3(fallback_share),
    },
  }
}

/** README 静态信号的唯一解析入口：旧字段服务 ease，新 practical 证据服务实用分。 */
export function readmeSignals(text) {
  const t = String(text ?? '')
  const len = t.length
  const lines = t.split(/\r?\n/)
  let section = ''
  let start = -1
  let level = 0
  let hasInstallSection = false
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,4})\s+(.+)$/)
    if (!match) continue
    const headingLevel = match[1].length
    if (start < 0) {
      if (INSTALL_SECTION_RE.test(match[2])) {
        start = i
        level = headingLevel
        hasInstallSection = true
      }
    } else if (headingLevel <= level) {
      section = lines.slice(start + 1, i).join('\n')
      start = -2
    }
  }
  if (start >= 0) section = lines.slice(start + 1).join('\n')

  const commands = []
  const pushCommand = (line) => {
    let command = line.trim().replace(/^[$#>]\s*/, '').replace(/\s*#.*$/, '').trim()
    if (/^(cd |mkdir |echo |touch |cat >|ls |rm )/.test(command) && !command.includes('&&')) return
    if (command && INSTALL_CMD_RE.test(command) && !commands.includes(command) && commands.length < 3) commands.push(command)
  }
  const scanCommands = (source) => {
    for (const match of source.matchAll(/```(?:bash|sh|shell|console|zsh)?\s*\n([\s\S]*?)```/g)) {
      for (const line of match[1].split(/\r?\n/)) if (commands.length < 3) pushCommand(line)
    }
    for (const line of source.split(/\r?\n/)) {
      if (commands.length >= 3) break
      if (/^\s*[$#>]\s*/.test(line)) pushCommand(line)
    }
  }
  scanCommands(section)
  if (commands.length === 0) scanCommands(t)

  return {
    readme_len: len > 0 ? len : null,
    readme_install_section: hasInstallSection,
    readme_code_blocks: (t.match(/```/g) ?? []).length,
    readme_heading: /^#\s+./m.test(t),
    readme_cmds: commands,
    readme_needs_config: CONFIG_KEY_RE.test(t.replace(NEGATION_RE, ' ')),
    readme_practical: practicalEvidence(t),
  }
}
