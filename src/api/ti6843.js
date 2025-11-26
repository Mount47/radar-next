import request from '@/utils/request'
import { API_CONFIG } from '@/api/config'

// TI6843雷达系统API接口
// 用于TI6843位姿历史数据展示

// ==================== 设备管理接口 ====================

/**
 * 获取所有TI6843设备列表
 */
export function getTI6843Devices() {
  return request({
    url: API_CONFIG.TI6843.ENDPOINTS.DEVICES,
    method: 'get'
  })
}

/**
 * 获取指定TI6843设备信息
 * @param {string} deviceId 设备ID (如: TI6843_001)
 */
export function getTI6843Device(deviceId) {
  return request({
    url: `${API_CONFIG.TI6843.ENDPOINTS.DEVICES}/${deviceId}`,
    method: 'get'
  })
}

// ==================== 实时数据查询接口 ====================

/**
 * 获取指定设备的最新实时数据
 * @param {string} deviceId 设备ID (如: TI6843_001)
 */
export function getTI6843DeviceRealtimeData(deviceId) {
  return request({
    url: `/api/ti6843/data/realtime/${deviceId}`,
    method: 'get'
  })
}

/**
 * 获取指定人员的最新实时数据
 * @param {string} personId 人员ID (如: PERSON_001)
 */
export function getTI6843PersonRealtimeData(personId) {
  return request({
    url: `/api/ti6843/data/person/${personId}/realtime`,
    method: 'get'
  })
}

// ==================== 历史数据查询接口 ====================

/**
 * 分页查询设备历史数据
 * @param {Object} params 查询参数
 */
export function getTI6843DeviceHistoricalData(params) {
  return request({
    url: '/api/ti6843/data/historical',
    method: 'get',
    params
  })
}

/**
 * 分页查询人员历史数据
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数
 */
export function getTI6843PersonHistoricalData(personId, params) {
  return request({
    url: `/api/ti6843/data/person/${personId}/historical`,
    method: 'get',
    params
  })
}

// ==================== 位姿历史数据接口 ====================

/**
 * 获取位姿历史数据
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end, page?, size?, sort?}
 */
export function getTI6843PostureHistoricalData(params) {
  return request({
    url: API_CONFIG.TI6843.ENDPOINTS.POSTURE_HISTORICAL,
    method: 'get',
    params
  })
}

/**
 * 获取位姿历史数据统计
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end}
 */
export function getTI6843PostureHistoricalSummary(params) {
  return request({
    url: API_CONFIG.TI6843.ENDPOINTS.POSTURE_HISTORICAL_SUMMARY,
    method: 'get',
    params
  })
}

// ==================== 心电图历史数据接口 ====================

/**
 * 获取心电图历史数据
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end, page?, size?, sort?}
 */
export function getTI6843ECGHistoricalData(params) {
  return request({
    url: API_CONFIG.TI6843.ENDPOINTS.ECG_HISTORICAL,
    method: 'get',
    params
  })
}

/**
 * 获取心电图历史数据统计
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end}
 */
export function getTI6843ECGHistoricalSummary(params) {
  return request({
    url: '/api/ti6843/ecg/historical/summary',
    method: 'get',
    params
  })
}

// ==================== 生命体征历史数据接口 ====================

/**
 * 获取生命体征历史数据
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end, page?, size?, sort?}
 */
export function getTI6843VitalHistoricalData(params) {
  return request({
    url: API_CONFIG.TI6843.ENDPOINTS.VITAL_HISTORICAL,
    method: 'get',
    params
  })
}

/**
 * 获取生命体征历史数据统计
 * @param {Object} params 查询参数 {deviceId?, personId?, start, end}
 */
export function getTI6843VitalHistoricalSummary(params) {
  return request({
    url: '/api/ti6843/vital/historical/summary',
    method: 'get',
    params
  })
}

// ==================== 统计查询接口 ====================

/**
 * 获取设备历史数据统计
 * @param {Object} params 查询参数 {deviceId, start, end}
 */
export function getTI6843DeviceHistoricalSummary(params) {
  return request({
    url: '/api/ti6843/data/historical/summary',
    method: 'get',
    params
  })
}

/**
 * 获取人员历史数据统计
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数 {start, end}
 */
export function getTI6843PersonHistoricalSummary(personId, params) {
  return request({
    url: `/api/ti6843/data/person/${personId}/historical/summary`,
    method: 'get',
    params
  })
}

// ==================== WebSocket工具函数 ====================

/**
 * 获取TI6843 WebSocket连接URL
 */
export function getTI6843WebSocketUrl() {
  return API_CONFIG.WS.BASE_URL + API_CONFIG.TI6843.WS_ENDPOINT
}

/**
 * 创建TI6843 WebSocket连接
 */
export function createTI6843WebSocket() {
  const wsUrl = getTI6843WebSocketUrl()
  console.log('🔗 创建TI6843 WebSocket连接:', wsUrl)
  return new WebSocket(wsUrl)
}








