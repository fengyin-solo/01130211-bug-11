import request from '@/utils/request'

export interface StageMetric {
  name: string
  value: string
  icon: string
  color: string
}

export interface StageEvent {
  id: string
  title: string
  description: string
  time: string
  type: string
  color: string
}

export interface StageDocument {
  id?: string
  name: string
  type: string
  size: string
  uploadTime: string
}

export interface StageTrend {
  xData: string[]
  series: Array<{ name: string; color?: string; data: number[] }>
}

export interface StageSummary {
  id: string
  name: string
  status: string
  startDate: string
  endDate?: string
  manager?: string
  progress: number
  durationDays?: number | null
  cost?: number | null
}

export interface StageDetail extends StageSummary {
  metrics?: StageMetric[]
  events?: StageEvent[]
  documents?: StageDocument[]
  trend?: StageTrend
}

export interface LifecycleComparison {
  duration: Array<{ name: string; days: number | null }>
  cost: Array<{ name: string; value: number }>
}

export interface LifecyclePayload {
  stages: StageSummary[]
  comparison?: LifecycleComparison
}

export interface ApiResult<T = any> {
  code: number
  message: string
  data: T
}

export function getWellLifecycle(wellId: number) {
  return request({
    url: `/lifecycle/${wellId}`,
    method: 'get'
  }) as unknown as Promise<ApiResult<LifecyclePayload>>
}

export function getStageDetail(wellId: number, stageId: string) {
  return request({
    url: `/lifecycle/${wellId}/stage/${stageId}`,
    method: 'get'
  }) as unknown as Promise<ApiResult<StageDetail>>
}

export function getStageMetrics(wellId: number, stageId: string) {
  return request({
    url: `/lifecycle/${wellId}/stage/${stageId}/metrics`,
    method: 'get'
  }) as unknown as Promise<ApiResult<StageMetric[]>>
}

export function getStageEvents(wellId: number, stageId: string) {
  return request({
    url: `/lifecycle/${wellId}/stage/${stageId}/events`,
    method: 'get'
  }) as unknown as Promise<ApiResult<StageEvent[]>>
}

export function getStageDocuments(wellId: number, stageId: string) {
  return request({
    url: `/lifecycle/${wellId}/stage/${stageId}/documents`,
    method: 'get'
  }) as unknown as Promise<ApiResult<StageDocument[]>>
}

export function getLifecycleComparison(wellId: number) {
  return request({
    url: `/lifecycle/${wellId}/comparison`,
    method: 'get'
  }) as unknown as Promise<ApiResult<LifecycleComparison>>
}
