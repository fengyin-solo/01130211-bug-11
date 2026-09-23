<template>
  <div class="lifecycle-container">
    <el-card class="well-select-card">
      <template #header>
        <div class="card-header">
          <span>井位选择</span>
        </div>
      </template>
      <div class="well-selector">
        <el-select v-model="selectedWellId" placeholder="请选择井位" style="width: 300px" @change="handleWellChange">
          <el-option v-for="well in wellList" :key="well.id" :label="well.wellName" :value="well.id" />
        </el-select>
        <div v-if="selectedWell" class="well-info">
          <el-tag size="small" :type="getStatusType(selectedWell.status)">{{ selectedWell.status }}</el-tag>
          <span class="well-code">{{ selectedWell.wellCode }}</span>
          <span class="well-block">{{ selectedWell.blockName }}</span>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="timeline-card">
          <template #header>
            <div class="card-header">
              <span>全生命周期时间线</span>
              <el-tag type="info">当前阶段: {{ currentStage?.name || '-' }}</el-tag>
            </div>
          </template>

          <div v-loading="lifecycleLoading" class="timeline-body">
            <el-alert
              v-if="lifecycleError"
              class="state-alert"
              type="error"
              :closable="false"
              show-icon
              title="生命周期数据加载失败"
              :description="lifecycleError"
            >
              <el-button type="primary" size="small" :loading="lifecycleLoading" @click="reloadLifecycle">重试</el-button>
            </el-alert>

            <el-empty v-else-if="!lifecycleLoading && lifecycleStages.length === 0" description="该井暂无生命周期阶段数据" />

            <div v-else-if="lifecycleStages.length > 0" class="timeline-container">
              <div class="timeline-track">
                <div class="timeline-progress" :style="{ width: `${progressPercentage}%` }"></div>
                <div
                  v-for="(stage, index) in lifecycleStages"
                  :key="stage.id"
                  class="timeline-node"
                  :class="{
                    active: stage.status === 'completed',
                    current: stage.status === 'in_progress',
                    selected: selectedStageId === stage.id
                  }"
                  @click="selectStage(stage.id)"
                >
                  <div class="node-icon">
                    <el-icon v-if="stage.status === 'completed'" size="20"><CircleCheck /></el-icon>
                    <el-icon v-else-if="stage.status === 'in_progress'" size="20"><Loading /></el-icon>
                    <el-icon v-else size="20"><Clock /></el-icon>
                  </div>
                  <div class="node-content">
                    <div class="node-name">{{ stage.name }}</div>
                    <div class="node-date">{{ stage.startDate }} ~ {{ stage.endDate || '进行中' }}</div>
                    <div class="node-progress">完成度 {{ stage.progress }}%</div>
                  </div>
                  <div class="node-line" v-if="index < lifecycleStages.length - 1"></div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="6">
        <el-card class="stage-list-card">
          <template #header>
            <span>阶段详情</span>
          </template>
          <div v-loading="lifecycleLoading" class="stage-nav">
            <el-alert
              v-if="lifecycleError"
              class="state-alert"
              type="error"
              :closable="false"
              show-icon
              title="阶段列表加载失败"
              :description="lifecycleError"
            >
              <el-button type="primary" size="small" :loading="lifecycleLoading" @click="reloadLifecycle">重试</el-button>
            </el-alert>
            <el-empty v-else-if="!lifecycleLoading && lifecycleStages.length === 0" description="暂无阶段" :image-size="80" />
            <template v-else>
              <div
                v-for="stage in lifecycleStages"
                :key="stage.id"
                class="stage-item"
                :class="{ active: selectedStageId === stage.id }"
                @click="selectStage(stage.id)"
              >
                <div class="stage-indicator" :class="stage.status"></div>
                <div class="stage-info">
                  <div class="stage-name">{{ stage.name }}</div>
                  <div class="stage-duration">持续: {{ getStageDuration(stage) }}</div>
                </div>
                <el-icon class="stage-arrow"><ArrowRight /></el-icon>
              </div>
            </template>
          </div>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card class="stage-detail-card">
          <template #header v-if="selectedStageSummary">
            <div class="card-header">
              <span>{{ selectedStageSummary.name }} - 详细信息</span>
              <el-tag :type="getStageStatusType(selectedStageSummary.status)">
                {{ getStageStatusText(selectedStageSummary.status) }}
              </el-tag>
            </div>
          </template>

          <div v-if="lifecycleLoading" v-loading="true" class="detail-loading"></div>

          <el-empty v-else-if="!selectedStageId" description="请选择左侧阶段查看详情" />

          <div v-else-if="lifecycleError" v-loading="lifecycleLoading" class="detail-state">
            <el-alert
              type="error"
              :closable="false"
              show-icon
              title="阶段详情暂不可用"
              description="当前井的生命周期数据加载失败，请先重试恢复阶段列表"
            >
              <el-button type="primary" size="small" :loading="lifecycleLoading" @click="reloadLifecycle">重试</el-button>
            </el-alert>
          </div>

          <el-empty v-else-if="!selectedStageSummary && !detailLoading && !detailError" description="未找到该阶段信息" />

          <div v-else-if="detailError" v-loading="detailLoading" class="detail-state">
            <el-alert
              type="error"
              :closable="false"
              show-icon
              title="阶段详情加载失败"
              :description="detailError"
            >
              <el-button type="primary" size="small" :loading="detailLoading" @click="retryLoadDetail">重试</el-button>
            </el-alert>
          </div>

          <template v-else>
            <div v-loading="detailLoading">
              <template v-if="stageDetail">
                <el-row :gutter="20" class="mb-20">
                  <el-col :span="12">
                    <div class="info-group">
                      <div class="info-label">开始时间</div>
                      <div class="info-value">{{ stageDetail.startDate || '-' }}</div>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="info-group">
                      <div class="info-label">结束时间</div>
                      <div class="info-value">{{ stageDetail.endDate || '-' }}</div>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="info-group">
                      <div class="info-label">负责人</div>
                      <div class="info-value">{{ stageDetail.manager || '-' }}</div>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="info-group">
                      <div class="info-label">完成度</div>
                      <div class="info-value">
                        <el-progress :percentage="stageDetail.progress ?? 0" :status="stageDetail.progress === 100 ? 'success' : ''" />
                      </div>
                    </div>
                  </el-col>
                </el-row>

                <el-tabs v-model="activeTab">
                  <el-tab-pane label="关键指标" name="metrics">
                    <el-empty v-if="metricsList.length === 0" description="暂无指标数据" :image-size="100" />
                    <el-row v-else :gutter="20">
                      <el-col :span="8" v-for="metric in metricsList" :key="metric.name">
                        <div class="metric-card">
                          <div class="metric-icon" :style="{ background: metric.color }">
                            <el-icon><component :is="metric.icon" /></el-icon>
                          </div>
                          <div class="metric-content">
                            <div class="metric-value">{{ metric.value }}</div>
                            <div class="metric-name">{{ metric.name }}</div>
                          </div>
                        </div>
                      </el-col>
                    </el-row>
                  </el-tab-pane>
                  <el-tab-pane label="数据趋势" name="trend">
                    <el-empty v-if="!hasTrendData" description="该阶段暂无趋势数据" :image-size="100" />
                    <div v-show="hasTrendData" ref="trendChart" class="chart-container"></div>
                  </el-tab-pane>
                  <el-tab-pane label="关键事件" name="events">
                    <el-empty v-if="eventList.length === 0" description="暂无事件记录" :image-size="100" />
                    <el-timeline v-else>
                      <el-timeline-item
                        v-for="event in eventList"
                        :key="event.id"
                        :timestamp="event.time"
                        :type="event.type"
                        :color="event.color"
                      >
                        <el-card>
                          <h4>{{ event.title }}</h4>
                          <p>{{ event.description }}</p>
                        </el-card>
                      </el-timeline-item>
                    </el-timeline>
                  </el-tab-pane>
                  <el-tab-pane label="文档资料" name="docs">
                    <el-empty v-if="documentList.length === 0" description="暂无文档资料" :image-size="100" />
                    <el-table v-else :data="documentList" style="width: 100%">
                      <el-table-column prop="name" label="文档名称" />
                      <el-table-column prop="type" label="类型" width="120" />
                      <el-table-column prop="size" label="大小" width="120" />
                      <el-table-column prop="uploadTime" label="上传时间" width="180" />
                      <el-table-column label="操作" width="120">
                        <template #default>
                          <el-button type="primary" size="small" link>下载</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                </el-tabs>
              </template>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="comparison-card">
          <template #header>
            <div class="card-header">
              <span>各阶段对比分析</span>
              <el-button v-if="lifecycleError" text type="primary" :loading="lifecycleLoading" @click="reloadLifecycle">
                重试
              </el-button>
            </div>
          </template>
          <div v-loading="lifecycleLoading">
            <el-empty
              v-if="!lifecycleLoading && lifecycleStages.length === 0"
              description="该井暂无可对比的阶段数据"
            />
            <el-row v-else :gutter="20">
              <el-col :span="12">
                <div ref="durationChart" class="chart-container"></div>
              </el-col>
              <el-col :span="12">
                <div ref="costChart" class="chart-container"></div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { getWellLifecycle, getStageDetail } from '@/api/lifecycle'
