/**
 * 开发环境生命周期 mock 服务（仅供本地联调，生产构建不包含任何拦截逻辑）。
 *
 * 仅拦截 /api/lifecycle 与 /api/well/list 开头的请求，其余请求原样放行到
 * vite proxy 配置的真实后端。设置 cookie `mock_lifecycle_fail=1` 可让
 * lifecycle 接口返回 500，用于验证加载失败后的清理与重试流程。
 */
import type { Plugin } from 'vite'

interface MockStage {
  id: string
  name: string
  status: 'completed' | 'in_progress' | 'pending'
  startDate: string
  endDate?: string
  manager: string
  progress: number
  durationDays?: number
  cost?: number
  metrics?: Array<{ name: string; value: string; icon: string; color: string }>
  events?: Array<{ id: string; title: string; description: string; time: string; type: string; color: string }>
  documents?: Array<{ id: string; name: string; type: string; size: string; uploadTime: string }>
  trend?: { xData: string[]; series: Array<{ name: string; color: string; data: number[] }> }
}

interface MockWell {
  id: number
  wellCode: string
  wellName: string
  blockName: string
  status: string
  stages: MockStage[]
}

const buildEvents = (
  wellId: number,
  stageId: string,
  events: Array<[string, string, string, string, string]>
): NonNullable<MockStage['events']> =>
  events.map(([title, description, time, type, color], i) => ({
    id: `w${wellId}-${stageId}-e${i + 1}`,
    title,
    description,
    time,
    type,
    color
  }))

const buildDocs = (
  wellId: number,
  stageId: string,
  docs: Array<[string, string, string, string]>
): NonNullable<MockStage['documents']> =>
  docs.map(([name, type, size, uploadTime], i) => ({
    id: `w${wellId}-${stageId}-d${i + 1}`,
    name,
    type,
    size,
    uploadTime
  }))

