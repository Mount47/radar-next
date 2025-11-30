import request from '@/utils/request'
import { API_CONFIG } from '@/api/core/config'

// TI6843人体位姿传感器API接口
// 基于TI6843_Posture_API_Documentation.md - 双控制器分离设计

// ==================== 位姿数据API接口 (/api/ti6843/posture/data) ====================

/**
 * 获取设备最新位姿数据
 * @param {string} deviceId 设备ID (如: TI6843_POSTURE_001)
 */
export function getTI6843PostureLatest(deviceId) {
  return request({
    url: `/api/ti6843/data/realtime/${deviceId}`,
    method: 'get'
  })
}

/**
 * 获取设备所有位姿数据
 * @param {string} deviceId 设备ID
 */
export function getTI6843PostureDeviceData(deviceId) {
  return request({
    url: `/api/ti6843/posture/data/data/device/${deviceId}`,
    method: 'get'
  })
}

/**
 * 根据时间范围查询位姿数据
 * @param {string} start 开始时间（ISO格式）
 * @param {string} end 结束时间（ISO格式）
 */
export function getTI6843PostureDataByTimeRange(start, end) {
  return request({
    url: '/api/ti6843/posture/data/data/timerange',
    method: 'get',
    params: { start, end }
  })
}

/**
 * 根据设备和时间范围查询位姿数据
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间（ISO格式）
 * @param {string} end 结束时间（ISO格式）
 */
export function getTI6843PostureDeviceDataByTimeRange(deviceId, start, end) {
  return request({
    url: `/api/ti6843/posture/data/data/device/${deviceId}/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取人员最新位姿数据
 * @param {string} personId 人员ID
 */
export function getTI6843PosturePersonLatest(personId) {
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/realtime`,
    method: 'get'
  })
}

/**
 * 获取人员所有位姿数据
 * @param {string} personId 人员ID
 */
