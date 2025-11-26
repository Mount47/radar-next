import request from '@/utils/request'
import { API_CONFIG } from '@/api/config'

// R60ABD1雷达系统API接口
// 基于最新的R60ABD1_API_Complete_Documentation.md

// ==================== 设备管理接口 ====================

/**
 * 获取所有R60ABD1设备列表
 */
export function getR60ABD1Devices() {
  return request({
    url: API_CONFIG.R60ABD1.ENDPOINTS.DEVICES,
    method: 'get'
  })
}

/**
 * 获取指定R60ABD1设备信息
 * @param {string} deviceId 设备ID (如: R60ABD1_COM1)
 */
export function getR60ABD1Device(deviceId) {
  return request({
    url: `${API_CONFIG.R60ABD1.ENDPOINTS.DEVICES}/${deviceId}`,
    method: 'get'
  })
}

/**
 * 添加新的R60ABD1设备
 * @param {Object} deviceData 设备数据
 */
export function createR60ABD1Device(deviceData) {
  return request({
    url: API_CONFIG.R60ABD1.ENDPOINTS.DEVICES,
    method: 'post',
    data: deviceData
  })
}

/**
 * 更新R60ABD1设备信息
 * @param {string} deviceId 设备ID
 * @param {Object} deviceData 设备数据
 */
export function updateR60ABD1Device(deviceId, deviceData) {
  return request({
    url: `${API_CONFIG.R60ABD1.ENDPOINTS.DEVICES}/${deviceId}`,
    method: 'put',
    data: deviceData
  })
}

/**
 * 删除R60ABD1设备
 * @param {string} deviceId 设备ID
 */
export function deleteR60ABD1Device(deviceId) {
  return request({
    url: `${API_CONFIG.R60ABD1.ENDPOINTS.DEVICES}/${deviceId}`,
    method: 'delete'
  })
}

// ==================== 实时数据查询接口 ====================

/**
 * 获取指定设备的最新实时数据
 * @param {string} deviceId 设备ID (如: R60ABD1_COM1)
 */
export function getDeviceRealtimeData(deviceId) {
  return request({
    url: `/api/r60abd1/data/realtime/${deviceId}`,
    method: 'get'
  })
}

/**
 * 获取指定人员的最新实时数据
 * @param {string} personId 人员ID (如: PERSON_001)
 */
export function getPersonRealtimeData(personId) {
  return request({
    url: `/api/r60abd1/data/person/${personId}/realtime`,
    method: 'get'
  })
}

// ==================== 历史数据查询接口 ====================

/**
 * 按设备ID和时间范围查询实时数据
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getDeviceDataByTimeRange(deviceId, start, end) {
  return request({
    url: `/api/r60abd1/data/data/device/${deviceId}/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 按人员ID和时间范围查询数据
 * @param {string} personId 人员ID
 * @param {string} start 开始时间
 * @param {string} end 结束时间
 */
export function getPersonDataByTimeRange(personId, start, end) {
  return request({
    url: `/api/r60abd1/data/person/${personId}/data/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 分页查询设备历史数据
 * @param {Object} params 查询参数
 */
export function getDeviceHistoricalData(params) {
  return request({
    url: '/api/r60abd1/data/historical',
    method: 'get',
    params
  })
}

/**
 * 分页查询人员历史数据
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数
 */
export function getPersonHistoricalData(personId, params) {
  return request({
    url: `/api/r60abd1/data/person/${personId}/historical`,
    method: 'get',
    params
  })
}

// ==================== 统计查询接口 ====================

/**
 * 获取设备历史数据统计
 * @param {Object} params 查询参数 {deviceId, start, end}
 */
export function getDeviceHistoricalSummary(params) {
  return request({
    url: '/api/r60abd1/data/historical/summary',
    method: 'get',
    params
  })
}

/**
 * 获取人员历史数据统计
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数 {start, end}
 */
export function getPersonHistoricalSummary(personId, params) {
  return request({
    url: `/api/r60abd1/data/person/${personId}/historical/summary`,
    method: 'get',
    params
  })
}

// ==================== 人员设备绑定管理接口 ====================

/**
 * 创建人员设备绑定关系
 * @param {string} personId 人员ID
 * @param {string} deviceId 设备ID
 * @param {string} mappingName 绑定关系名称 (可选)
 */
export function createPersonDeviceMapping(personId, deviceId, mappingName) {
  const params = new URLSearchParams({ personId, deviceId })
  if (mappingName) {
    params.append('mappingName', mappingName)
  }
  
  return request({
    url: `/api/person-device-mappings/create?${params.toString()}`,
    method: 'post'
  })
}

/**
 * 切换设备绑定的人员
 * @param {string} deviceId 设备ID
 * @param {string} newPersonId 新人员ID
 * @param {string} mappingName 新绑定关系名称 (可选)
 */
export function switchPersonDeviceMapping(deviceId, newPersonId, mappingName) {
  const params = new URLSearchParams({ deviceId, newPersonId })
  if (mappingName) {
    params.append('mappingName', mappingName)
  }
  
  return request({
    url: `/api/person-device-mappings/switch?${params.toString()}`,
    method: 'post'
  })
}

/**
 * 获取所有活跃的绑定关系
 */
export function getActivePersonDeviceMappings() {
  return request({
    url: '/api/person-device-mappings',
    method: 'get'
  })
}

/**
 * 获取人员绑定的所有设备
 * @param {string} personId 人员ID
 */
export function getPersonDevices(personId) {
  return request({
    url: `/api/person-device-mappings/person/${personId}/devices`,
    method: 'get'
  })
}

/**
 * 获取设备绑定的人员信息
 * @param {string} deviceId 设备ID
 */
export function getDevicePerson(deviceId) {
  return request({
    url: `/api/person-device-mappings/device/${deviceId}/person`,
    method: 'get'
  })
}

/**
 * 删除指定绑定关系
 * @param {number} mappingId 绑定关系ID
 */
export function deletePersonDeviceMapping(mappingId) {
  return request({
    url: `/api/person-device-mappings/${mappingId}`,
    method: 'delete'
  })
}

// ==================== WebSocket工具函数 ====================

/**
 * 获取R60ABD1 WebSocket连接URL
 */
export function getR60ABD1WebSocketUrl() {
  return API_CONFIG.WS.BASE_URL + API_CONFIG.R60ABD1.WS_ENDPOINT
}

/**
 * 创建R60ABD1 WebSocket连接
 */
export function createR60ABD1WebSocket() {
  const wsUrl = getR60ABD1WebSocketUrl()
  console.log('🔗 创建R60ABD1 WebSocket连接:', wsUrl)
  return new WebSocket(wsUrl)
}