import type {
  StageSummary,
  StageDetail,
  LifecycleComparison
} from '@/api/lifecycle'

interface Well {
  id: number
  wellCode: string
  wellName: string
  blockName: string
  status: string
}

// 从可能的接口返回结构中安全取数，兼容 { data } / 直接返回数组 等形式
const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload === null || payload === undefined) return fallback
  if (Array.isArray(fallback)) {
    return (Array.isArray(payload) ? payload : payload.list ?? payload.rows ?? payload.records ?? fallback) as T
  }
  return payload
}

const STORAGE_KEY = 'lifecycle:selected'

interface PersistedSelection {
  wellId: number
  // 每口井上次选中的阶段，避免切换后把上一口井的选择带到新井
  stageIds: Record<number, string>
}

const readPersisted = (): PersistedSelection | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedSelection) : null
  } catch {
    return null
  }
}

const persistSelection = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      wellId: selectedWellId.value,
      stageIds: preferredStageIds.value
    }))
  } catch {
    // sessionStorage 不可用时忽略，不影响页面功能
  }
}

const wellList = ref<Well[]>([])
const selectedWellId = ref<number | null>(null)
const selectedWell = ref<Well | null>(null)

const lifecycleStages = ref<StageSummary[]>([])
const comparison = ref<LifecycleComparison | null>(null)