// A-01井：2023 年投产，目前处于生产运营阶段
const well1Stages: MockStage[] = [
  {
    id: 'exploration',
    name: '勘探规划',
    status: 'completed',
    startDate: '2023-01-15',
    endDate: '2023-03-20',
    manager: '张工程师',
    progress: 100,
    durationDays: 64,
    cost: 200,
    metrics: [
      { name: '物探面积', value: '150 km²', icon: 'Compass', color: '#3b82f6' },
      { name: '预测储量', value: '500 万吨', icon: 'DataLine', color: '#8b5cf6' },
      { name: '探井数量', value: '5 口', icon: 'Position', color: '#22c55e' }
    ],
    events: buildEvents(1, 'exploration', [
      ['三维地震勘探启动', '完成三维地震数据采集工作', '2023-01-20', 'primary', '#3b82f6'],
      ['储量评估完成', '完成石油储量评估报告', '2023-02-28', 'success', '#22c55e'],
      ['井位设计评审通过', '井位设计方案通过专家评审', '2023-03-15', 'success', '#22c55e']
    ]),
    documents: buildDocs(1, 'exploration', [
      ['三维地震勘探报告.pdf', 'PDF', '15.2 MB', '2023-02-15'],
      ['储量评估报告.docx', 'Word', '8.5 MB', '2023-03-01'],
      ['井位设计图纸.dwg', 'CAD', '3.2 MB', '2023-03-18']
    ]),
    trend: {
      xData: ['1月', '2月', '3月'],
      series: [
        { name: '地震覆盖面积', color: '#3b82f6', data: [50, 120, 150] },
        { name: '发现圈闭', color: '#8b5cf6', data: [2, 5, 8] }
      ]
    }
  },
  {
    id: 'drilling',
    name: '钻井施工',
    status: 'completed',
    startDate: '2023-04-01',
    endDate: '2023-07-15',
    manager: '李工程师',
    progress: 100,
    durationDays: 105,
    cost: 1200,
    metrics: [
      { name: '钻井深度', value: '3,500 m', icon: 'TrendCharts', color: '#f59e0b' },
      { name: '钻井周期', value: '105 天', icon: 'Clock', color: '#ef4444' },
      { name: '机械钻速', value: '8.5 m/h', icon: 'Odometer', color: '#06b6d4' }
    ],
    events: buildEvents(1, 'drilling', [
      ['开钻典礼', '正式开始钻井作业', '2023-04-01', 'primary', '#3b82f6'],
      ['二开完成', '完成第二开钻井作业', '2023-05-10', 'success', '#22c55e'],
      ['完钻井深达到设计', '顺利钻达设计井深3500米', '2023-07-10', 'success', '#22c55e']
    ]),
    documents: buildDocs(1, 'drilling', [
      ['钻井工程设计.pdf', 'PDF', '12.8 MB', '2023-03-25'],
      ['钻井日报汇总.xlsx', 'Excel', '4.2 MB', '2023-07-16'],
      ['完井报告.pdf', 'PDF', '18.5 MB', '2023-07-20']
    ]),
    trend: {
      xData: ['4月', '5月', '6月', '7月'],
      series: [
        { name: '钻井进尺', color: '#f59e0b', data: [800, 1800, 2800, 3500] },
        { name: '机械钻速', color: '#ef4444', data: [7.2, 8.5, 9.1, 8.8] }
      ]
    }
  },
  {
    id: 'completion',
    name: '完井测试',
    status: 'completed',
    startDate: '2023-07-20',
    endDate: '2023-09-10',
    manager: '王工程师',
    progress: 100,
    durationDays: 52,
    cost: 300,
    metrics: [
      { name: '测试层数', value: '8 层', icon: 'CopyDocument', color: '#3b82f6' },
      { name: '日产油量', value: '120 吨', icon: 'TrendCharts', color: '#22c55e' },
      { name: '地层压力', value: '35.2 MPa', icon: 'DataAnalysis', color: '#8b5cf6' }
    ],
    events: buildEvents(1, 'completion', [
      ['固井作业完成', '完成油层套管固井作业', '2023-07-25', 'success', '#22c55e'],
      ['射孔作业完成', '成功射开目的层段', '2023-08-05', 'success', '#22c55e'],
      ['试油成果达标', '试油产量达到预期目标', '2023-09-05', 'success', '#22c55e']
    ]),
    documents: buildDocs(1, 'completion', [
      ['完井测试方案.pdf', 'PDF', '6.3 MB', '2023-07-18'],
      ['试油成果报告.pdf', 'PDF', '9.8 MB', '2023-09-12']
    ]),
    trend: {
      xData: ['7月下旬', '8月', '9月上旬'],
      series: [
        { name: '测试层数', color: '#3b82f6', data: [2, 5, 8] },
        { name: '单层产量', color: '#22c55e', data: [8, 15, 15] }
      ]
    }
  },
  {
    id: 'production',
    name: '生产运营',
    status: 'in_progress',
    startDate: '2023-09-15',
    manager: '赵工程师',
    progress: 45,
    cost: 800,
    metrics: [
      { name: '累计产油', value: '15,680 吨', icon: 'TrendCharts', color: '#22c55e' },
      { name: '累计产气', value: '850 万方', icon: 'Wind', color: '#f59e0b' },
      { name: '生产时率', value: '98.5%', icon: 'Clock', color: '#3b82f6' }
    ],
    events: buildEvents(1, 'production', [
      ['投产成功', '正式投入生产运营', '2023-09-15', 'primary', '#3b82f6'],
      ['首次措施作业', '完成首次压裂增产措施', '2024-01-20', 'warning', '#f59e0b'],
      ['产量稳产达标', '连续3个月产量稳定', '2024-03-01', 'success', '#22c55e']
    ]),
    documents: buildDocs(1, 'production', [
      ['生产运行日报.xlsx', 'Excel', '2.5 MB', '2024-05-10'],
      ['油井工况分析报告.pdf', 'PDF', '5.8 MB', '2024-04-15']
    ]),
    trend: {
      xData: ['9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月'],
      series: [
        { name: '日产油量', color: '#22c55e', data: [115, 118, 122, 120, 118, 125, 122, 120, 118] },
        { name: '日产水量', color: '#06b6d4', data: [45, 48, 52, 50, 48, 45, 42, 40, 38] }
      ]
    }
  },
  {
    id: 'maintenance',
    name: '修井作业',
    status: 'pending',
    startDate: '2026-06-01',
    manager: '待分配',
    progress: 0,
    cost: 150,
    metrics: [
      { name: '计划作业次数', value: '3 次', icon: 'Tools', color: '#64748b' },
      { name: '预计周期', value: '15 天', icon: 'Clock', color: '#64748b' },
      { name: '预算费用', value: '500 万', icon: 'Money', color: '#64748b' }
    ],
    events: [],
    documents: []
  },
  {
    id: 'abandonment',
    name: '废弃处置',
    status: 'pending',
    startDate: '2033-01-01',
    manager: '待分配',
    progress: 0,
    cost: 50,
    metrics: [
      { name: '预计年限', value: '10 年', icon: 'Clock', color: '#64748b' },
      { name: '环保等级', value: '一级', icon: 'Warning', color: '#64748b' },
      { name: '残值回收', value: '80%', icon: 'Coin', color: '#64748b' }
    ],
    events: [],
    documents: []
  }
]

