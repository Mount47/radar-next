import request from '@/utils/request'

// 基础路径
const BASE_URL = '/ecg/data'

/**
 * ECG API 接口封装
 */
export default {
  // 1. 数据上传 (通常由设备调用，前端可能用于测试)
  uploadData(data) {
    return request({
      url: `${BASE_URL}/data`,
      method: 'post',
      data
    })
  },

  // 2. 实时数据查询（设备维度）
  
  // 获取设备最新实时数据 (List<ECGRealtimeData>)
  getDeviceRealtimeLatest(deviceId) {
    return request({
      url: `${BASE_URL}/realtime/${deviceId}`,
      method: 'get'
    })
  },

  // 获取设备所有实时数据
  getDeviceRealtimeAll(deviceId) {
    return request({
      url: `${BASE_URL}/device/${deviceId}`,
      method: 'get'
    })
  },

  // 查询设备指定时间范围数据
  getDeviceRealtimeRange(deviceId, start, end) {
    return request({
      url: `${BASE_URL}/device/${deviceId}/range`,
      method: 'get',
      params: { start, end }
    })
  },

  // 3. 实时数据查询（人员维度）

  // 获取人员最新实时数据
  getPersonRealtimeLatest(personId) {
    return request({
      url: `${BASE_URL}/person/${personId}/latest`,
      method: 'get'
    })
  },

  // 获取人员所有实时数据
  getPersonRealtimeAll(personId) {
    return request({
      url: `${BASE_URL}/person/${personId}`,
      method: 'get'
    })
  },

  // 查询人员指定时间范围数据
  getPersonRealtimeRange(personId, start, end) {
    return request({
      url: `${BASE_URL}/person/${personId}/range`,
      method: 'get',
      params: { start, end }
    })
  },

  // 4. 历史数据查询（分页）

  // 查询设备历史数据
  getDeviceHistorical(deviceId, params) {
    return request({
      url: `${BASE_URL}/historical/device/${deviceId}`,
      method: 'get',
      params // { start, end, page, size }
    })
  },

  // 查询人员历史数据
  getPersonHistorical(personId, params) {
    return request({
      url: `${BASE_URL}/historical/person/${personId}`,
      method: 'get',
      params // { start, end, page, size }
    })
  },

  // 5. 统计分析

  // 获取设备统计信息
  getDeviceStatistics(deviceId, start, end) {
    return request({
      url: `${BASE_URL}/statistics/device/${deviceId}`,
      method: 'get',
      params: { start, end }
    })
  },

  // 获取人员统计信息
  getPersonStatistics(personId, start, end) {
    return request({
      url: `${BASE_URL}/statistics/person/${personId}`,
      method: 'get',
      params: { start, end }
    })
  },

  // 6. 健康检查
  checkHealth() {
    return request({
      url: `${BASE_URL}/health`,
      method: 'get'
    })
  }
}
