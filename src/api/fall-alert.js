import request from '@/utils/request'

// 跌倒警报API接口
// 基于 Implementation_Summary_Fall_Detection.md

// ==================== 基础API ====================

/**
 * 健康检查
 */
export function getFallAlertHealth() {
  return request({
    url: '/api/fall-alerts/health',
    method: 'get'
  })
}

/**
 * 获取所有活跃警报（NEW + PENDING）
 */
export function getActiveFallAlerts() {
  return request({
    url: '/api/fall-alerts/active',
    method: 'get'
  })
}

/**
 * 获取所有警报
 */
export function getAllFallAlerts() {
  return request({
    url: '/api/fall-alerts/',
    method: 'get'
  })
}

/**
 * 获取单个警报详情
 * @param {number} id 警报ID
 */
export function getFallAlertById(id) {
  return request({
    url: `/api/fall-alerts/${id}`,
    method: 'get'
  })
}

// ==================== 按设备/人员查询 ====================

/**
 * 获取设备的活跃警报
 * @param {string} deviceId 设备ID
 */
export function getDeviceActiveFallAlerts(deviceId) {
  return request({
    url: `/api/fall-alerts/device/${deviceId}/active`,
    method: 'get'
  })
}

/**
 * 获取人员的活跃警报
 * @param {string} personId 人员ID
 */
export function getPersonActiveFallAlerts(personId) {
  return request({
    url: `/api/fall-alerts/person/${personId}/active`,
    method: 'get'
  })
}

// ==================== 时间范围查询 ====================

/**
 * 根据时间范围查询警报
 * @param {string} start 开始时间（ISO格式）
 * @param {string} end 结束时间（ISO格式）
 */
export function getFallAlertsByTimeRange(start, end) {
  return request({
    url: '/api/fall-alerts/timerange',
    method: 'get',
    params: { start, end }
  })
}

// ==================== 警报操作（简化版 2025-10-30）====================

/**
 * 标记警报为待解决（PENDING）
 * @param {number} id 警报ID
 * @param {Object} data 处理数据
 * @param {string} data.handlerBy 处理人
 */
export function markFallAlertAsPending(id, data) {
  return request({
    url: `/api/fall-alerts/${id}/pending`,
    method: 'post',
    data
  })
}

/**
 * 标记警报为已解决（RESOLVED）
 * @param {number} id 警报ID
 * @param {Object} data 处理数据
 * @param {string} data.handlerBy 处理人
 * @param {string} data.notes 处理备注
 */
export function markFallAlertAsResolved(id, data) {
  return request({
    url: `/api/fall-alerts/${id}/resolved`,
    method: 'post',
    data
  })
}

/**
 * 标记为误报（FALSE_ALARM）
 * @param {number} id 警报ID
 * @param {Object} data 误报数据
 * @param {string} data.handlerBy 处理人
 * @param {string} data.notes 误报原因
 */
export function markFallAlertAsFalseAlarm(id, data) {
  return request({
    url: `/api/fall-alerts/${id}/false-alarm`,
    method: 'post',
    data
  })
}

// ==================== 统计 ====================

/**
 * 获取警报统计信息
 */
export function getFallAlertStatistics() {
  return request({
    url: '/api/fall-alerts/statistics',
    method: 'get'
  })
}

// ==================== WebSocket ====================

/**
 * 获取跌倒警报WebSocket连接URL
 */
export function getFallAlertWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const serverIp = process.env.VUE_APP_SERVER_IP || 'localhost'
  const serverPort = process.env.VUE_APP_SERVER_PORT || '8080'
  return `${protocol}//${serverIp}:${serverPort}/ws/fall-alert`
}

/**
 * 创建跌倒警报WebSocket连接
 * @param {Object} options 配置选项
 * @param {Function} options.onFallAlert 跌倒警报回调
 * @param {Function} options.onAlertStatusUpdate 警报状态更新回调
 * @param {Function} options.onOpen 连接成功回调
 * @param {Function} options.onError 错误回调
 * @param {Function} options.onClose 连接关闭回调
 */
export function createFallAlertWebSocket(options = {}) {
  const wsUrl = getFallAlertWebSocketUrl()
  console.log('🔗 创建跌倒警报WebSocket连接:', wsUrl)

  const ws = new WebSocket(wsUrl)
  let heartbeatInterval = null

  ws.onopen = function(event) {
    console.log('✅ 跌倒警报WebSocket连接成功')
    
    // 启动心跳
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 每30秒发送一次心跳

    if (options.onOpen) {
      options.onOpen(event)
    }
  }

  ws.onmessage = function(event) {
    try {
      const message = JSON.parse(event.data)
      console.log('📨 收到跌倒警报消息:', message)

      switch (message.type) {
        case 'welcome':
          console.log('✅ 服务器欢迎消息:', message.message)
          break
        
        case 'fall_alert':
          console.log('⚠️ 跌倒警报:', message.data)
          if (options.onFallAlert) {
            options.onFallAlert(message.data)
          }
          break
        
        case 'alert_status_update':
          console.log('🔄 警报状态更新:', message.data)
          if (options.onAlertStatusUpdate) {
            options.onAlertStatusUpdate(message.data)
          }
          break
        
        case 'pong':
          // 心跳响应
          break
        
        default:
          console.warn('未知消息类型:', message.type)
      }
    } catch (error) {
      console.error('❌ WebSocket消息解析失败:', error)
      if (options.onError) {
        options.onError(error)
      }
    }
  }

  ws.onerror = function(event) {
    console.error('❌ 跌倒警报WebSocket连接错误:', event)
    if (options.onError) {
      options.onError(event)
    }
  }

  ws.onclose = function(event) {
    console.log('🔌 跌倒警报WebSocket连接关闭')
    
    // 清除心跳
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    if (options.onClose) {
      options.onClose(event)
    }
  }

  // 添加关闭方法
  ws.closeConnection = function() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    ws.close()
  }

  return ws
}

// ==================== 工具函数 ====================

/**
 * 警报状态中文映射（简化版）
 */
export const ALERT_STATUS_MAP = {
  NEW: '新警报',
  PENDING: '待解决',
  RESOLVED: '已处理',
  FALSE_ALARM: '误报'
}

/**
 * 严重程度中文映射
 */
export const SEVERITY_MAP = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '紧急'
}

/**
 * 获取警报状态标签类型
 * @param {string} status 警报状态
 */
export function getAlertStatusType(status) {
  const typeMap = {
    NEW: 'danger',
    PENDING: 'warning',
    RESOLVED: 'success',
    FALSE_ALARM: 'info'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取严重程度标签类型
 * @param {string} severity 严重程度
 */
export function getSeverityType(severity) {
  const typeMap = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return typeMap[severity] || 'info'
}

/**
 * 计算警报持续时间（分钟）
 * @param {string} fallDetectedAt 跌倒检测时间
 * @param {string} resolvedAt 处理时间
 */
export function calculateAlertDuration(fallDetectedAt, resolvedAt) {
  if (!fallDetectedAt) return 0
  
  const startTime = new Date(fallDetectedAt)
  const endTime = resolvedAt ? new Date(resolvedAt) : new Date()
  const durationMs = endTime - startTime
  
  return Math.round(durationMs / 60000) // 转换为分钟
}

/**
 * 格式化警报时间显示
 * @param {string} timestamp 时间戳
 */
export function formatAlertTime(timestamp) {
  if (!timestamp) return '未知'
  
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    console.error('时间格式化错误:', e)
    return String(timestamp)
  }
}