// B-03井：2025 年开钻，目前处于钻井施工阶段，后续阶段均为待开始、暂无文档事件
const well2Stages: MockStage[] = [
  {
    id: 'exploration',
    name: '勘探规划',
    status: 'completed',
    startDate: '2024-09-01',
    endDate: '2024-12-18',
    manager: '周工程师',
    progress: 100,
    durationDays: 108,
    cost: 260,
    metrics: [
      { name: '物探面积', value: '96 km²', icon: 'Compass', color: '#3b82f6' },
      { name: '预测储量', value: '320 万吨', icon: 'DataLine', color: '#8b5cf6' },
      { name: '探井数量', value: '3 口', icon: 'Position', color: '#22c55e' }
    ],
    events: buildEvents(2, 'exploration', [
      ['二维地震采集完成', '完成区域二维地震普查', '2024-10-08', 'primary', '#3b82f6'],
      ['圈闭评价通过', '落实有利圈闭 2 个', '2024-12-01', 'success', '#22c55e']
    ]),
    documents: buildDocs(2, 'exploration', [
      ['勘探部署方案.pdf', 'PDF', '9.6 MB', '2024-08-20']
    ]),
    trend: {
      xData: ['9月', '10月', '11月', '12月'],
      series: [{ name: '地震覆盖面积', color: '#3b82f6', data: [20, 55, 80, 96] }]
    }
  },
  {
    id: 'drilling',
    name: '钻井施工',
    status: 'in_progress',
    startDate: '2025-01-06',
    manager: '吴工程师',
    progress: 60,
    metrics: [
      { name: '当前井深', value: '2,100 m', icon: 'TrendCharts', color: '#f59e0b' },
      { name: '设计井深', value: '3,800 m', icon: 'Aim', color: '#ef4444' },
      { name: '机械钻速', value: '7.8 m/h', icon: 'Odometer', color: '#06b6d4' }
    ],
    events: buildEvents(2, 'drilling', [
      ['开钻', '一开钻进顺利完成', '2025-01-06', 'primary', '#3b82f6'],
      ['二开中完', '技术套管下入成功', '2025-03-02', 'success', '#22c55e']
    ]),
    documents: buildDocs(2, 'drilling', [
      ['钻井工程设计.pdf', 'PDF', '11.4 MB', '2024-12-28'],
      ['钻井施工日报.xlsx', 'Excel', '2.1 MB', '2025-04-01']
    ]),
    trend: {
      xData: ['1月', '2月', '3月', '4月'],
      series: [
        { name: '累计进尺', color: '#f59e0b', data: [600, 1250, 1750, 2100] },
        { name: '机械钻速', color: '#ef4444', data: [6.9, 7.5, 8.2, 7.8] }
      ]
    }
  },
  {
    id: 'completion',
    name: '完井测试',
    status: 'pending',
    startDate: '2025-06-01',
    manager: '待分配',
    progress: 0,
    cost: 320,
    metrics: [
      { name: '计划测试层', value: '6 层', icon: 'CopyDocument', color: '#64748b' },
      { name: '预计周期', value: '45 天', icon: 'Clock', color: '#64748b' }
    ],
    events: [],
    documents: []
  },
  {
    id: 'production',
    name: '生产运营',
    status: 'pending',
    startDate: '2025-08-01',
    manager: '待分配',
    progress: 0,
    cost: 900,
    metrics: [{ name: '预计年产油', value: '4.2 万吨', icon: 'TrendCharts', color: '#64748b' }],
    events: [],
    documents: []
  },
  {
    id: 'maintenance',
    name: '修井作业',
    status: 'pending',
    startDate: '2027-03-01',
    manager: '待分配',
    progress: 0,
    cost: 120,
    metrics: [{ name: '预算费用', value: '380 万', icon: 'Money', color: '#64748b' }],
    events: [],
    documents: []
  },
  {
    id: 'abandonment',
    name: '废弃处置',
    status: 'pending',
    startDate: '2035-01-01',
    manager: '待分配',
    progress: 0,
    cost: 40,
    metrics: [{ name: '预计年限', value: '10 年', icon: 'Clock', color: '#64748b' }],
    events: [],
    documents: []
  }
]

