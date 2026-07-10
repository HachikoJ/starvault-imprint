const { isNxCadRepository, nxCadMatchedTerms } = require("./domain-relevance");

const CATEGORY_RULES = [
  {
    key: "product-starters",
    label: "Product Starters & App Templates",
    keywords: [
      "starter",
      "template",
      "boilerplate",
      "scaffold",
      "fullstack",
      "full-stack",
      "production-ready",
      "self-hosted",
      "selfhosted",
      "open-source-alternative",
      "alternative",
      "clone",
      "app-shell",
      "saas-starter"
    ],
    productWeight: 1.34
  },
  {
    key: "ai-native-products",
    label: "AI Apps & Assistants",
    keywords: [
      "ai-app",
      "ai-application",
      "rag",
      "chatbot",
      "llm",
      "copilot",
      "assistant",
      "prompt",
      "workflow",
      "voice",
      "multimodal",
      "mcp",
      "model-context-protocol",
      "generative-ai",
      "agent",
      "agents",
      "ai-agent"
    ],
    productWeight: 0.96
  },
  {
    key: "developer-productivity",
    label: "Developer Productivity & AI Coding",
    keywords: [
      "cli",
      "sdk",
      "developer",
      "developer-tools",
      "testing",
      "ci",
      "lint",
      "debug",
      "docs",
      "ide",
      "vscode",
      "terminal",
      "codex",
      "claude-code",
      "cursor",
      "aider",
      "codegen",
      "code-review",
      "devtools",
      "git"
    ],
    productWeight: 1.16
  },
  {
    key: "business-saas",
    label: "SaaS & Business Systems",
    keywords: [
      "admin",
      "dashboard",
      "crm",
      "billing",
      "stripe",
      "auth",
      "tenant",
      "workflow",
      "form",
      "ticket",
      "erp",
      "hr",
      "email",
      "calendar",
      "sales",
      "support",
      "project-management",
      "internal-tool"
    ],
    productWeight: 1.18
  },
  {
    key: "data-knowledge",
    label: "Data, Analytics & Knowledge",
    keywords: [
      "database",
      "analytics",
      "etl",
      "pipeline",
      "warehouse",
      "chart",
      "bi",
      "query",
      "lake",
      "vector",
      "embedding",
      "search",
      "knowledge-graph",
      "graph",
      "retrieval",
      "dataset"
    ],
    productWeight: 1.11
  },
  {
    key: "infra-cloud",
    label: "Infra, Cloud & Platform Engineering",
    keywords: [
      "kubernetes",
      "docker",
      "cloud",
      "serverless",
      "devops",
      "sre",
      "observability",
      "monitoring",
      "terraform",
      "iac",
      "platform",
      "deployment",
      "ci-cd",
      "tracing",
      "logging",
      "opentelemetry"
    ],
    productWeight: 1.05
  },
  {
    key: "security-compliance",
    label: "Security, Privacy & Compliance",
    keywords: [
      "security",
      "cybersecurity",
      "security-skills",
      "cloud-security",
      "devsecops",
      "scanner",
      "vulnerability",
      "secret",
      "sast",
      "pentest",
      "compliance",
      "privacy",
      "iam",
      "zero-trust",
      "malware",
      "forensics",
      "llm-security",
      "redteam",
      "incident"
    ],
    productWeight: 1.09
  },
  {
    key: "frontend-creative",
    label: "Frontend, Design & Creative Tools",
    keywords: [
      "ui",
      "component",
      "design-system",
      "tailwind",
      "react",
      "vue",
      "svelte",
      "css",
      "figma",
      "framer",
      "webflow",
      "prototype",
      "wireframe",
      "motion",
      "illustration",
      "brand",
      "typography",
      "canvas",
      "video",
      "image",
      "creative",
      "generator",
      "webgl",
      "three",
      "animation",
      "editor"
    ],
    productWeight: 1.14
  },
  {
    key: "creative-media",
    label: "Creative Media & Content Production",
    keywords: [
      "video",
      "audio",
      "music",
      "podcast",
      "voice",
      "tts",
      "subtitle",
      "caption",
      "realtime",
      "render",
      "timeline",
      "creator",
      "content",
      "media",
      "animation",
      "thumbnail",
      "shorts",
      "motion",
      "illustration",
      "voiceover",
      "sound-design",
      "mixing"
    ],
    productWeight: 1.24
  },
  {
    key: "consumer-productivity",
    label: "Consumer Productivity & Personal Tools",
    keywords: [
      "note",
      "notes",
      "browser",
      "productivity",
      "desktop",
      "mobile",
      "pdf",
      "local-first",
      "personal",
      "bookmark",
      "calendar",
      "habit",
      "email-client"
    ],
    productWeight: 1.04
  },
  {
    key: "commerce-growth-content",
    label: "Commerce, Growth & Content",
    keywords: [
      "ecommerce",
      "shop",
      "payment",
      "checkout",
      "marketing",
      "seo",
      "cms",
      "content",
      "newsletter",
      "landing",
      "growth",
      "creator",
      "social",
      "blog"
    ],
    productWeight: 1.1
  },
  {
    key: "vertical-domain",
    label: "Vertical & Domain Applications",
    keywords: [
      "finance",
      "fintech",
      "trading",
      "education",
      "edtech",
      "healthcare",
      "medical",
      "legal",
      "legaltech",
      "real-estate",
      "robotics",
      "iot",
      "bioinformatics",
      "geospatial",
      "climate",
      "science"
    ],
    productWeight: 1.08
  },
  {
    key: "systems-runtime-edge",
    label: "Systems, Runtime & Edge",
    keywords: [
      "compiler",
      "runtime",
      "operating-system",
      "kernel",
      "wasm",
      "webassembly",
      "edge",
      "embedded",
      "database-engine",
      "cache",
      "queue",
      "network",
      "protocol",
      "language",
      "vm",
      "rust",
      "go"
    ],
    productWeight: 0.95
  },
  {
    key: "learning-research-assets",
    label: "Learning, Lists & Research Assets",
    keywords: [
      "awesome",
      "course",
      "tutorial",
      "examples",
      "learn",
      "guide",
      "book",
      "paper",
      "benchmark",
      "leaderboard"
    ],
    productWeight: 0.68
  }
];