const selectedStageId = ref<string | null>(null)
// 仅保存阶段 id，时间线/阶段列表/详情面板都从当前井的阶段数据派生，保证三者同步
const preferredStageIds = ref<Record<number, string>>({})
const activeTab = ref('metrics')

const lifecycleLoading = ref(false)
const lifecycleError = ref('')

// 阶段详情按 “井 + 阶段” 缓存，返回该井时可同步恢复，且绝不与其他井串数据
const detailCache = ref<Record<string, StageDetail>>({})
const detailLoading = ref(false)
const detailError = ref('')
// 当前详情请求归属的 “井+阶段”，用于丢弃过期井/过期阶段的响应
const detailRequestKey = ref('')

let lifecycleSeq = 0
let detailSeq = 0

const trendChartEl = ref<HTMLElement>()
const durationChartEl = ref<HTMLElement>()
const costChartEl = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let durationChart: echarts.ECharts | null = null
let costChart: echarts.ECharts | null = null

const selectedStageSummary = computed(() =>
  selectedStageId.value
    ? lifecycleStages.value.find(s => s.id === selectedStageId.value) ?? null
    : null
)

const stageDetail = computed(() =>
  selectedWellId.value !== null && selectedStageId.value
    ? detailCache.value[`${selectedWellId.value}:${selectedStageId.value}`] ?? null
    : null
)

const metricsList = computed(() => stageDetail.value?.metrics ?? [])
const eventList = computed(() => stageDetail.value?.events ?? [])
const documentList = computed(() => stageDetail.value?.documents ?? [])
const hasTrendData = computed(() => {
  const t = stageDetail.value?.trend
  return !!t && Array.isArray(t.xData) && t.xData.length > 0
})

const currentStage = computed(() => lifecycleStages.value.find(s => s.status === 'in_progress'))

