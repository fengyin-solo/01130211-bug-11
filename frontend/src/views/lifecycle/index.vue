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
        <el-card class="timeline-card" v-loading="listLoading">
          <template #header>
            <div class="card-header">
              <span>全生命周期时间线</span>
              <el-tag v-if="currentStage" type="info">当前阶段: {{ currentStage.name }}</el-tag>
            </div>
          </template>
          <div v-if="listError" class="state-placeholder">
            <el-empty description="生命周期数据加载失败" :image-size="90">
              <el-button type="primary" @click="retryLifecycle">重试</el-button>
            </el-empty>
          </div>
          <div v-else-if="!listLoading && !lifecycleStages.length" class="state-placeholder">
            <el-empty description="暂无生命周期数据" :image-size="90">
              <el-button type="primary" @click="retryLifecycle">重新加载</el-button>
            </el-empty>
          </div>
          <div v-else class="timeline-container">
            <div class="timeline-track">
              <div class="timeline-progress" :style="{ width: `${progressPercentage}%` }"></div>
              <div v-for="(stage, index) in lifecycleStages" :key="stage.id" class="timeline-node" :class="{ active: stage.status === 'completed', current: stage.status === 'in_progress', selected: selectedStageId === stage.id }" @click="selectStage(stage)">
                <div class="node-icon">
                  <el-icon v-if="stage.status === 'completed'" size="20"><CircleCheck /></el-icon>
                  <el-icon v-else-if="stage.status === 'in_progress'" size="20"><Loading /></el-icon>
                  <el-icon v-else size="20"><CircleClose /></el-icon>
                </div>
                <div class="node-content">
                  <div class="node-name">{{ stage.name }}</div>
                  <div class="node-date">{{ stage.startDate }} ~ {{ stage.endDate || '进行中' }}</div>
                </div>
                <div class="node-line" v-if="index < lifecycleStages.length - 1"></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="6">
        <el-card class="stage-list-card" v-loading="listLoading">
          <template #header>
            <span>阶段详情</span>
          </template>
          <div v-if="listError" class="state-placeholder">
            <el-empty description="阶段列表加载失败" :image-size="80">
              <el-button type="primary" size="small" @click="retryLifecycle">重试</el-button>
            </el-empty>
          </div>
          <div v-else-if="!listLoading && !lifecycleStages.length" class="state-placeholder">
            <el-empty description="暂无阶段数据" :image-size="80" />
          </div>
          <div v-else class="stage-nav">
            <div v-for="stage in lifecycleStages" :key="stage.id" class="stage-item" :class="{ active: selectedStageId === stage.id }" @click="selectStage(stage)">
              <div class="stage-indicator" :class="stage.status"></div>
              <div class="stage-info">
                <div class="stage-name">{{ stage.name }}</div>
                <div class="stage-duration">持续: {{ getStageDuration(stage) }}</div>
              </div>
              <el-icon class="stage-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card v-if="selectedStage" class="stage-detail-card" v-loading="detailLoading">
          <template #header>
            <div class="card-header">
              <span>{{ selectedStage.name }} - 详细信息</span>
              <el-tag :type="getStageStatusType(selectedStage.status)">{{ getStageStatusText(selectedStage.status) }}</el-tag>
            </div>
          </template>

          <div v-if="detailError" class="state-placeholder">
            <el-empty description="阶段详情加载失败" :image-size="90">
              <el-button type="primary" @click="retryStageDetail">重试</el-button>
            </el-empty>
          </div>

          <template v-else-if="stageDetail">
            <el-row :gutter="20" class="mb-20">
              <el-col :span="12">
                <div class="info-group">
                  <div class="info-label">开始时间</div>
                  <div class="info-value">{{ selectedStage.startDate }}</div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-group">
                  <div class="info-label">结束时间</div>
                  <div class="info-value">{{ selectedStage.endDate || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-group">
                  <div class="info-label">负责人</div>
                  <div class="info-value">{{ selectedStage.manager || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-group">
                  <div class="info-label">完成度</div>
                  <div class="info-value">
                    <el-progress :percentage="selectedStage.progress" :status="selectedStage.progress === 100 ? 'success' : ''" />
                  </div>
                </div>
              </el-col>
            </el-row>

            <el-tabs v-model="activeTab">
              <el-tab-pane label="关键指标" name="metrics">
                <el-row v-if="stageDetail.metrics.length" :gutter="20">
                  <el-col :span="8" v-for="metric in stageDetail.metrics" :key="metric.name">
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
                <el-empty v-else description="暂无指标数据" :image-size="80" />
              </el-tab-pane>
              <el-tab-pane label="数据趋势" name="trend">
                <div v-show="hasTrendData" ref="trendChart" class="chart-container"></div>
                <el-empty v-if="!hasTrendData" description="暂无趋势数据" :image-size="80" />
              </el-tab-pane>
              <el-tab-pane label="关键事件" name="events">
                <el-timeline v-if="stageDetail.events.length">
                  <el-timeline-item v-for="event in stageDetail.events" :key="event.id" :timestamp="event.time" :type="event.type" :color="event.color">
                    <el-card>
                      <h4>{{ event.title }}</h4>
                      <p>{{ event.description }}</p>
                    </el-card>
                  </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="暂无关键事件" :image-size="80" />
              </el-tab-pane>
              <el-tab-pane label="文档资料" name="docs">
                <el-table v-if="stageDetail.documents.length" :data="stageDetail.documents" style="width: 100%">
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
                <el-empty v-else description="暂无文档资料" :image-size="80" />
              </el-tab-pane>
            </el-tabs>
          </template>
        </el-card>
        <el-card v-else class="stage-detail-card">
          <div class="state-placeholder">
            <el-empty :description="listError ? '数据加载失败，请重试' : '暂无阶段数据'" :image-size="90" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="comparison-card">
          <template #header>
            <div class="card-header">
              <span>各阶段对比分析</span>
            </div>
          </template>
          <el-row v-if="lifecycleStages.length" :gutter="20">
            <el-col :span="12">
              <div ref="durationChart" class="chart-container"></div>
            </el-col>
            <el-col :span="12">
              <div v-if="comparisonCost.length" ref="costChart" class="chart-container"></div>
              <el-empty v-else description="暂无费用数据" :image-size="80" />
            </el-col>
          </el-row>
          <div v-else class="state-placeholder">
            <el-empty :description="listError ? '数据加载失败，请重试' : '暂无对比数据'" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getWellList } from '@/api/well'
import { getWellLifecycle, getStageDetail, getLifecycleComparison } from '@/api/lifecycle'

interface Well {
  id: number
  wellCode: string
  wellName: string
  blockName: string
  status: string
}

interface Stage {
  id: string
  name: string
  status: string
  startDate: string
  endDate?: string
  manager?: string
  progress: number
  metrics?: StageMetric[]
  events?: StageEvent[]
  documents?: StageDocument[]
  trend?: TrendData
}

interface StageMetric {
  name: string
  value: string
  icon: string
  color: string
}

interface StageEvent {
  id: string
  title: string
  description: string
  time: string
  type: string
  color: string
}

interface StageDocument {
  name: string
  type: string
  size: string
  uploadTime: string
}

interface TrendData {
  xData: string[]
  series: Array<{ name: string; data: number[]; color?: string }>
}

interface StageDetail {
  metrics: StageMetric[]
  events: StageEvent[]
  documents: StageDocument[]
  trend: TrendData | null
}

interface CostItem {
  name: string
  value: number
}

const fallbackWells: Well[] = [
  { id: 1, wellCode: 'A-001', wellName: 'A-01井', blockName: '胜利油田', status: '生产中' },
  { id: 2, wellCode: 'B-003', wellName: 'B-03井', blockName: '胜利油田', status: '钻井中' },
  { id: 3, wellCode: 'C-002', wellName: 'C-02井', blockName: '胜利油田', status: '生产中' }
]

const wellList = ref<Well[]>([])
const selectedWellId = ref<number | null>(null)
const lifecycleStages = ref<Stage[]>([])
// 唯一的选择源：时间线、阶段列表、详情面板都从这里派生，保证同步
const selectedStageId = ref<string | null>(null)
const stageDetail = ref<StageDetail | null>(null)
const comparisonCost = ref<CostItem[]>([])
const activeTab = ref('metrics')

const listLoading = ref(false)
const listError = ref(false)
const detailLoading = ref(false)
const detailError = ref(false)

// 请求序号：快速切换井位/阶段时丢弃过期的异步响应，避免串井数据
let lifecycleRequestSeq = 0
let detailRequestSeq = 0

const trendChart = ref<HTMLElement>()
const durationChart = ref<HTMLElement>()
const costChart = ref<HTMLElement>()

const charts: Record<'trend' | 'duration' | 'cost', echarts.ECharts | null> = {
  trend: null,
  duration: null,
  cost: null
}

const selectedWell = computed(() => {
  return wellList.value.find(w => w.id === selectedWellId.value) || null
})

const selectedStage = computed(() => {
  return lifecycleStages.value.find(s => s.id === selectedStageId.value) || null
})

const currentStage = computed(() => {
  return lifecycleStages.value.find(s => s.status === 'in_progress')
})

const progressPercentage = computed(() => {
  const total = lifecycleStages.value.length
  if (!total) return 0
  const completed = lifecycleStages.value.filter(s => s.status === 'completed').length
  return Math.round((completed / total) * 100)
})

const hasTrendData = computed(() => {
  const trend = stageDetail.value?.trend
  return !!trend && trend.xData.length > 0 && trend.series.length > 0
})

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '生产中': 'success',
    '钻井中': 'primary',
    '待修井': 'warning',
    '关停井': 'danger'
  }
  return map[status] || 'info'
}

const getStageStatusType = (status: string) => {
  const map: Record<string, any> = {
    'completed': 'success',
    'in_progress': 'primary',
    'pending': 'info'
  }
  return map[status] || 'info'
}

const getStageStatusText = (status: string) => {
  const map: Record<string, string> = {
    'completed': '已完成',
    'in_progress': '进行中',
    'pending': '待开始'
  }
  return map[status] || status
}

const getStageDuration = (stage: Stage) => {
  if (!stage.endDate) return '进行中'
  const start = new Date(stage.startDate)
  const end = new Date(stage.endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return `${days} 天`
}

const normalizeStages = (res: any): Stage[] => {
  const payload = res?.data ?? res
  const list = Array.isArray(payload) ? payload : payload?.stages
  return Array.isArray(list) ? list : []
}

const normalizeDetail = (payload: any): StageDetail => {
  const source = payload ?? {}
  const trend = source.trend
  return {
    metrics: Array.isArray(source.metrics) ? source.metrics : [],
    events: Array.isArray(source.events) ? source.events : [],
    documents: Array.isArray(source.documents) ? source.documents : [],
    trend: trend && Array.isArray(trend.xData) && Array.isArray(trend.series) ? trend : null
  }
}

const normalizeCost = (res: any): CostItem[] => {
  const payload = res?.data ?? res
  const list = Array.isArray(payload) ? payload : payload?.cost
  return Array.isArray(list) ? list : []
}

const disposeChart = (key: keyof typeof charts) => {
  charts[key]?.dispose()
  charts[key] = null
}

const disposeAllCharts = () => {
  disposeChart('trend')
  disposeChart('duration')
  disposeChart('cost')
}

const handleResize = () => {
  Object.values(charts).forEach(chart => chart?.resize())
}

// 清理上一口井/上一个阶段残留的内容，但保留 selectedStageId 以便恢复选择
const clearStageContent = () => {
  lifecycleStages.value = []
  stageDetail.value = null
  detailError.value = false
  comparisonCost.value = []
  disposeAllCharts()
}

const loadWellList = async () => {
  try {
    const res = await getWellList({})
    const payload = res?.data ?? res
    const list = Array.isArray(payload) ? payload : payload?.list
    wellList.value = Array.isArray(list) && list.length ? list : fallbackWells
  } catch {
    wellList.value = fallbackWells
  }
  if (wellList.value.length && !wellList.value.some(w => w.id === selectedWellId.value)) {
    selectedWellId.value = wellList.value[0].id
  }
}

const loadLifecycleData = async (preferredStageId: string | null = selectedStageId.value) => {
  const wellId = selectedWellId.value
  if (!wellId) return
  const seq = ++lifecycleRequestSeq
  listLoading.value = true
  listError.value = false
  clearStageContent()
  try {
    const res = await getWellLifecycle(wellId)
    if (seq !== lifecycleRequestSeq || wellId !== selectedWellId.value) return
    const stages = normalizeStages(res)
    lifecycleStages.value = stages
    if (stages.length) {
      // 恢复选择：优先之前选中的阶段，其次进行中阶段，最后第一个阶段
      const target = stages.find(s => s.id === preferredStageId)
        || stages.find(s => s.status === 'in_progress')
        || stages[0]
      selectedStageId.value = target.id
      loadStageDetail(target.id)
    } else {
      selectedStageId.value = null
    }
    await nextTick()
    renderDurationChart()
    loadComparison(wellId, seq)
  } catch {
    if (seq !== lifecycleRequestSeq || wellId !== selectedWellId.value) return
    // 失败时清空旧内容，但保留 selectedStageId，重试后可恢复选择
    lifecycleStages.value = []
    listError.value = true
  } finally {
    if (seq === lifecycleRequestSeq) listLoading.value = false
  }
}

const loadStageDetail = async (stageId: string) => {
  const wellId = selectedWellId.value
  if (!wellId || !stageId) return
  const seq = ++detailRequestSeq
  detailLoading.value = true
  detailError.value = false
  // 先清空旧详情，避免上一阶段/上一井的指标、事件、文档残留
  stageDetail.value = null
  disposeChart('trend')
  try {
    const stage = lifecycleStages.value.find(s => s.id === stageId)
    const hasEmbeddedDetail = !!(stage && (stage.metrics || stage.events || stage.documents || stage.trend))
    const res = hasEmbeddedDetail ? null : await getStageDetail(wellId, stageId)
    if (seq !== detailRequestSeq || wellId !== selectedWellId.value || stageId !== selectedStageId.value) return
    stageDetail.value = hasEmbeddedDetail ? normalizeDetail(stage) : normalizeDetail(res?.data ?? res)
    await nextTick()
    if (activeTab.value === 'trend') renderTrendChart()
  } catch {
    if (seq !== detailRequestSeq) return
    detailError.value = true
  } finally {
    if (seq === detailRequestSeq) detailLoading.value = false
  }
}

const loadComparison = async (wellId: number, seq: number) => {
  try {
    const res = await getLifecycleComparison(wellId)
    if (seq !== lifecycleRequestSeq || wellId !== selectedWellId.value) return
    comparisonCost.value = normalizeCost(res)
    await nextTick()
    renderCostChart()
  } catch {
    if (seq !== lifecycleRequestSeq) return
    comparisonCost.value = []
    disposeChart('cost')
  }
}

const handleWellChange = () => {
  if (!selectedWellId.value) return
  activeTab.value = 'metrics'
  // 带上当前选中的阶段 id，新井数据到达后同步恢复选择
  loadLifecycleData(selectedStageId.value)
}

const selectStage = (stage: Stage) => {
  if (stage.id === selectedStageId.value && (stageDetail.value || detailLoading.value)) return
  selectedStageId.value = stage.id
  activeTab.value = 'metrics'
  loadStageDetail(stage.id)
}

const retryLifecycle = () => {
  loadLifecycleData(selectedStageId.value)
}

const retryStageDetail = () => {
  if (selectedStageId.value) loadStageDetail(selectedStageId.value)
}

const renderTrendChart = () => {
  const trend = stageDetail.value?.trend
  if (!trendChart.value || !trend) return
  if (!charts.trend) charts.trend = echarts.init(trendChart.value)
  // notMerge：避免上一阶段/上一井的系列残留
  charts.trend.setOption({
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
  if (!durationChart.value || !lifecycleStages.value.length) return
  if (!charts.duration) charts.duration = echarts.init(durationChart.value)
  const now = Date.now()
  charts.duration.setOption({
    title: { text: '各阶段周期对比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: lifecycleStages.value.map(s => s.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '天数' },
    series: [{
      type: 'bar',
      data: lifecycleStages.value.map(s => {
        const start = new Date(s.startDate).getTime()
        if (s.endDate) {
          return Math.ceil((new Date(s.endDate).getTime() - start) / (1000 * 60 * 60 * 24))
        }
        if (s.status === 'in_progress') {
          return Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)))
        }
        return 0
      }),
      itemStyle: {
        color: (params: any) => {
          const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#06b6d4', '#64748b']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }, true)
}

const renderCostChart = () => {
  if (!costChart.value || !comparisonCost.value.length) return
  if (!charts.cost) charts.cost = echarts.init(costChart.value)
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#06b6d4', '#64748b']
  charts.cost.setOption({
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
      data: comparisonCost.value.map((item, index) => ({
        ...item,
        itemStyle: { color: colors[index % colors.length] }
      }))
    }]
  }, true)
}

watch(activeTab, tab => {
  if (tab === 'trend') {
    nextTick(() => {
      renderTrendChart()
      charts.trend?.resize()
    })
  }
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadWellList()
  await loadLifecycleData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeAllCharts()
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

.state-placeholder {
  padding: 30px 0;
  display: flex;
  justify-content: center;
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

      .well-code {
        color: #64748b;
        font-size: 14px;
      }

      .well-block {
        color: #64748b;
        font-size: 14px;
      }
    }
  }
}

.timeline-card {
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

          &.active, &.current {
            background: #22c55e;
            color: #fff;
          }

          &.current {
            background: #3b82f6;
            animation: pulse 2s infinite;
          }
        }

        &.active .node-icon {
          background: #22c55e;
          color: #fff;
        }

        &.current .node-icon {
          background: #3b82f6;
          color: #fff;
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
  min-height: 320px;

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