const USE_CASE_RULES = [
  {
    key: "product-starter",
    label: "Product starter",
    labelZh: "产品模板",
    summaryZh: "提供可运行的应用基础模板、脚手架或全栈示例",
    summaryEn: "Provide runnable app templates, scaffolds, or full-stack product examples",
    patterns: [/saas[-\s_]?starter/i, /starter kit/i, /boilerplate/i, /scaffold/i, /full[-\s]?stack starter/i, /production[-\s]?ready template/i]
  },
  {
    key: "open-source-alternative",
    label: "Open-source alternative",
    labelZh: "开源替代品",
    summaryZh: "参考成熟产品形态，适合研究差异化表达和应用路径",
    summaryEn: "Reference a known product shape for differentiation and application study",
    patterns: [/open[-\s]?source alternative/i, /alternative to/i, /open source.*alternative/i, /clone/i]
  },
  {
    key: "self-hosted-app",
    label: "Self-hosted app",
    labelZh: "自托管应用",
    summaryZh: "提供可私有部署的完整应用，适合自用、私有化或垂直化改造",
    summaryEn: "Provide a deployable self-hosted app for personal, private, or vertical use",
    patterns: [/self[-\s]?hosted/i, /selfhosted/i, /docker compose/i, /private deployment/i]
  },
  {
    key: "app-shell",
    label: "App shell",
    labelZh: "应用工作台",
    summaryZh: "已经具备界面、工作流或业务闭环，适合观察清晰应用路径",
    summaryEn: "Already has UI, workflows, or a business loop with a clear application path",
    patterns: [/app shell/i, /dashboard/i, /admin panel/i, /workspace/i, /studio/i, /portal/i, /console/i]
  },
  {
    key: "browser-extension",
    label: "Browser extension",
    labelZh: "浏览器插件",
    summaryZh: "围绕浏览器场景提供插件能力，适合做个人效率或垂直工作流产品",
    summaryEn: "Provide browser-extension workflows for productivity or vertical tools",
    patterns: [/browser[-\s]?extension/i, /chrome[-\s]?extension/i, /firefox[-\s]?extension/i]
  },
  {
    key: "desktop-mobile-app",
    label: "Desktop or mobile app",
    labelZh: "桌面/移动应用",
    summaryZh: "面向终端用户的桌面或移动应用，可评估成独立工具产品",
    summaryEn: "End-user desktop or mobile app that can become a standalone tool",
    patterns: [/desktop app/i, /mobile app/i, /electron/i, /tauri/i, /react native/i, /flutter/i]
  },
  {
    key: "browser-automation",
    label: "Browser automation",
    labelZh: "浏览器自动化",
    summaryZh: "让 AI 或脚本在网页里点击、填写、抓取和完成任务",
    summaryEn: "Let AI or scripts click, fill, extract, and complete web tasks",
    patterns: [/browser[-\s_]?harness/i, /browser[-\s_]?use/i, /browser[-\s_]?automation/i, /browser agent/i, /websites accessible/i]
  },
  {
    key: "ai-role-library",
    label: "AI role library",
    labelZh: "AI 角色库",
    summaryZh: "沉淀可复用的专家角色、提示词和任务分工模板",
    summaryEn: "Package reusable expert roles, prompts, and task templates",
    patterns: [/agency[-\s_]?agents/i, /agent definitions?/i, /ai roles?/i, /expert roles?/i, /personas?/i]
  },
  {
    key: "ai-memory",
    label: "AI memory",
    labelZh: "AI 记忆服务",
    summaryZh: "为 AI 应用提供长期记忆、个性化上下文和用户偏好管理",
    summaryEn: "Provide long-term memory, personalized context, and preference management for AI apps",
    patterns: [/mem0/i, /memory layer/i, /ai memory/i, /memory for ai/i, /personalized ai/i, /long[-\s]?term memory/i]
  },
  {
    key: "ai-agent-os",
    label: "AI agent OS",
    labelZh: "AI 任务操作系统",
    summaryZh: "为 AI 应用提供任务运行、工具接入和上下文管理底座",
    summaryEn: "Provide task runtime, tool access, and context management for AI apps",
    patterns: [/agent operating system/i, /open-source agent operating system/i]
  },
  {
    key: "spec-driven-dev",
    label: "Spec-driven development",
    labelZh: "规格驱动开发",
    summaryZh: "把需求规格转成开发计划、任务拆解和可执行实现路径",
    summaryEn: "Turn specs into implementation plans, task breakdowns, and executable paths",
    patterns: [/spec[-\s]?kit/i, /spec[-\s]?driven/i, /specification/i]
  },
  {
    key: "llm-app-gallery",
    label: "LLM app gallery",
    labelZh: "大模型应用合集",
    summaryZh: "汇总可运行、可改造的 AI 应用和 RAG 案例",
    summaryEn: "Curate runnable and adaptable AI app and RAG examples",
    patterns: [/awesome.*llm.*apps?/i, /llm apps?.*clone/i, /AI Agent & RAG apps/i]
  },
  {
    key: "ai-design-tool",
    label: "AI design tool",
    labelZh: "AI 设计工具",
    summaryZh: "生成界面原型、设计系统素材和多端页面草稿",
    summaryEn: "Generate UI prototypes, design-system assets, and multi-device drafts",
    patterns: [/open[-\s_]?design/i, /claude design/i, /ui-generator/i, /figma-alternative/i, /design-tools/i, /prototyping/i]
  },
  {
    key: "creative-video-editing",
    label: "Video editing",
    labelZh: "视频剪辑",
    summaryZh: "剪辑、拼接、字幕和导出视频内容",
    summaryEn: "Edit, assemble, subtitle, and export video content",
    patterns: [/video[-\s_]?editor/i, /video editing/i, /timeline/i, /shorts/i, /subtitle/i, /caption/i, /render/i]
  },
  {
    key: "creative-audio-music",
    label: "Audio and music",
    labelZh: "音频与音乐",
    summaryZh: "制作音频、音乐、混音和声音素材",
    summaryEn: "Produce audio, music, mixing, or sound assets",
    patterns: [/audio/i, /music/i, /beat/i, /mix/i, /sound/i, /track/i]
  },
  {
    key: "creative-podcast-voice",
    label: "Podcast and voice",
    labelZh: "播客与语音",
    summaryZh: "处理播客、配音、语音合成和口播内容",
    summaryEn: "Handle podcasts, dubbing, voice synthesis, and spoken content",
    patterns: [/podcast/i, /voice/i, /tts/i, /dub/i, /narrat/i]
  },
  {
    key: "creative-media-production",
    label: "Creative media production",
    labelZh: "内容创作工具",
    summaryZh: "生成、剪辑或整理视频、音频、音乐、播客和字幕内容",
    summaryEn: "Generate, edit, or organize video, audio, music, podcast, and subtitle content",
    patterns: [/creator/i, /content/i, /media/i, /studio/i, /production/i, /publishing/i, /motion/i, /illustration/i, /voiceover/i, /sound-design/i, /mixing/i]
  },
  {
    key: "presentation-generation",
    label: "Presentation generation",
    labelZh: "PPT 生成工具",
    summaryZh: "把文档或素材转换成可编辑演示文稿",
    summaryEn: "Turn documents or assets into editable presentations",
    patterns: [/ppt/i, /powerpoint/i, /presentation/i, /slides?/i, /pptx/i]
  },
  {
    key: "model-serving",
    label: "Model serving",
    labelZh: "大模型推理服务",
    summaryZh: "提升大模型推理、部署和服务吞吐效率",
    summaryEn: "Improve LLM inference, deployment, and serving throughput",
    patterns: [/vllm/i, /inference/i, /serving engine/i, /model serving/i, /managed inference/i]
  },
  {
    key: "information-extraction",
    label: "Information extraction",
    labelZh: "信息抽取",
    summaryZh: "从文本或文档中抽取结构化信息并保留来源依据",
    summaryEn: "Extract structured information from text or documents with source grounding",
    patterns: [/langextract/i, /extracting structured information/i, /information extraction/i, /source grounding/i]
  },
  {
    key: "design-reference",
    label: "Design reference",
    labelZh: "设计参考库",
    summaryZh: "整理品牌设计规范、界面风格和可复用设计上下文",
    summaryEn: "Curate brand design references, UI styles, and reusable design context",
    patterns: [/awesome.*design/i, /design[-\s_]?md/i, /brand design systems?/i, /design tokens/i, /style guide/i, /visual identity/i]
  },
  {
    key: "automation-usecases",
    label: "Automation use cases",
    labelZh: "自动化场景案例库",
    summaryZh: "整理办公、内容、运维和知识管理自动化场景",
    summaryEn: "Curate office, content, ops, and knowledge-management automation scenarios",
    patterns: [/openclaw.*usecases?/i, /usecases?.*automation/i, /usecases?.*自动化办公/i, /真实场景/i]
  },
  {
    key: "security-skills",
    label: "Security skills",
    labelZh: "安全技能库",
    summaryZh: "整理安全技能、攻防框架或合规知识",
    summaryEn: "Organize security skills, attack frameworks, or compliance knowledge",
    patterns: [/cybersecurity/i, /security skills?/i, /mitre/i, /attack/i, /nist/i, /owasp/i, /vulnerabil/i]
  },
  {
    key: "knowledge-graph",
    label: "Knowledge graph",
    labelZh: "知识图谱工具",
    summaryZh: "把代码、文档或知识结构转成可交互图谱",
    summaryEn: "Turn code, docs, or knowledge into an interactive graph",
    patterns: [/knowledge graph/i, /interactive knowledge graph/i, /graphify/i, /code graph/i, /understand-anything/i]
  },
  {
    key: "learning-assets",
    label: "Learning assets",
    labelZh: "学习资料",
    summaryZh: "把教程、示例和实践路径组织成可学习资料",
    summaryEn: "Organize tutorials, examples, and practice paths into learning assets",
    patterns: [/course/i, /learn/i, /tutorial/i, /from[-\s]?scratch/i, /educational/i, /teaching/i, /best[-\s]?practice/i]
  },
  {
    key: "ai-workflow",
    label: "AI workflow",
    labelZh: "AI 工作流",
    summaryZh: "把信息收集、工具调用、执行和结果汇总串成自动流程",
    summaryEn: "Chain multiple AI steps to complete complex tasks automatically",
    patterns: [/multi[-\s]?agent/i, /swarm/i, /orchestrat/i, /autonomous/i, /agentic workflow/i]
  },
  {
    key: "ai-assistant",
    label: "AI assistant",
    labelZh: "AI 编程助手",
    summaryZh: "提升编码、命令行和工程效率",
    summaryEn: "Improve coding, terminal, and engineering efficiency",
    patterns: [/ai[-\s]?coding/i, /agent harness/i, /claude code/i, /codex/i, /cursor/i, /opencode/i, /gemini cli/i, /developer tool/i, /devtool/i, /cli/i, /terminal/i, /command line/i]
  },
  {
    key: "knowledge-search",
    label: "Knowledge search",
    labelZh: "知识检索",
    summaryZh: "做语义检索、问答或资料索引",
    summaryEn: "Provide semantic search, Q&A, or indexed retrieval",
    patterns: [/rag/i, /vector/i, /semantic search/i, /knowledge base/i, /search/i]
  },
  {
    key: "admin-saas",
    label: "Backend SaaS",
    labelZh: "后台模板",
    summaryZh: "搭建后台、仪表盘或业务系统",
    summaryEn: "Build admin panels, dashboards, or business systems",
    patterns: [/dashboard/i, /admin/i, /backoffice/i, /\bcrm\b/i, /\berp\b/i, /saas starter/i]
  },
  {
    key: "finance-tools",
    label: "Finance tools",
    labelZh: "金融工具",
    summaryZh: "处理金融、交易或财务场景",
    summaryEn: "Support finance, trading, or accounting scenarios",
    patterns: [/finance/i, /trading/i, /stock/i, /portfolio/i, /invoice/i, /accounting/i, /quant/i]
  },
  {
    key: "sre-ops",
    label: "SRE operations",
    labelZh: "SRE 运维",
    summaryZh: "处理告警、故障定位、可观测性和自动化修复",
    summaryEn: "Handle alerts, incident diagnosis, observability, and automated remediation",
    patterns: [/sre/i, /observability/i, /incident/i, /root[-\s]?cause/i, /remediation/i, /alerting/i, /grafana/i, /datadog/i]
  },
  {
    key: "data-analytics",
    label: "Data analytics",
    labelZh: "数据分析",
    summaryZh: "做数据处理、分析或自动报表",
    summaryEn: "Handle data processing, analytics, or automated reports",
    patterns: [/etl/i, /pipeline/i, /analytics/i, /analysis/i, /database/i, /warehouse/i]
  },
  {
    key: "security-tools",
    label: "Security tools",
    labelZh: "安全检查",
    summaryZh: "做风险扫描、隐私检查或审计流程",
    summaryEn: "Provide risk scanning, privacy checks, or audit workflows",
    patterns: [/scanner/i, /privacy/i, /compliance/i, /audit/i]
  },
  {
    key: "frontend-creative",
    label: "Frontend creative",
    labelZh: "前端创意工具",
    summaryZh: "做组件、编辑器、设计系统或创意工具",
    summaryEn: "Build components, editors, design systems, or creative tools",
    patterns: [/ui component/i, /design system/i, /frontend/i, /editor/i, /canvas/i, /creative/i, /prototype/i, /wireframe/i, /motion/i, /illustration/i, /framer/i, /webflow/i]
  },
  {
    key: "commerce-growth",
    label: "Commerce growth",
    labelZh: "内容与增长",
    summaryZh: "支撑内容生产、增长或电商运营",
    summaryEn: "Support content creation, growth, or commerce operations",
    patterns: [/cms/i, /content/i, /ecommerce/i, /commerce/i, /marketing/i, /growth/i]
  },
  {
    key: "platform-engineering",
    label: "Platform engineering",
    labelZh: "平台工程",
    summaryZh: "提供部署、监控或平台工程能力",
    summaryEn: "Provide deployment, monitoring, or platform engineering capabilities",
    patterns: [/kubernetes/i, /cloud/i, /infra/i, /observability/i, /monitoring/i, /runtime/i, /edge/i, /deploy/i]
  },
  {
    key: "personal-efficiency",
    label: "Personal efficiency",
    labelZh: "个人效率",
    summaryZh: "管理个人任务、本地数据或日常工作流",
    summaryEn: "Manage personal tasks, local data, or daily workflows",
    patterns: [/local[-\s]?first/i, /notes?/i, /calendar/i, /task/i, /productivity/i, /personal/i]
  }
];