const progressPercentage = computed(() => {
  const total = lifecycleStages.value.length
  if (total === 0) return 0
  const completed = lifecycleStages.value.filter(s => s.status === 'completed').length
  return Math.round((completed / total) * 100)
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    生产中: 'success',
    钻井中: 'primary',
    待修井: 'warning',
    关停井: 'danger'
  }
  return map[status] || 'info'
}

const getStageStatusType = (status: string) => {
  const map: Record<string, string> = {
    completed: 'success',
    in_progress: 'primary',
    pending: 'info'
  }
  return map[status] || 'info'
}

const getStageStatusText = (status: string) => {
  const map: Record<string, string> = {
    completed: '已完成',
    in_progress: '进行中',
    pending: '待开始'
  }
  return map[status] || status
}

const getStageDuration = (stage: StageSummary) => {
  if (!stage.endDate) return '进行中'
  if (typeof stage.durationDays === 'number') return `${stage.durationDays} 天`
  const start = new Date(stage.startDate)
  const end = new Date(stage.endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Number.isNaN(days) ? '-' : `${days} 天`
}

const clearCharts = () => {
  trendChart?.dispose()
  durationChart?.dispose()
  costChart?.dispose()
  trendChart = null
  durationChart = null
  costChart = null
}

// 切换井 / 加载失败 / 空数据时清理上一口井残留的全部内容
const resetLifecycleView = () => {
  lifecycleStages.value = []
  comparison.value = null
  selectedStageId.value = null
  detailLoading.value = false
  detailError.value = ''
  detailRequestKey.value = ''
  activeTab.value = 'metrics'
  clearCharts()
}

const pickStageAfterLoad = (wellId: number, preferredId?: string) => {
  if (lifecycleStages.value.length === 0) {
    selectedStageId.value = null
    return
  }
  const target =
    (preferredId && lifecycleStages.value.find(s => s.id === preferredId)) ||
    lifecycleStages.value.find(s => s.status === 'in_progress') ||
    lifecycleStages.value[lifecycleStages.value.length - 1]
  selectedStageId.value = target.id
  preferredStageIds.value[wellId] = target.id
  persistSelection()
  loadStageDetail(wellId, target.id)
}

const loadLifecycle = async (wellId: number, preferredStageId?: string) => {
  const seq = ++lifecycleSeq
  lifecycleLoading.value = true
  lifecycleError.value = ''
  // 先清掉旧井内容，避免新数据到达前时间线/列表仍展示旧井阶段
  resetLifecycleView()

  try {
    const res = await getWellLifecycle(wellId)
    if (seq !== lifecycleSeq) return // 已切换到其他井，丢弃过期响应
    const payload = unwrap<any>(res.data, { stages: [] })
    const stages = (Array.isArray(payload) ? payload : payload.stages ?? []) as StageSummary[]
    lifecycleStages.value = Array.isArray(stages) ? stages : []
    comparison.value = (payload.comparison as LifecycleComparison) ?? null

    pickStageAfterLoad(wellId, preferredStageId)
    await nextTick()
    renderComparisonCharts()
  } catch (e: any) {
    if (seq !== lifecycleSeq) return
    // 失败时清空旧井内容，但保留 selectedWellId/各井选择偏好，便于重试后恢复
    lifecycleStages.value = []
    comparison.value = null
    lifecycleError.value = e?.message || '加载失败，请稍后重试'
    if (preferredStageId) selectedStageId.value = preferredStageId
    clearCharts()
  } finally {
    if (seq === lifecycleSeq) lifecycleLoading.value = false
  }
}

const loadStageDetail = async (wellId: number, stageId: string) => {
  const seq = ++detailSeq
  const key = `${wellId}:${stageId}`
  detailRequestKey.value = key
  detailError.value = ''

  if (detailCache.value[key]) {
    detailLoading.value = false
    return
  }

  detailLoading.value = true
  try {
    const res = await getStageDetail(wellId, stageId)
    if (seq !== detailSeq || detailRequestKey.value !== key) return
    const detail = unwrap<StageDetail>(res.data, {} as StageDetail)
    // 防御：详情必须属于当前井当前阶段，防止异常后端返回串井数据
    if (detail && (!detail.id || detail.id !== stageId)) detail.id = stageId
    detailCache.value = { ...detailCache.value, [key]: detail }
  } catch (e: any) {
    if (seq !== detailSeq || detailRequestKey.value !== key) return
    detailError.value = e?.message || '详情加载失败，请稍后重试'
  } finally {
    if (seq === detailSeq && detailRequestKey.value === key) detailLoading.value = false
  }
}

const handleWellChange = () => {
  if (selectedWellId.value === null) {
    selectedWell.value = null
    resetLifecycleView()
    return
  }
  selectedWell.value = wellList.value.find(w => w.id === selectedWellId.value) || null
  persistSelection()
  loadLifecycle(selectedWellId.value, preferredStageIds.value[selectedWellId.value])
}

const selectStage = (stageId: string) => {
  if (selectedWellId.value === null) return
  selectedStageId.value = stageId
  preferredStageIds.value[selectedWellId.value] = stageId
  detailError.value = ''
  activeTab.value = 'metrics'
  persistSelection()
  loadStageDetail(selectedWellId.value, stageId)
  // 切阶段后等 DOM 更新，确保趋势图在当前井当前阶段数据上重绘
  nextTick(() => renderTrendChart())
}

const reloadLifecycle = () => {
  if (selectedWellId.value === null) return
  const preferred = preferredStageIds.value[selectedWellId.value]
  loadLifecycle(selectedWellId.value, preferred)
}

const retryLoadDetail = () => {
  if (selectedWellId.value === null || !selectedStageId.value) return
  loadStageDetail(selectedWellId.value, selectedStageId.value)
}

const renderTrendChart = () => {
  if (!trendChartEl.value) return
  if (!hasTrendData.value) {
    trendChart?.dispose()
    trendChart = null
    return
  }
  if (!trendChart) trendChart = echarts.init(trendChartEl.value)
  const trend = stageDetail.value?.trend
  if (!trend) return
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: trend.series.map(s => s.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: trend.xData },
    yAxis: { type: 'value' },
    series: trend.series.map(s => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      itemStyle: s.color ? { color: s.color } : undefined
    }))
  }, true)
}

