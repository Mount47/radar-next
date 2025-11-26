import request from '@/utils/request'
import { API_CONFIG } from '@/api/config'

// TI6843 Vital呼吸心跳传感器API接口
// 基于TI6843_Vital_Frontend_API_Reference.md v2.0 (2025-10-16)

// ==================== 设备管理接口 ====================

/**
 * 获取所有TI6843 Vital设备
 */
export function getTI6843VitalDevices() {
  return request({
    url: '/api/ti6843/vital/devices',
    method: 'get'
  })
}

/**
 * 获取单个TI6843 Vital设备信息
 * @param {string} deviceId 设备ID
 */
export function getTI6843VitalDevice(deviceId) {
  return request({
    url: `/api/ti6843/vital/devices/${deviceId}`,
    method: 'get'
  })
}

/**
 * 添加新TI6843 Vital设备
 * @param {Object} deviceData 设备信息
 */
export function addTI6843VitalDevice(deviceData) {
  return request({
    url: '/api/ti6843/vital/devices',
    method: 'post',
    data: deviceData
  })
}

/**
 * 更新TI6843 Vital设备信息
 * @param {string} deviceId 设备ID
 * @param {Object} deviceData 设备信息
 */
export function updateTI6843VitalDevice(deviceId, deviceData) {
  return request({
    url: `/api/ti6843/vital/devices/${deviceId}`,
    method: 'put',
    data: deviceData
  })
}

/**
 * 删除TI6843 Vital设备
 * @param {string} deviceId 设备ID
 */
export function deleteTI6843VitalDevice(deviceId) {
  return request({
    url: `/api/ti6843/vital/devices/${deviceId}`,
    method: 'delete'
  })
}

/**
 * 按状态查询TI6843 Vital设备
 * @param {string} status 设备状态 (active|inactive|maintenance)
 */
export function getTI6843VitalDevicesByStatus(status) {
  return request({
    url: `/api/ti6843/vital/devices/status/${status}`,
    method: 'get'
  })
}

/**
 * 按位置查询TI6843 Vital设备
 * @param {string} location 设备位置
 */
export function getTI6843VitalDevicesByLocation(location) {
  return request({
    url: `/api/ti6843/vital/devices/location/${location}`,
    method: 'get'
  })
}

// ==================== 数据接收接口 ====================

/**
 * 发送TI6843生命体征数据
 * @param {Object} data 生命体征数据
 */
export function sendTI6843VitalData(data) {
  return request({
    url: '/api/ti6843/vital/data/data',
    method: 'post',
    data
  })
}

// ==================== 实时数据查询接口 ====================

/**
 * 获取设备最新实时数据
 * @param {string} deviceId 设备ID
 */
export function getTI6843DeviceRealtimeData(deviceId) {
  return request({
    url: `/api/ti6843/vital/data/realtime/${deviceId}`,
    method: 'get'
  })
}

/**
 * 获取设备所有数据
 * @param {string} deviceId 设备ID
 */
export function getTI6843DeviceAllData(deviceId) {
  return request({
    url: `/api/ti6843/vital/data/data/device/${deviceId}`,
    method: 'get'
  })
}

/**
 * 按时间范围查询设备数据
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间 (ISO格式, 例如: 2025-10-01T00:00:00)
 * @param {string} end 结束时间 (ISO格式, 例如: 2025-10-16T23:59:59)
 */
export function getTI6843DeviceDataByTimeRange(deviceId, start, end) {
  return request({
    url: `/api/ti6843/vital/data/data/device/${deviceId}/timerange`,
    method: 'get',
    params: { start, end }
  })
}

// ==================== 人员维度数据查询接口 ====================

/**
 * 获取人员最新实时数据
 * @param {string} personId 人员ID
 */
export function getTI6843PersonRealtimeData(personId) {
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/realtime`,
    method: 'get'
  })
}

/**
 * 获取人员所有数据
 * @param {string} personId 人员ID
 */
export function getTI6843PersonAllData(personId) {
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/data`,
    method: 'get'
  })
}