const PERMISSIVE_COMMERCIAL = new Set([
  "mit",
  "apache-2.0",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "unlicense",
  "0bsd",
  "zlib"
]);

const CONDITIONAL_COMMERCIAL = new Set([
  "mpl-2.0",
  "lgpl-2.1",
  "lgpl-2.1-only",
  "lgpl-2.1-or-later",
  "lgpl-3.0",
  "lgpl-3.0-only",
  "lgpl-3.0-or-later",
  "epl-2.0",
  "eupl-1.2",
  "cc-by-4.0"
]);

const DISTRIBUTION_COPYLEFT = new Set([
  "gpl-2.0",
  "gpl-2.0-only",
  "gpl-2.0-or-later",
  "gpl-3.0",
  "gpl-3.0-only",
  "gpl-3.0-or-later"
]);

const NETWORK_COPYLEFT = new Set([
  "agpl-3.0",
  "agpl-3.0-only",
  "agpl-3.0-or-later",
  "sspl-1.0",
  "osl-3.0"
]);

const RESTRICTED_NONCOMMERCIAL = new Set([
  "cc-by-nc-4.0"
]);

const KEYWORD_WEIGHTS = {
  "product-starters": {
    starter: 5,
    template: 4,
    boilerplate: 4,
    scaffold: 4,
    fullstack: 4,
    "full-stack": 4,
    "production-ready": 5,
    "self-hosted": 4,
    selfhosted: 4,
    "open-source-alternative": 5,
    alternative: 3,
    clone: 3,
    "app-shell": 5,
    "saas-starter": 5
  },
  "ai-native-products": {
    "ai-app": 4,
    "ai-application": 4,
    rag: 2,
    chatbot: 3,
    llm: 1.5,
    copilot: 2,
    assistant: 2,
    mcp: 3,
    "model-context-protocol": 4,
    multimodal: 3,
    agent: 1,
    agents: 1,
    "ai-agent": 1
  },
  "developer-productivity": {
    cli: 4,
    sdk: 3,
    "developer-tools": 4,
    ide: 3,
    vscode: 3,
    terminal: 3,
    codex: 3,
    "claude-code": 3,
    cursor: 3,
    codegen: 3,
    "code-review": 3,
    git: 2
  },
  "business-saas": {
    crm: 4,
    billing: 3,
    tenant: 3,
    ticket: 3,
    erp: 4,
    "internal-tool": 3,
    admin: 2,
    dashboard: 2
  },
  "data-knowledge": {
    database: 4,
    vector: 4,
    embedding: 3,
    "knowledge-graph": 4,
    etl: 3,
    pipeline: 3,
    analytics: 2,
    warehouse: 3,
    search: 2
  },
  "infra-cloud": {
    kubernetes: 4,
    docker: 3,
    terraform: 4,
    observability: 3,
    opentelemetry: 4,
    deployment: 2,
    platform: 2
  },
  "security-compliance": {
    security: 3,
    cybersecurity: 5,
    "security-skills": 5,
    "cloud-security": 3,
    devsecops: 3,
    scanner: 3,
    vulnerability: 4,
    secret: 3,
    sast: 4,
    pentest: 4,
    privacy: 3,
    iam: 3,
    redteam: 4
  },
  "frontend-creative": {
    "design-system": 4,
    figma: 3,
    component: 3,
    ui: 2,
    canvas: 3,
    video: 2,
    image: 2,
    editor: 2
  },
  "creative-media": {
    video: 5,
    audio: 4,
    music: 5,
    podcast: 4,
    voice: 4,
    tts: 4,
    subtitle: 4,
    caption: 3,
    render: 3,
    timeline: 3,
    creator: 2,
    media: 2,
    animation: 3,
    thumbnail: 3,
    shorts: 2
  },
  "commerce-growth-content": {
    ecommerce: 4,
    checkout: 3,
    payment: 3,
    marketing: 3,
    seo: 3,
    cms: 3,
    newsletter: 3
  },
  "vertical-domain": {
    finance: 3,
    fintech: 4,
    trading: 3,
    healthcare: 4,
    medical: 4,
    legal: 3,
    robotics: 4,
    geospatial: 4
  },
  "systems-runtime-edge": {
    compiler: 4,
    runtime: 3,
    kernel: 4,
    wasm: 4,
    webassembly: 4,
    embedded: 4,
    protocol: 3,
    vm: 3
  },
  "learning-research-assets": {
    awesome: 4,
    tutorial: 3,
    course: 3,
    benchmark: 3,
    leaderboard: 3,
    paper: 3
  }
};