const renderDurationChart = () => {
  if (!durationChartEl.value || lifecycleStages.value.length === 0) return
  if (!durationChart) durationChart = echarts.init(durationChartEl.value)

  let names: string[] = []
  let days: Array<number | null> = []
  if (comparison.value?.duration?.length) {
    names = comparison.value.duration.map(d => d.name)
    days = comparison.value.duration.map(d => d.days)
  } else {
    names = lifecycleStages.value.map(s => s.name)
    days = lifecycleStages.value.map(s => {
      if (typeof s.durationDays === 'number') return s.durationDays
      if (!s.endDate) return null
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      const d = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return Number.isNaN(d) ? null : d
    })
  }

  durationChart.setOption({
    title: { text: '各阶段周期对比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '天数' },
    series: [{
      type: 'bar',
      data: days,
      itemStyle: {
        color: (params: { dataIndex: number }) => {
          const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#06b6d4', '#64748b']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }, true)
}

const renderCostChart = () => {
  if (!costChartEl.value || lifecycleStages.value.length === 0) return
  if (!costChart) costChart = echarts.init(costChartEl.value)

  const costData = comparison.value?.cost?.length
    ? comparison.value.cost
    : lifecycleStages.value
        .filter(s => typeof s.cost === 'number')
        .map(s => ({ name: s.name, value: s.cost as number }))

  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#06b6d4', '#64748b']

  costChart.setOption({
    title: { text: '各阶段费用占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 'bold' }
      },
      labelLine: { show: false },
      data: costData.map((d, i) => ({
        ...d,
        itemStyle: { color: colors[i % colors.length] }
      }))
    }]
  }, true)
}

const renderComparisonCharts = () => {
  renderDurationChart()
  renderCostChart()
}

const handleResize = () => {
  trendChart?.resize()
  durationChart?.resize()
  costChart?.resize()
}

// 切换到趋势 tab 时图表容器才显示，需要补一次初始化/resize
watch(activeTab, (tab) => {
  if (tab === 'trend') nextTick(() => renderTrendChart())
})

// 阶段详情（含趋势数据）到达后刷新趋势图
watch(stageDetail, () => {
  nextTick(() => renderTrendChart())
})

const loadWellList = () => {
  wellList.value = [
    { id: 1, wellCode: 'A-001', wellName: 'A-01井', blockName: '胜利油田', status: '生产中' },
    { id: 2, wellCode: 'B-003', wellName: 'B-03井', blockName: '胜利油田', status: '钻井中' },
    { id: 3, wellCode: 'C-002', wellName: 'C-02井', blockName: '胜利油田', status: '生产中' }
  ]
}

onMounted(async () => {
  loadWellList()
  window.addEventListener('resize', handleResize)

  const persisted = readPersisted()
  const initialWellId = persisted?.wellId && wellList.value.some(w => w.id === persisted.wellId)
    ? persisted.wellId
    : wellList.value[0].id
  if (persisted) preferredStageIds.value = persisted.stageIds || {}

  selectedWellId.value = initialWellId
  selectedWell.value = wellList.value.find(w => w.id === initialWellId) || null
  await loadLifecycle(initialWellId, preferredStageIds.value[initialWellId])
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearCharts()
})
</script>

<style scoped lang="scss">
.lifecycle-container {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #1e293b;
}

.state-alert {
  margin-bottom: 12px;
}

.well-select-card {
  .well-selector {
    display: flex;
    align-items: center;
    gap: 20px;

    .well-info {
      display: flex;
      align-items: center;
      gap: 15px;

      .well-code,
      .well-block {
        color: #64748b;
        font-size: 14px;
      }
    }
  }
}

.timeline-card {
  .timeline-body {
    min-height: 160px;
  }

  .timeline-container {
    padding: 40px 20px;

    .timeline-track {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .timeline-progress {
        position: absolute;
        top: 19px;
        left: 4%;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #22c55e);
        border-radius: 2px;
        transition: width 0.5s ease;
        z-index: 1;
      }

      .timeline-node {
        position: relative;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        z-index: 2;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.05);
        }

        &.selected .node-name {
          color: #3b82f6;
        }

        &.selected .node-icon {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
        }

        .node-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          color: #94a3b8;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
        }

        &.active .node-icon {
          background: #22c55e;
          color: #fff;
        }

        &.current .node-icon {
          background: #3b82f6;
          color: #fff;
          animation: pulse 2s infinite;
        }

        .node-content {
          margin-top: 12px;
          text-align: center;

          .node-name {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 4px;
          }

          .node-date {
            font-size: 12px;
            color: #64748b;
          }

          .node-progress {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 2px;
          }
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
}

.stage-list-card {
  height: 100%;

  .stage-nav {
    min-height: 200px;

    .stage-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;

      &:hover {
        background: #f1f5f9;
      }

      &.active {
        background: #eff6ff;

        .stage-name {
          color: #3b82f6;
        }

        .stage-arrow {
          color: #3b82f6;
        }
      }

      .stage-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.completed {
          background: #22c55e;
        }

        &.in_progress {
          background: #3b82f6;
        }

        &.pending {
          background: #94a3b8;
        }
      }

      .stage-info {
        flex: 1;

        .stage-name {
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          margin-bottom: 2px;
        }

        .stage-duration {
          font-size: 12px;
          color: #64748b;
        }
      }

      .stage-arrow {
        color: #94a3b8;
      }
    }
  }
}

.stage-detail-card {
  min-height: 420px;

  .detail-state {
    padding: 40px 0;
  }

  .detail-loading {
    min-height: 300px;
  }

  .info-group {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;

    .info-label {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .info-value {
      font-size: 16px;
      font-weight: 500;
      color: #1e293b;
    }
  }

  .metric-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 12px;

    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 22px;
    }

    .metric-content {
      flex: 1;

      .metric-value {
        font-size: 20px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 2px;
      }

      .metric-name {
        font-size: 13px;
        color: #64748b;
      }
    }
  }
}

.chart-container {
  width: 100%;
  height: 300px;
}

.mt-20 {
  margin-top: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.comparison-card {
  .chart-container {
    height: 280px;
  }
}
</style>