// C-02井：2020 年投产的老井，数据与 A-01 井完全不同，用于验证切换井后无残留
const well3Stages: MockStage[] = [
  {
    id: 'exploration',
    name: '勘探规划',
    status: 'completed',
    startDate: '2019-03-10',
    endDate: '2019-06-30',
    manager: '郑工程师',
    progress: 100,
    durationDays: 112,
    cost: 180,
    metrics: [
      { name: '物探面积', value: '210 km²', icon: 'Compass', color: '#3b82f6' },
      { name: '预测储量', value: '760 万吨', icon: 'DataLine', color: '#8b5cf6' },
      { name: '探井数量', value: '7 口', icon: 'Position', color: '#22c55e' }
    ],
    events: buildEvents(3, 'exploration', [
      ['区带评价完成', '优选出 3 个有利区带', '2019-04-20', 'success', '#22c55e'],
      ['探井获工业油流', 'C2-探1井试油日产 60 吨', '2019-06-12', 'primary', '#3b82f6']
    ]),
    documents: buildDocs(3, 'exploration', [
      ['区带评价报告.pdf', 'PDF', '21.3 MB', '2019-05-05']
    ]),
    trend: {
      xData: ['3月', '4月', '5月', '6月'],
      series: [{ name: '地震覆盖面积', color: '#3b82f6', data: [40, 110, 180, 210] }]
    }
  },
  {
    id: 'drilling',
    name: '钻井施工',
    status: 'completed',
    startDate: '2019-08-01',
    endDate: '2020-01-20',
    manager: '冯工程师',
    progress: 100,
    durationDays: 172,
    cost: 1500,
    metrics: [
      { name: '钻井深度', value: '4,200 m', icon: 'TrendCharts', color: '#f59e0b' },
      { name: '钻井周期', value: '172 天', icon: 'Clock', color: '#ef4444' },
      { name: '机械钻速', value: '6.9 m/h', icon: 'Odometer', color: '#06b6d4' }
    ],
    events: buildEvents(3, 'drilling', [
      ['开钻', '2019-08-01 正式开钻', '2019-08-01', 'primary', '#3b82f6'],
      ['钻遇油气显示', '沙三段见荧光显示 42 米', '2019-10-18', 'warning', '#f59e0b'],
      ['完钻', '钻至设计井深 4200 米', '2020-01-15', 'success', '#22c55e']
    ]),
    documents: buildDocs(3, 'drilling', [
      ['钻井完井报告.pdf', 'PDF', '24.6 MB', '2020-02-01']
    ]),
    trend: {
      xData: ['8月', '10月', '12月', '1月'],
      series: [{ name: '累计进尺', color: '#f59e0b', data: [900, 2200, 3600, 4200] }]
    }
  },
  {
    id: 'completion',
    name: '完井测试',
    status: 'completed',
    startDate: '2020-02-01',
    endDate: '2020-04-10',
    manager: '蒋工程师',
    progress: 100,
    durationDays: 69,
    cost: 350,
    metrics: [
      { name: '测试层数', value: '10 层', icon: 'CopyDocument', color: '#3b82f6' },
      { name: '日产油量', value: '156 吨', icon: 'TrendCharts', color: '#22c55e' }
    ],
    events: buildEvents(3, 'completion', [
      ['分层试油完成', '主力层段日产油 90 吨', '2020-03-15', 'success', '#22c55e'],
      ['试采方案批复', '转入试采阶段', '2020-04-02', 'primary', '#3b82f6']
    ]),
    documents: buildDocs(3, 'completion', [
      ['试油试采总结.pdf', 'PDF', '12.1 MB', '2020-04-15']
    ]),
    trend: {
      xData: ['2月', '3月', '4月'],
      series: [{ name: '日产油量', color: '#22c55e', data: [60, 120, 156] }]
    }
  },
  {
    id: 'production',
    name: '生产运营',
    status: 'in_progress',
    startDate: '2020-05-01',
    manager: '韩工程师',
    progress: 72,
    cost: 2100,
    metrics: [
      { name: '累计产油', value: '38,420 吨', icon: 'TrendCharts', color: '#22c55e' },
      { name: '综合含水', value: '42.6%', icon: 'WaterCup', color: '#06b6d4' },
      { name: '生产时率', value: '96.1%', icon: 'Clock', color: '#3b82f6' }
    ],
    events: buildEvents(3, 'production', [
      ['投产', '2020-05-01 正式投产', '2020-05-01', 'primary', '#3b82f6'],
      ['注水见效', '井组日产回升 18 吨', '2022-09-20', 'success', '#22c55e'],
      ['卡堵水作业', '高含水层位成功封堵', '2024-11-05', 'warning', '#f59e0b']
    ]),
    documents: buildDocs(3, 'production', [
      ['单井开发月报汇总.xlsx', 'Excel', '6.7 MB', '2025-03-31'],
      ['注采调整方案.pdf', 'PDF', '4.9 MB', '2023-06-18']
    ]),
    trend: {
      xData: ['2020', '2021', '2022', '2023', '2024', '2025'],
      series: [
        { name: '年产油量(万吨)', color: '#22c55e', data: [4.8, 7.2, 6.9, 6.1, 6.8, 7.1] },
        { name: '综合含水(%)', color: '#06b6d4', data: [8, 15, 24, 33, 40, 42.6] }
      ]
    }
  },
  {
    id: 'maintenance',
    name: '修井作业',
    status: 'pending',
    startDate: '2026-10-01',
    manager: '待分配',
    progress: 0,
    cost: 200,
    metrics: [{ name: '预算费用', value: '600 万', icon: 'Money', color: '#64748b' }],
    events: [],
    documents: []
  },
  {
    id: 'abandonment',
    name: '废弃处置',
    status: 'pending',
    startDate: '2032-01-01',
    manager: '待分配',
    progress: 0,
    cost: 60,
    metrics: [{ name: '预计年限', value: '8 年', icon: 'Clock', color: '#64748b' }],
    events: [],
    documents: []
  }
]