const PRODUCT_SIGNAL_RULES = [
  { key: "starter-template", label: "starter/template shell", score: 18, pattern: /\b(starter|template|boilerplate|scaffold|full[-\s]?stack)\b/i },
  { key: "self-hosted", label: "self-hosted deployment", score: 16, pattern: /self[-\s]?hosted|selfhosted|docker compose/i },
  { key: "app-surface", label: "app UI surface", score: 14, pattern: /\b(app|dashboard|admin|portal|console|workspace|studio)\b/i },
  { key: "editor-workbench", label: "editor/workbench workflow", score: 14, pattern: /\b(editor|canvas|timeline|cms|builder|workbench)\b/i },
  { key: "business-flow", label: "business workflow", score: 13, pattern: /\b(crm|erp|billing|checkout|invoice|tenant|stripe|ecommerce|marketplace)\b/i },
  { key: "end-user-app", label: "end-user app channel", score: 12, pattern: /\b(desktop app|mobile app|browser extension|chrome extension|electron|tauri|react native|flutter)\b/i },
  { key: "creative-production", label: "creative production workflow", score: 12, pattern: /\b(video editor|audio editor|podcast|subtitle editor|screen recorder|presentation|whiteboard|diagram|design tool)\b/i },
  { key: "vertical-workflow", label: "vertical workflow", score: 11, pattern: /\b(helpdesk|invoice|booking|travel planner|job search|learning app|healthcare app|legal app|finance dashboard)\b/i },
  { key: "known-product-shape", label: "known product shape", score: 11, pattern: /open[-\s]?source alternative|alternative to|clone/i },
  { key: "domain-product", label: "vertical product domain", score: 10, pattern: /\b(finance|trading|education|healthcare|medical|legal|real estate|accounting)\b/i }
];