export function getTI6843PosturePersonData(personId) {
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/data`,
    method: 'get'
  })
}

/**
 * 根据人员和时间范围查询位姿数据
 * @param {string} personId 人员ID
 * @param {string} start 开始时间（ISO格式）
 * @param {string} end 结束时间（ISO格式）
 */
export function getTI6843PosturePersonRange(personId, start, end) {
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/data/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 发送位姿数据到系统（传感器端使用）
 * @param {Object} data 位姿数据
 */
export function sendTI6843PostureData(data) {
  return request({
    url: '/api/ti6843/posture/data/data',
    method: 'post',
    data
  })
}

/**
 * 数据处理服务健康检查
 */
export function getTI6843PostureDataHealth() {
  return request({
    url: '/api/ti6843/posture/data/health',
    method: 'get'
  })
}

// ==================== 设备管理API接口 (/api/ti6843/posture) ====================

/**
 * 获取所有TI6843位姿设备
 */
export function getTI6843PostureDevices() {
  return request({
    url: '/api/ti6843/posture/devices',
    method: 'get'
  })
}

/**
 * 获取单个设备信息
 * @param {string} deviceId 设备ID
 */
export function getTI6843PostureDevice(deviceId) {
  return request({
    url: `/api/ti6843/posture/devices/${deviceId}`,
    method: 'get'
  })
}

/**
 * 创建新设备
 * @param {Object} device 设备信息
 * @param {string} device.deviceId 设备ID（必填）
 * @param {string} device.location 设备位置
 * @param {string} device.status 设备状态（默认：active）
 * @param {string} device.type 设备类型（默认：posture_sensor）
 */
export function createTI6843PostureDevice(device) {
  return request({
    url: '/api/ti6843/posture/devices',
    method: 'post',
    data: device
  })
}

/**
 * 更新设备信息
 * @param {string} deviceId 设备ID
 * @param {Object} device 设备信息
 */
export function updateTI6843PostureDevice(deviceId, device) {
  return request({
    url: `/api/ti6843/posture/devices/${deviceId}`,
    method: 'put',
    data: device
  })
}

/**
 * 删除设备
 * @param {string} deviceId 设备ID
 */
export function deleteTI6843PostureDevice(deviceId) {
  return request({
    url: `/api/ti6843/posture/devices/${deviceId}`,
    method: 'delete'
  })
}

/**
 * 根据类型查询设备
 * @param {string} type 设备类型
 */
export function getTI6843PostureDevicesByType(type) {
  return request({
    url: `/api/ti6843/posture/devices/type/${type}`,
    method: 'get'
  })
}

/**
 * 根据状态查询设备
 * @param {string} status 设备状态 (active|inactive|online|offline)
 */
export function getTI6843PostureDevicesByStatus(status) {
  return request({
    url: `/api/ti6843/posture/devices/status/${status}`,
    method: 'get'
  })
}

/**
 * 根据位置查询设备
 * @param {string} location 设备位置
 */
export function getTI6843PostureDevicesByLocation(location) {
  return request({
    url: `/api/ti6843/posture/devices/location/${location}`,
    method: 'get'
  })
}

/**
 * 设备管理服务健康检查
 */
export function getTI6843PostureDevicesHealth() {
  return request({
    url: '/api/ti6843/posture/health',
    method: 'get'
  })
}

import { createTI6843PostureWebSocket as createWS } from '@/utils/websocket'

// ...existing code...

// ==================== WebSocket工具函数 ====================

/**
 * 获取TI6843位姿WebSocket连接URL
 */
export function getTI6843PostureWebSocketUrl() {
  return API_CONFIG.WS.BASE_URL + API_CONFIG.WS.ENDPOINTS.TI6843_POSTURE
}

/**
 * 创建TI6843位姿WebSocket连接
 * @param {Function} onMessage 消息回调函数
 * @param {Function} onError 错误回调函数
 * @param {Function} onClose 关闭回调函数
 */
export function createTI6843PostureWebSocket(onMessage, onError, onClose) {
  const client = createWS()
  const ws = client.ws
  
  if (ws) {
    // 绑定回调
    const originalOnMessage = ws.onmessage
    ws.onmessage = (event) => {
      if (originalOnMessage) originalOnMessage(event)
      try {
        const message = JSON.parse(event.data)
        if (onMessage) onMessage(message)
      } catch (e) {}
    }
    
    const originalOnError = ws.onerror
    ws.onerror = (event) => {
      if (originalOnError) originalOnError(event)
      if (onError) onError(event)
    }
    
    const originalOnClose = ws.onclose
    ws.onclose = (event) => {
      if (originalOnClose) originalOnClose(event)
      if (onClose) onClose(event)
    }
  }
  
  return ws
}

/**
 * WebSocket订阅设备数据
 * @param {WebSocket} ws WebSocket连接
 * @param {string} deviceId 设备ID
 */
export function subscribeToTI6843PostureDevice(ws, deviceId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'subscribe',
      deviceId: deviceId
    }))
  }
}

/**
 * WebSocket取消订阅
 * @param {WebSocket} ws WebSocket连接
 */
export function unsubscribeFromTI6843Posture(ws) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'unsubscribe'
    }))
  }
}

/**
 * WebSocket发送心跳
 * @param {WebSocket} ws WebSocket连接
 */
export function sendTI6843PostureHeartbeat(ws) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'ping'
    }))
  }
}

// ==================== 数据处理工具函数 ====================

/**
 * 验证位姿数据格式
 * @param {Object} data 位姿数据
 */
export function validateTI6843PostureData(data) {
  if (!data) return false
  
  // 检查必填字段
  if (!data.deviceId || !data.timestamp) return false
  
  // 检查点云数据格式（三维数组）
  if (data.pointclouds && !Array.isArray(data.pointclouds)) return false
  
  // 检查关键点数据格式（二维数组）
  if (data.keypoints && !Array.isArray(data.keypoints)) return false
  
  return true
}

/**
 * 计算数据质量评分
 * @param {Object} data 位姿数据
 */
export function calculateDataQuality(data) {
  if (!data) return 0
  
  let score = 0
  
  // 基础数据存在性检查
  if (data.deviceId && data.timestamp) score += 20
  
  // 点云数据质量（三维数组结构）
  if (data.pointclouds && Array.isArray(data.pointclouds)) {
    const pointCount = data.pointclouds.reduce((total, frame) => {
      if (Array.isArray(frame)) {
        return total + frame.reduce((frameTotal, cloud) => {
          return frameTotal + (Array.isArray(cloud) ? cloud.length : 0)
        }, 0)
      }
      return total
    }, 0)
    
    if (pointCount > 100) score += 40
    else if (pointCount > 50) score += 30
    else if (pointCount > 0) score += 20
  }
  
  // 关键点数据质量（二维数组结构）
  if (data.keypoints && Array.isArray(data.keypoints)) {
    const keypointCount = data.keypoints.length
    
    if (keypointCount >= 17) score += 40  // 标准人体关键点数量
    else if (keypointCount >= 10) score += 30
    else if (keypointCount > 0) score += 20
  }
  
  return Math.min(score, 100)
}

/**
 * 转换前端数据为API格式（发送数据时使用）
 * @param {Object} data 前端位姿数据
 */
export function transformDataForAPI(data) {
  if (!data) return null
  
  return {
    device_id: data.deviceId,
    pointclouds: data.pointclouds || [],
    keypoints: data.keypoints || [],
    timestamp: data.timestamp || new Date().toISOString()
  }
}

/**
 * 转换API数据为前端格式（接收数据时使用）
 * @param {Object} apiData API返回的位姿数据
 */
export function transformDataFromAPI(apiData) {
  if (!apiData) return null
  
  return {
    ...apiData,
    deviceId: apiData.device_id || apiData.deviceId,
    personId: apiData.person_id || apiData.personId
  }
}

// ==================== 历史数据查询接口 ====================

/**
 * 获取设备历史数据（时间范围，不分页）
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843PostureDeviceHistoricalByTimeRange(deviceId, start, end) {
  return request({
    url: `/api/ti6843/posture/data/historical/device/${deviceId}/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取设备历史数据（分页）
 * @param {Object} params 查询参数 (deviceId, start, end, page, size)
 */
export function getTI6843PostureDeviceHistoricalData(params = {}) {
  const defaultParams = {
    page: 0,
    size: 20
  }
  
  return request({
    url: '/api/ti6843/posture/data/historical',
    method: 'get',
    params: { ...defaultParams, ...params }
  })
}

/**
 * 获取设备历史统计
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843PostureDeviceHistoricalSummary(deviceId, start, end) {
  return request({
    url: '/api/ti6843/posture/data/historical/summary',
    method: 'get',
    params: { deviceId, start, end }
  })
}

/**
 * 获取人员历史数据（时间范围，不分页）
 * @param {string} personId 人员ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843PosturePersonHistoricalByTimeRange(personId, start, end) {
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/historical/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取人员历史数据（分页）
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数 (start, end, page, size)
 */
export function getTI6843PosturePersonHistoricalData(personId, params = {}) {
  const defaultParams = {
    page: 0,
    size: 20
  }
  
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/historical`,
    method: 'get',
    params: { ...defaultParams, ...params }
  })
}

/**
 * 获取人员历史统计
 * @param {string} personId 人员ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843PosturePersonHistoricalSummary(personId, start, end) {
  return request({
    url: `/api/ti6843/posture/data/person/${personId}/historical/summary`,
    method: 'get',
    params: { start, end }
  })
}

// ==================== 数据格式化工具函数 ====================

/**
 * 格式化位姿数据用于显示
 * @param {Object} data 原始位姿数据
 */
export function formatPostureDataForDisplay(data) {
  if (!data) return null
  
  const formatted = {
    ...data,
    hasValidPointClouds: data.pointclouds && Array.isArray(data.pointclouds) && data.pointclouds.length > 0,
    hasValidKeypoints: data.keypoints && Array.isArray(data.keypoints) && data.keypoints.length > 0,
    totalPointCloudCount: 0,
    keypointCount: 0,
    dataQuality: 0,
    dataType: '未知数据'
  }
  
  // 计算点云总数（三维数组）
  if (formatted.hasValidPointClouds) {
    formatted.totalPointCloudCount = data.pointclouds.reduce((total, frame) => {
      if (Array.isArray(frame)) {
        return total + frame.reduce((frameTotal, cloud) => {
          return frameTotal + (Array.isArray(cloud) ? cloud.length : 0)
        }, 0)
      }
      return total
    }, 0)
  }
  
  // 计算关键点数量（二维数组）
  if (formatted.hasValidKeypoints) {
    formatted.keypointCount = data.keypoints.length
  }
  
  // 计算数据质量
  formatted.dataQuality = calculateDataQuality(data)
  
  // 确定数据类型
  if (formatted.hasValidPointClouds && formatted.hasValidKeypoints) {
    formatted.dataType = '完整位姿数据'
  } else if (formatted.hasValidPointClouds) {
    formatted.dataType = '点云数据'
  } else if (formatted.hasValidKeypoints) {
    formatted.dataType = '关键点数据'
  } else {
    formatted.dataType = '基础数据'
  }
  
  return formatted
}