const wells: MockWell[] = [
  {
    id: 1,
    wellCode: 'A-001',
    wellName: 'A-01井',
    blockName: '胜利油田',
    status: '生产中',
    stages: well1Stages
  },
  {
    id: 2,
    wellCode: 'B-003',
    wellName: 'B-03井',
    blockName: '胜利油田',
    status: '钻井中',
    stages: well2Stages
  },
  {
    id: 3,
    wellCode: 'C-002',
    wellName: 'C-02井',
    blockName: '胜利油田',
    status: '生产中',
    stages: well3Stages
  }
]

const STAGE_ORDER = ['exploration', 'drilling', 'completion', 'production', 'maintenance', 'abandonment']

const orderStages = (stages: MockStage[]): MockStage[] =>
  [...stages].sort((a, b) => STAGE_ORDER.indexOf(a.id) - STAGE_ORDER.indexOf(b.id))

const toSummary = (stage: MockStage) => ({
  id: stage.id,
  name: stage.name,
  status: stage.status,
  startDate: stage.startDate,
  endDate: stage.endDate,
  manager: stage.manager,
  progress: stage.progress,
  durationDays: stage.durationDays,
  cost: stage.cost
})

const buildComparison = (stages: MockStage[]) => ({
  duration: orderStages(stages).map(s => ({
    name: s.name,
    days: s.durationDays ?? null
  })),
  cost: orderStages(stages)
    .filter(s => typeof s.cost === 'number')
    .map(s => ({ name: s.name, value: s.cost as number }))
})