const PACKAGING_SIGNAL_RULES = [
  { key: "homepage-demo", label: "homepage/demo surface", score: 10, pattern: /\b(demo|preview|showcase|homepage|live demo)\b/i },
  { key: "deployable", label: "deployable setup", score: 10, pattern: /\b(docker|compose|deploy|self-hosted|helm|vercel|railway|installation|quickstart)\b/i },
  { key: "docs", label: "docs/quickstart", score: 7, pattern: /\b(docs|documentation|guide|quickstart|getting started)\b/i },
  { key: "integration-ready", label: "integration-ready", score: 7, pattern: /\b(api|sdk|plugin|integration|webhook|connector)\b/i }
];

const ABSTRACT_AGENT_RULES = [
  { key: "multi-agent", label: "multi-agent/orchestration framing", score: 18, pattern: /multi[-\s]?agent|agentic|swarm|autonomous agent/i },
  { key: "agent-framework", label: "agent framework framing", score: 15, pattern: /agent framework|agent operating system|agent orchestrat|agent runtime/i },
  { key: "prompt-role-asset", label: "prompt/role asset", score: 12, pattern: /prompt library|prompt collection|agent definitions?|ai roles?|personas?/i },
  { key: "mcp-only", label: "protocol/infrastructure-only framing", score: 8, pattern: /\bmcp\b|model-context-protocol/i }
];

const RESEARCH_ASSET_RULES = [
  { key: "awesome-list", label: "curated list", score: 18, pattern: /\bawesome\b|curated list|collection of/i },
  { key: "course-tutorial", label: "course/tutorial framing", score: 16, pattern: /\bcourse|tutorial|from[-\s]?scratch|learn\b|guide\b|book\b/i },
  { key: "paper-benchmark", label: "research/benchmark framing", score: 12, pattern: /\bpaper|benchmark|leaderboard|survey\b/i }
];

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(from, to = new Date()) {
  const fromDate = from ? new Date(from) : to;
  const diff = to.getTime() - fromDate.getTime();
  return Math.max(0, diff / 86400000);
}

function logScore(value, scale = 1) {
  return Math.log10(Math.max(1, value)) * scale;
}

