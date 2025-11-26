import request from '@/utils/request'

// 生命体征异常警报 API（呼吸/心跳异常）
// 参考后端约定:
// WebSocket: ws://<host>/ws/vitals-alert
// REST:
// - GET /api/vitals-alerts
// - GET /api/vitals-alerts/{id}
// - GET /api/vitals-alerts/device/{deviceId}
// - GET /api/vitals-alerts/person/{personId}
// - GET /api/vitals-alerts/timerange?start=...&end=...

// ==================== 基础查询 ====================

export function getVitalsAlerts(params = {}) {
  return request({
    url: '/api/vitals-alerts',
    method: 'get',
    params
  })
}

export function getVitalsAlertById(id) {
  return request({
    url: `/api/vitals-alerts/${id}`,
    method: 'get'
  })
}

export function getDeviceVitalsAlerts(deviceId, params = {}) {
  return request({
    url: `/api/vitals-alerts/device/${deviceId}`,
    method: 'get',
    params
  })
}

export function getPersonVitalsAlerts(personId, params = {}) {
  return request({
    url: `/api/vitals-alerts/person/${personId}`,
    method: 'get',
    params
  })
}

export function getVitalsAlertsByTimeRange(start, end) {
  return request({
    url: '/api/vitals-alerts/timerange',
    method: 'get',
    params: { start, end }
  })
}

// ==================== WebSocket ====================

export function getVitalsAlertWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const serverIp = process.env.VUE_APP_SERVER_IP || 'localhost'
  const serverPort = process.env.VUE_APP_SERVER_PORT || '8080'
  return `${protocol}//${serverIp}:${serverPort}/ws/vitals-alert`
}

/**
 * 创建生命体征异常警报 WebSocket 连接
 * @param {Object} options 回调配置
 * @param {Function} options.onOpen 连接成功
 * @param {Function} options.onVitalsAlert 收到 vitals_alert 推送
 * @param {Function} options.onError 错误
 * @param {Function} options.onClose 关闭
 */
export function createVitalsAlertWebSocket(options = {}) {
  const wsUrl = getVitalsAlertWebSocketUrl()
  const ws = new WebSocket(wsUrl)
  let heartbeatInterval = null

  ws.onopen = function(event) {
    // 心跳
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    if (options.onOpen) options.onOpen(event)
  }

  ws.onmessage = function(event) {
    try {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'welcome':
          // ignore
          break
        case 'vitals_alert':
          if (options.onVitalsAlert) options.onVitalsAlert(message.data)
          break
        case 'pong':
          break
        case 'error':
          if (options.onError) options.onError(message)
          break
        default:
          // no-op
          break
      }
    } catch (e) {
      if (options.onError) options.onError(e)
    }
  }

  ws.onerror = function(err) {
    if (options.onError) options.onError(err)
  }

  ws.onclose = function(evt) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    if (options.onClose) options.onClose(evt)
  }

  ws.closeConnection = function() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    ws.close()
  }

  return ws
}

// ==================== 显示辅助 ====================

export const VITAL_ALERT_TYPE_MAP = {
  HEART_TACHY: '心动过速',
  HEART_BRADY: '心动过缓',
  HEART_FLATLINE: '心搏停止',
  BREATH_TACHY: '呼吸过快',
  BREATH_BRADY: '呼吸过缓',
  APNEA: '呼吸暂停'
}

export const VITAL_SEVERITY_MAP = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '紧急'
}

export function getSeverityTagType(severity) {
  const map = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' }
  return map[severity] || 'info'
}

export function formatDetectedTime(timestamp) {
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
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return String(timestamp)
  }
}