const envelope = (data: unknown) => ({ code: 200, message: 'success', data })

const routeLifecycle = (pathname: string, well: MockWell | undefined, stageId?: string) => {
  if (!well) {
    return { status: 404, body: { code: 404, message: '井位不存在或无生命周期数据', data: null } }
  }

  // /api/lifecycle/:wellId/comparison
  if (pathname.endsWith('/comparison')) {
    return { status: 200, body: envelope(buildComparison(well.stages)) }
  }

  if (stageId) {
    const stage = well.stages.find(s => s.id === stageId)
    if (!stage) {
      return { status: 404, body: { code: 404, message: '阶段不存在', data: null } }
    }
    if (pathname.endsWith('/metrics')) {
      return { status: 200, body: envelope(stage.metrics ?? []) }
    }
    if (pathname.endsWith('/events')) {
      return { status: 200, body: envelope(stage.events ?? []) }
    }
    if (pathname.endsWith('/documents')) {
      return { status: 200, body: envelope(stage.documents ?? []) }
    }
    // /api/lifecycle/:wellId/stage/:stageId
    return { status: 200, body: envelope(stage) }
  }

  // /api/lifecycle/:wellId
  return {
    status: 200,
    body: envelope({
      stages: orderStages(well.stages).map(toSummary),
      comparison: buildComparison(well.stages)
    })
  }
}

export function lifecycleMockPlugin(): Plugin {
  return {
    name: 'lifecycle-dev-mock',
    configureServer(server) {
      // 这里仅使用 connect 中间件的最小字段集合，显式标注避免依赖 @types/node
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method !== 'GET') return next()

        const url = new URL(req.url ?? '/', 'http://localhost')
        const { pathname } = url

        if (pathname === '/api/well/list') {
          const body = envelope(wells.map(w => ({
            id: w.id,
            wellCode: w.wellCode,
            wellName: w.wellName,
            blockName: w.blockName,
            status: w.status
          })))
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify(body))
          return
        }

        const match = pathname.match(/^\/api\/lifecycle\/(\d+)(?:\/stage\/([a-z_]+))?(\/[a-z]+)?\/?$/)
        if (!match) return next()

        // 模拟网络延迟，便于观察加载态
        setTimeout(() => {
          const fail = (req.headers.cookie ?? '').includes('mock_lifecycle_fail=1')
          if (fail) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ code: 500, message: '生命周期数据加载失败（模拟）', data: null }))
            return
          }

          const wellId = Number(match[1])
          const stageId = match[2]
          const well = wells.find(w => w.id === wellId)
          const result = routeLifecycle(pathname, well, stageId)

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        }, 300)
      })
    }
  }
}