/**
 * 按时间范围查询人员数据
 * @param {string} personId 人员ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843PersonDataByTimeRange(personId, start, end) {
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/data/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取人员历史数据（列表）
 * @param {string} personId 人员ID
 * @param {string} start 开始时间
 * @param {string} end 结束时间
 */
export function getTI6843PersonHistoricalByTimeRange(personId, start, end) {
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/historical/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取人员历史数据（分页）
 * @param {string} personId 人员ID
 * @param {Object} params 查询参数 (start, end, page, size)
 */
export function getTI6843PersonHistoricalData(personId, params = {}) {
  const defaultParams = {
    page: 0,
    size: 20
  }
  
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/historical`,
    method: 'get',
    params: { ...defaultParams, ...params }
  })
}

/**
 * 获取人员历史统计
 * @param {string} personId 人员ID
 * @param {string} start 开始时间
 * @param {string} end 结束时间
 */
export function getTI6843PersonHistoricalSummary(personId, start, end) {
  return request({
    url: `/api/ti6843/vital/data/person/${personId}/historical/summary`,
    method: 'get',
    params: { start, end }
  })
}

// ==================== 历史数据查询接口（设备维度）====================

/**
 * 获取设备历史数据（列表）
 * @param {string} deviceId 设备ID
 * @param {string} start 开始时间 (ISO格式)
 * @param {string} end 结束时间 (ISO格式)
 */
export function getTI6843DeviceHistoricalByTimeRange(deviceId, start, end) {
  return request({
    url: `/api/ti6843/vital/data/historical/device/${deviceId}/timerange`,
    method: 'get',
    params: { start, end }
  })
}

/**
 * 获取设备历史数据（分页）
 * @param {Object} params 查询参数 (deviceId, start, end, page, size, sortBy, sortDir)
 */
export function getTI6843DeviceHistoricalData(params = {}) {
  const defaultParams = {
    page: 0,
    size: 20,
    sortBy: 'timestamp',
    sortDir: 'desc'
  }
  
  return request({
    url: '/api/ti6843/vital/data/historical',
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
export function getTI6843DeviceHistoricalSummary(deviceId, start, end) {
  return request({
    url: '/api/ti6843/vital/data/historical/summary',
    method: 'get',
    params: { deviceId, start, end }
  })
}

// ==================== 人员设备绑定管理接口 ====================

/**
 * 获取设备人员绑定信息
 * @param {string} deviceId 设备ID
 */
export function getTI6843DevicePersonBinding(deviceId) {
  return request({
    url: `/api/ti6843/vital/device/${deviceId}/person`,
    method: 'get'
  })
}

/**
 * 绑定设备到人员
 * @param {string} deviceId 设备ID
 * @param {string} personId 人员ID
 * @param {string} mappingName 映射名称
 */
export function bindTI6843DeviceToPerson(deviceId, personId, mappingName) {
  return request({
    url: `/api/ti6843/vital/device/${deviceId}/bind`,
    method: 'post',
    data: { personId, mappingName }
  })
}

/**
 * 解绑TI6843设备
 * @param {string} deviceId 设备ID
 */
export function unbindTI6843Device(deviceId) {
  return request({
    url: `/api/ti6843/vital/device/${deviceId}/unbind`,
    method: 'delete'
  })
}

// ==================== 健康检查接口 ====================

/**
 * 检查TI6843 Vital服务状态
 */
export function checkTI6843VitalHealth() {
  return request({
    url: '/api/ti6843/vital/health',
    method: 'get'
  })
}

// ==================== WebSocket工具函数 ====================

/**
 * 获取TI6843 Vital WebSocket连接URL
 * @param {string} serverIp 服务器IP，默认localhost
 * @param {string} serverPort 服务器端口，默认8080
 */
export function getTI6843VitalWebSocketUrl(serverIp = 'localhost', serverPort = '8080') {
  return `ws://${serverIp}:${serverPort}/ws/ti6843-vital`
}

/**
 * 创建TI6843 Vital原生WebSocket连接
 * @param {Object} config WebSocket配置
 * @returns {WebSocket} WebSocket实例
 */
export function createTI6843VitalWebSocket(config = {}) {
  const serverIp = config.serverIp || import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = config.serverPort || import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = getTI6843VitalWebSocketUrl(serverIp, serverPort)
  
  console.log('🔗 创建TI6843 Vital WebSocket连接:', wsUrl)
  
  const ws = new WebSocket(wsUrl)
  
  // 连接打开事件
  ws.onopen = () => {
    console.log('✅ TI6843 Vital WebSocket连接已建立')
    if (config.onOpen) config.onOpen()
  }
  
  // 消息接收事件
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      console.log('📨 收到TI6843 Vital消息:', message.type)
      
      if (message.type === 'connection_established') {
        console.log('✅ 连接确认:', message.message)
        if (config.onConnectionEstablished) config.onConnectionEstablished(message)
      } else if (message.type === 'ti6843_vital_realtime') {
        console.log('📊 实时数据:', message.deviceId, message.data)
        if (config.onRealtimeData) config.onRealtimeData(message)
      }
      
      if (config.onMessage) config.onMessage(message)
    } catch (error) {
      console.error('❌ 解析WebSocket消息失败:', error)
      if (config.onError) config.onError(error)
    }
  }
  
  // 错误事件
  ws.onerror = (error) => {
    console.error('❌ TI6843 Vital WebSocket错误:', error)
    if (config.onError) config.onError(error)
  }
  
  // 连接关闭事件
  ws.onclose = () => {
    console.log('🔴 TI6843 Vital WebSocket连接已关闭')
    if (config.onClose) config.onClose()
  }
  
  return ws
}