function normalizeText(repo) {
  return [
    repo.fullName,
    repo.name,
    repo.description,
    repo.language,
    ...(repo.topics || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(haystack, keyword) {
  const normalized = String(keyword || "").toLowerCase();
  if (!normalized) return false;
  if (normalized.length <= 3 || ["auth", "form", "graph", "image", "video"].includes(normalized)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`, "i").test(haystack);
  }
  return haystack.includes(normalized);
}

function nxCadCategory(repo) {
  return {
    key: "engineering-cad-nx",
    label: "Engineering CAD & NX Automation",
    productWeight: 1.18,
    matchedKeywords: nxCadMatchedTerms(repo).slice(0, 6)
  };
}

function nxCadUseCase() {
  return {
    key: "engineering-cad-nx-automation",
    label: "Engineering CAD/NX automation",
    labelZh: "工程 CAD/NX 自动化",
    labelEn: "Engineering CAD/NX automation",
    summaryZh: "围绕 Siemens NX、NXOpen、UGOpen、CAM 后处理或 CAD 模型转换的工程自动化项目",
    summaryEn: "Automate Siemens NX, NXOpen, UGOpen, CAM postprocessing, or CAD model conversion workflows"
  };
}

function scoreSignalRules(haystack, rules, maxScore) {
  const matched = [];
  let score = 0;
  for (const rule of rules) {
    if (rule.pattern.test(haystack)) {
      matched.push({
        key: rule.key,
        label: rule.label,
        score: rule.score
      });
      score += rule.score;
    }
  }
  return {
    score: clamp(score, 0, maxScore),
    matched
  };
}

function productizationSignals(repo, category) {
  const haystack = normalizeText(repo);
  const surface = scoreSignalRules(haystack, PRODUCT_SIGNAL_RULES, 48);
  const packaging = scoreSignalRules(haystack, PACKAGING_SIGNAL_RULES, 24);
  const rawAgentNoise = scoreSignalRules(haystack, ABSTRACT_AGENT_RULES, 44);
  const researchNoise = scoreSignalRules(haystack, RESEARCH_ASSET_RULES, 34);
  const learningAssetPenalty = category?.key === "learning-research-assets" ? 18 : 0;
  const agentPenalty = clamp(
    rawAgentNoise.score + learningAssetPenalty + researchNoise.score - Math.round(surface.score * 0.5 + packaging.score * 0.35),
    0,
    60
  );
  const tags = [...surface.matched, ...packaging.matched].map((item) => item.key);
  const labels = [...surface.matched, ...packaging.matched].map((item) => item.label);
  return {
    surface: surface.score,
    packaging: packaging.score,
    abstractAgentPenalty: agentPenalty,
    abstractAgentTags: rawAgentNoise.matched.map((item) => item.key),
    researchAssetTags: researchNoise.matched.map((item) => item.key),
    tags,
    labels
  };
}

function classifyRepository(repo) {
  if (isNxCadRepository(repo)) {
    return nxCadCategory(repo);
  }

  const haystack = normalizeText(repo);
  const matches = CATEGORY_RULES.map((rule) => {
    const matchedKeywords = rule.keywords.filter((keyword) => keywordMatches(haystack, keyword));
    const score = matchedKeywords.reduce((total, keyword) => {
      const weight = KEYWORD_WEIGHTS[rule.key]?.[keyword] || 1;
      return total + weight;
    }, 0);
    return { ...rule, hitCount: matchedKeywords.length, matchedKeywords, score };
  }).sort((a, b) => b.score - a.score || b.hitCount - a.hitCount || b.productWeight - a.productWeight);

  const winner = matches[0];
  if (!winner || winner.score === 0) {
    return {
      key: "other",
      label: "Other",
      productWeight: 0.9,
      matchedKeywords: []
    };
  }

  return {
    key: winner.key,
    label: winner.label,
    productWeight: winner.productWeight,
    matchedKeywords: winner.matchedKeywords.slice(0, 6)
  };
}

function inferUseCase(repo, category = null) {
  if (category?.key === "engineering-cad-nx" || isNxCadRepository(repo)) {
    return nxCadUseCase();
  }

  const haystack = normalizeText(repo);
  const match = USE_CASE_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(haystack)));
  if (match) {
    return {
      key: match.key,
      label: match.label,
      labelZh: match.labelZh,
      labelEn: match.label,
      summaryZh: match.summaryZh,
      summaryEn: match.summaryEn
    };
  }

  const fallbackByCategory = {
    "product-starters": {
      key: "product-starter",
      label: "Product starter",
      labelZh: "产品模板",
      labelEn: "Product starter",
      summaryZh: "提供可运行的应用基础模板、脚手架或应用示例",
      summaryEn: "Provide runnable app templates, scaffolds, or adaptable product examples"
    },
    "ai-native-products": {
      key: "ai-products",
      label: "AI applications",
      labelZh: "AI 应用",
      labelEn: "AI applications",
      summaryZh: "把模型能力包装成具体用户场景、助手或知识工作流",
      summaryEn: "Package model capabilities into concrete user scenarios, assistants, or knowledge workflows"
    },
    "developer-productivity": {
      key: "developer-tools",
      label: "Developer tools",
      labelZh: "开发者工具",
      labelEn: "Developer tools",
      summaryZh: "提升开发、调试、编码或工程协作效率",
      summaryEn: "Improve development, debugging, coding, or engineering collaboration"
    },
    "business-saas": {
      key: "business-saas",
      label: "Backend SaaS",
      labelZh: "后台模板",
      labelEn: "Backend SaaS",
      summaryZh: "搭建 SaaS、后台管理或企业业务系统",
      summaryEn: "Build SaaS, admin panels, or enterprise systems"
    },
    "data-knowledge": {
      key: "data-knowledge",
      label: "Data and knowledge",
      labelZh: "数据与知识",
      labelEn: "Data and knowledge",
      summaryZh: "处理数据、知识检索、分析或问答",
      summaryEn: "Handle data, knowledge retrieval, analytics, or Q&A"
    },
    "infra-cloud": {
      key: "infra-cloud",
      label: "Platform engineering",
      labelZh: "平台工程",
      labelEn: "Platform engineering",
      summaryZh: "建设云原生、平台工程、部署或运维能力",
      summaryEn: "Build cloud-native, platform engineering, deployment, or ops capabilities"
    },
    "security-compliance": {
      key: "security-compliance",
      label: "Security tools",
      labelZh: "安全检查",
      labelEn: "Security tools",
      summaryZh: "安全检测、隐私保护、审计或合规治理",
      summaryEn: "Security checks, privacy protection, audit, or compliance"
    },
    "frontend-creative": {
      key: "frontend-creative",
      label: "Frontend creative",
      labelZh: "前端创意工具",
      labelEn: "Frontend creative",
      summaryZh: "界面开发、设计系统、组件或创意生产",
      summaryEn: "UI development, design systems, components, or creative production"
    },
    "creative-media": {
      key: "creative-media",
      label: "Creative media",
      labelZh: "视频音频与内容创作",
      labelEn: "Creative media",
      summaryZh: "视频、音频、音乐、播客、字幕、剪辑和内容创作工具",
      summaryEn: "Video, audio, music, podcast, subtitle, editing, and content creation tools"
    },
    "consumer-productivity": {
      key: "consumer-productivity",
      label: "Personal efficiency",
      labelZh: "个人效率",
      labelEn: "Personal efficiency",
      summaryZh: "管理个人任务、笔记、日程或本地工作流",
      summaryEn: "Manage personal tasks, notes, schedules, or local workflows"
    },
    "commerce-growth-content": {
      key: "commerce-growth-content",
      label: "Commerce growth",
      labelZh: "内容与增长",
      labelEn: "Commerce growth",
      summaryZh: "内容生产、商业增长、电商或创作者运营",
      summaryEn: "Content, growth, ecommerce, or creator operations"
    },
	    "vertical-domain": {
      key: "vertical-domain",
      label: "Vertical apps",
      labelZh: "垂直行业应用",
      labelEn: "Vertical apps",
      summaryZh: "特定行业场景的业务流程或自动化问题",
      summaryEn: "Industry-specific workflows or automation problems"
	    },
    "engineering-cad-nx": nxCadUseCase(),
    "systems-runtime-edge": {
      key: "systems-runtime-edge",
      label: "Systems and edge",
      labelZh: "系统与边缘",
      labelEn: "Systems and edge",
      summaryZh: "底层运行时、系统工具或边缘计算能力",
      summaryEn: "Runtime, systems tooling, or edge capabilities"
    },
    "learning-research-assets": {
      key: "learning-research-assets",
      label: "Learning assets",
      labelZh: "学习资料",
      labelEn: "Learning assets",
      summaryZh: "学习、研究、资料整理或技术路线参考",
      summaryEn: "Learning, research, curation, or technical references"
    }
  };

  return fallbackByCategory[category?.key] || {
    key: "other",
    label: "Other",
    labelZh: "待研判",
    labelEn: "Other",
    summaryZh: "尚需人工判断的开源方向",
    summaryEn: "An open source direction that still needs manual judgment"
  };
}

function getLicensePolicy(license) {
  const key = license?.spdxId || license?.spdx_id || license?.key || "NOASSERTION";
  const normalized = String(key || "NOASSERTION").toLowerCase();
  const name = license?.name || key || "No license detected";

  if (!license || normalized === "noassertion" || normalized === "other") {
    return {
      key: normalized,
      name,
      bucket: "unknown-no-license",
      label: "No license: monitor only",
      labelZh: "无许可：仅监控",
      labelEn: "No license: monitor only",
      risk: 82,
      practiceBoundary: "Monitor and study direction only. Do not copy, modify, or redistribute code before legal review.",
      practiceBoundaryZh: "只能监控和研究方向。未经人工确认前不要复制、修改或分发代码。",
      note: "No recognized SPDX license was detected. GitHub public visibility does not grant reuse rights."
    };
  }

  if (PERMISSIVE_COMMERCIAL.has(normalized)) {
    return {
      key: normalized,
      name,
      bucket: "permissive-commercial",
      label: "Low-friction license",
      labelZh: "低摩擦许可",
      labelEn: "Low-friction license",
      risk: 14,
      practiceBoundary: "Deeper adoption is usually practical with notice preservation.",
      practiceBoundaryZh: "通常便于深入采用或集成，但要保留版权声明和许可文本。",
      note: "Keep copyright notices and license text."
    };
  }

  if (CONDITIONAL_COMMERCIAL.has(normalized)) {
    return {
      key: normalized,
      name,
      bucket: "conditional-commercial",
      label: "License with obligations",
      labelZh: "需履约许可",
      labelEn: "License with obligations",
      risk: 46,
      practiceBoundary: "Use with architectural separation and license-specific obligations.",
      practiceBoundaryZh: "可以考虑深入采用，但要按许可证履约，尤其注意文件级开源、链接、署名或再分发义务。",
      note: "Use may be possible, but redistribution obligations need review."
    };
  }

  if (DISTRIBUTION_COPYLEFT.has(normalized)) {
    return {
      key: normalized,
      name,
      bucket: "distribution-copyleft",
      label: "Distribution may require source release",
      labelZh: "分发需开源",
      labelEn: "Distribution may require source release",
      risk: 70,
      practiceBoundary: "Distribution may require source release; review obligations before deeper adoption.",
      practiceBoundaryZh: "如果分发衍生软件，通常要承担同许可证开源义务；深入采用前需复核边界。",
      note: "Treat as high-friction for closed-source distribution."
    };
  }

  if (NETWORK_COPYLEFT.has(normalized)) {
    return {
      key: normalized,
      name,
      bucket: "network-copyleft",
      label: "SaaS source-release risk",
      labelZh: "SaaS 高风险",
      labelEn: "SaaS source-release risk",
      risk: 88,
      practiceBoundary: "Monitor and study behavior first. Avoid service wrapping without legal review.",
      practiceBoundaryZh: "网络服务也可能触发源码开放义务。适合先监控和研究，不宜未经复核直接封装服务。",
      note: "Network copyleft is high-friction for hosted services."
    };
  }

  if (RESTRICTED_NONCOMMERCIAL.has(normalized)) {
    return {
      key: normalized,
      name,
      bucket: "restricted-noncommercial",
      label: "Restricted use",
      labelZh: "受限用途",
      labelEn: "Restricted use",
      risk: 90,
      practiceBoundary: "Monitor only unless the exact license grants your intended use.",
      practiceBoundaryZh: "默认仅监控。除非人工确认许可允许你的用途，否则不要深入采用。",
      note: "Some intended uses may be prohibited or restricted."
    };
  }

  return {
    key: normalized,
    name,
    bucket: "manual-review",
    label: "Manual review first",
    labelZh: "先人工复核",
    labelEn: "Manual review first",
    risk: 58,
    practiceBoundary: "Monitor and review exact license text before copying or redistributing.",
    practiceBoundaryZh: "可以监控，但复制、修改或分发前必须人工阅读完整许可文本。",
    note: "Recognized as a license, but not in the low-risk allowlist."
  };
}

function scoreRepository(repo, previous = null, externalSignals = []) {
  const now = new Date();
  const ageDays = Math.max(1, daysBetween(repo.createdAt, now));
  const pushedDays = daysBetween(repo.pushedAt || repo.updatedAt, now);
  const stars = repo.stars || 0;
  const forks = repo.forks || 0;
  const issues = repo.openIssues || 0;
  const topics = repo.topics || [];
  const starDelta = previous ? Math.max(0, stars - (previous.stars || 0)) : 0;
  const forkDelta = previous ? Math.max(0, forks - (previous.forks || 0)) : 0;
  const starsPerDay = stars / ageDays;
  const forksPerDay = forks / ageDays;

  const category = classifyRepository(repo);
  const useCase = inferUseCase(repo, category);
  const licensePolicy = getLicensePolicy(repo.license);
  const productFit = productizationSignals(repo, category);
  const hasHomepage = Boolean(repo.homepage);
  const hasDescription = Boolean(repo.description && repo.description.length > 30);
  const isRecent = pushedDays <= 14;
  const githubTrendingSignals = externalSignals.filter((signal) => signal.source === "github-trending");
  const trendingRankBoost = githubTrendingSignals.reduce((score, signal) => {
    const periodWeight = {
      daily: 1.2,
      weekly: 0.85,
      monthly: 0.65
    }[signal.period] || 0.7;
    const rankBoost = Math.max(0, 26 - Number(signal.rank || 26)) / 25;
    return score + periodWeight + rankBoost;
  }, 0);
  const trendingAttentionBoost = Math.min(10, trendingRankBoost * 2.2);
  const externalScore = Math.min(20, externalSignals.reduce((score, signal) => score + Number(signal.weight || 1), 0) * 4);

  const momentum = clamp(
    logScore(starsPerDay + 1, 24) +
      logScore(forksPerDay + 1, 18) +
      starDelta * 2.4 +
      forkDelta * 3.2 +
      (isRecent ? 12 : 0) +
      trendingAttentionBoost
  );

  const quality = clamp(
    18 +
      (hasDescription ? 12 : 0) +
      (hasHomepage ? 10 : 0) +
      Math.min(18, topics.length * 3) +
      (repo.defaultBranch ? 4 : 0) +
      (isRecent ? 18 : -8) +
      (repo.archived ? -45 : 0) +
      (repo.disabled ? -50 : 0)
  );

  const community = clamp(
    logScore(stars, 22) +
      logScore(forks, 25) +
      Math.min(18, issues / 8) +
      Math.min(16, repo.watchers || 0) +
      (repo.fork ? -24 : 0)
  );

  const productization = clamp(
    22 +
      category.productWeight * 24 +
      productFit.surface * 1.18 +
      productFit.packaging * 1.08 +
      (hasHomepage ? 12 : 0) +
      (hasDescription ? 8 : 0) +
      (repo.language ? 6 : 0) +
      (licensePolicy.bucket === "permissive-commercial" ? 4 : 0) +
      (repo.fork ? -22 : 0) +
      (repo.archived ? -30 : 0) -
      productFit.abstractAgentPenalty * 1.22
  );

  const novelty = clamp(
    20 +
      category.matchedKeywords.length * 8 +
      (ageDays <= 365 ? 16 : 0) +
      (ageDays <= 90 ? 12 : 0) +
      externalScore +
      Math.min(6, trendingAttentionBoost * 0.6)
  );

  const maintenanceRisk = repo.archived || repo.disabled ? 82 : pushedDays > 180 ? 44 : pushedDays > 90 ? 28 : pushedDays > 30 ? 12 : 0;
  const hypeRisk = (stars > 3000 && forks < 20 ? 28 : 0) + (ageDays < 10 && stars > 1000 ? 26 : 0);
  const maturityRisk = ageDays < 14 ? 18 : ageDays < 45 ? 10 : 0;
  const metadataRisk = (!hasDescription ? 8 : 0) + (!topics.length ? 6 : 0) + (repo.fork ? 18 : 0);
  const productSurfaceRisk =
    productFit.abstractAgentPenalty >= 24 && productFit.surface < 18
      ? 20
      : category.key === "learning-research-assets" && productFit.surface < 12
        ? 16
        : 0;
  const projectRisk = clamp(maintenanceRisk + hypeRisk + maturityRisk + metadataRisk + productSurfaceRisk);
  const combinedRisk = clamp(projectRisk * 0.58 + licensePolicy.risk * 0.42);

  const actionability = clamp(
    productization * 0.42 +
      quality * 0.22 +
      momentum * 0.1 +
      (100 - combinedRisk) * 0.26 -
      productFit.abstractAgentPenalty * 0.12
  );

  const opportunity = clamp(
    momentum * 0.17 +
      quality * 0.16 +
      community * 0.08 +
      productization * 0.3 +
      novelty * 0.1 +
      actionability * 0.19 -
      combinedRisk * 0.14 -
      productFit.abstractAgentPenalty * 0.18
  );

  const anomalyFlags = [];
  if (stars > 800 && forks < 10) {
    anomalyFlags.push("High stars with unusually low fork activity");
  }
  if (ageDays < 14 && stars > 1500) {
    anomalyFlags.push("Very young repository with sudden attention");
  }
  if (pushedDays > 120) {
    anomalyFlags.push("Repository appears stale");
  }
  if (productFit.abstractAgentPenalty >= 18 && productFit.surface < 18) {
    anomalyFlags.push("Agent or orchestration framing lacks a clear product surface");
  }
  if (repo.archived) {
    anomalyFlags.push("Repository is archived");
  }

  if (category.key === "creative-media") {
    anomalyFlags.push("Creative-media project; check licensing and asset provenance carefully");
  }

  return {
    category,
    useCase,
    licensePolicy,
    scores: {
      opportunity: Math.round(opportunity),
      momentum: Math.round(momentum),
      quality: Math.round(quality),
      community: Math.round(community),
      productization: Math.round(productization),
      novelty: Math.round(novelty),
      risk: Math.round(projectRisk),
      licenseRisk: Math.round(licensePolicy.risk),
      overallRisk: Math.round(combinedRisk),
      actionability: Math.round(actionability)
    },
    signals: {
      ageDays: Math.round(ageDays),
      pushedDays: Math.round(pushedDays),
      starsPerDay: Number(starsPerDay.toFixed(2)),
      forksPerDay: Number(forksPerDay.toFixed(2)),
      starDelta,
      forkDelta,
      externalMentions: externalSignals.length,
      githubTrending: githubTrendingSignals.map((signal) => ({
        period: signal.period,
        rank: signal.rank,
        starsInPeriod: signal.starsInPeriod || null
      })),
      anomalyFlags,
      riskBreakdown: {
        maintenance: Math.round(maintenanceRisk),
        hype: Math.round(hypeRisk),
        maturity: Math.round(maturityRisk),
        metadata: Math.round(metadataRisk + productSurfaceRisk),
        license: Math.round(licensePolicy.risk)
      },
      productFit: {
        surface: Math.round(productFit.surface),
        packaging: Math.round(productFit.packaging),
        abstractAgentPenalty: Math.round(productFit.abstractAgentPenalty),
        tags: productFit.tags.slice(0, 6),
        labels: productFit.labels.slice(0, 6),
        abstractAgentTags: productFit.abstractAgentTags.slice(0, 4),
        researchAssetTags: productFit.researchAssetTags.slice(0, 4)
      }
    },
    reasons: buildReasons(repo, category, licensePolicy, anomalyFlags, externalSignals, productFit),
    actions: buildActions(repo, category, licensePolicy, opportunity, combinedRisk, productFit)
  };
}

function buildReasons(repo, category, licensePolicy, anomalyFlags, externalSignals, productFit) {
  const reasons = [];
  if ((repo.stars || 0) > 100) {
    reasons.push(`${repo.stars.toLocaleString()} stars create enough public proof to monitor.`);
  }
  if ((repo.forks || 0) > 20) {
    reasons.push(`${repo.forks.toLocaleString()} forks indicate implementation-level interest.`);
  }
  if (productFit?.labels?.length) {
    reasons.push(`Productization signals: ${productFit.labels.slice(0, 3).join(", ")}.`);
  }
  if (category.key !== "other") {
    reasons.push(`Classified as ${category.label}, a productizable category.`);
  }
  if (category.key === "creative-media") {
    reasons.push("Targets video, audio, music, or content production workflows.");
  }
  const useCase = inferUseCase(repo, category);
  if (useCase.key !== "other") {
    reasons.push(`Primary use case: ${useCase.label}.`);
  }
  if (repo.homepage) {
    reasons.push("Has an external homepage or demo surface.");
  }
  const trendingSignals = externalSignals.filter((signal) => signal.source === "github-trending");
  if (trendingSignals.length) {
    const strongest = trendingSignals.slice().sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];
    reasons.push(`Appeared on GitHub Trending ${strongest.period || "daily"}${strongest.rank ? ` #${strongest.rank}` : ""}; treat it as heat validation, not proof of product fit.`);
  }
  if (licensePolicy.bucket === "permissive-commercial") {
    reasons.push(`License looks low-friction: ${licensePolicy.name}.`);
  }
  if (licensePolicy.bucket !== "permissive-commercial") {
    reasons.push(`License requires caution: ${licensePolicy.label}.`);
  }
  if (externalSignals.length) {
    const sources = Array.from(new Set(externalSignals.map((signal) => signal.source).filter(Boolean)));
    reasons.push(`${externalSignals.length} external web signals were found${sources.length ? ` from ${sources.join(", ")}` : ""}.`);
  }
  if ((productFit?.abstractAgentPenalty || 0) >= 18) {
    reasons.push("Agent/orchestration wording is treated as noise unless a concrete product surface is visible.");
  }
  if (anomalyFlags.length) {
    reasons.push(`Needs skepticism: ${anomalyFlags[0]}.`);
  }
  return reasons.slice(0, 5);
}

function buildActions(repo, category, licensePolicy, opportunity, risk, productFit) {
  const actions = [];
  if (licensePolicy.bucket === "permissive-commercial") {
    actions.push("Review architecture and identify the strongest user-value angle.");
  } else if (licensePolicy.bucket === "unknown-no-license" || risk > 70) {
    actions.push("Track the project, but avoid copying code before legal/manual review.");
  } else {
    actions.push("Map license obligations before any derivative or distribution.");
  }

  if ((productFit?.abstractAgentPenalty || 0) >= 18 && (productFit?.surface || 0) < 18) {
    actions.push("Verify a real user workflow, UI surface, and deployment path before deep-diving.");
  } else if (category.key === "learning-research-assets") {
    actions.push("Use as market-intelligence input rather than a direct product base.");
  } else if (category.key === "creative-media") {
    actions.push("Check media assets, export quality, and licensing before reuse.");
  } else if (opportunity >= 70) {
    actions.push("Create a teardown note and shortlist it for product validation.");
  } else {
    actions.push("Keep in watchlist until momentum and user proof improve.");
  }

  if (repo.homepage) {
    actions.push("Inspect the demo to separate real product value from repository hype.");
  }

  return actions;
}

function enrichRepository(repo, previous, externalSignals = []) {
  const scored = scoreRepository(repo, previous, externalSignals);
  return {
    ...repo,
    ...scored,
    source: repo.source || "github",
    updatedInMonitorAt: new Date().toISOString()
  };
}

module.exports = {
  CATEGORY_RULES,
  classifyRepository,
  enrichRepository,
  getLicensePolicy,
  inferUseCase,
  scoreRepository
};