// ==================== 数据格式化工具函数 ====================

/**
 * 格式化TI6843生命体征数据用于显示
 * @param {Object} data TI6843数据对象
 */
export function formatTI6843VitalDataForDisplay(data) {
  if (!data) return null
  
  return {
    deviceId: data.deviceId,
    personId: data.personId,
    personName: data.personName || '未知',
    time: data.time,
    breathRate: Number(data.breathRate || 0).toFixed(1),
    heartRate: Number(data.heartRate || 0).toFixed(1),
    status: data.status || '未知状态',
    timestamp: data.timestamp,
    createdAt: data.createdAt,
    isPersonBound: !!data.personId,
    // 状态解析
    statusIcon: getStatusIcon(data.status),
    statusType: getStatusType(data.status),
    // 数值状态评估
    breathStatus: evaluateBreathStatus(data.breathRate),
    heartStatus: evaluateHeartStatus(data.heartRate)
  }
}

/**
 * 从状态字符串中提取状态图标
 * @param {string} status 状态字符串
 */
export function getStatusIcon(status) {
  if (!status) return ''
  
  if (status.includes('✔')) return '✔'
  if (status.includes('⚠')) return '⚠'
  if (status.includes('❌')) return '❌'
  
  return ''
}

/**
 * 从状态字符串中获取状态类型
 * @param {string} status 状态字符串
 */
export function getStatusType(status) {
  if (!status) return 'info'
  
  if (status.includes('✔') || status.includes('正常')) return 'success'
  if (status.includes('⚠') || status.includes('过缓') || status.includes('过快')) return 'warning'
  if (status.includes('❌') || status.includes('异常')) return 'danger'
  
  return 'info'
}

/**
 * 评估呼吸状态
 * @param {number} breathRate 呼吸频率
 */
export function evaluateBreathStatus(breathRate) {
  const rate = Number(breathRate)
  if (rate < 12) return 'slow'
  if (rate > 20) return 'fast'
  return 'normal'
}

/**
 * 评估心率状态
 * @param {number} heartRate 心率
 */
export function evaluateHeartStatus(heartRate) {
  const rate = Number(heartRate)
  if (rate < 60) return 'slow'
  if (rate > 100) return 'fast'
  return 'normal'
}
