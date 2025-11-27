import { API_CONFIG } from '@/api/config'

class WebSocketClient {
  constructor(url) {
    this.url = url
    this.ws = null
    this.connected = false
    this.subscriptions = []
    this.connect()
  }

  connect() {
    try {
      console.log('正在连接WebSocket:', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = this.onConnectCallback.bind(this)
      this.ws.onerror = this.onErrorCallback.bind(this)
      this.ws.onclose = this.onCloseCallback.bind(this)
      this.ws.onmessage = this.onMessageCallback.bind(this)

    } catch (error) {
      console.error('创建WebSocket连接失败:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  onConnectCallback(event) {
    console.log('WebSocket连接已建立')
    this.connected = true
    if (this.onOpen) {
      this.onOpen(event)
    }
  }

  onErrorCallback(error) {
    console.error('WebSocket错误:', error)
    this.connected = false
    if (this.onError) {
      this.onError(error)
    }
  }

  onCloseCallback(event) {
    console.log('WebSocket连接已关闭')
    this.connected = false
    if (this.onClose) {
      this.onClose(event)
    }
  }

  onMessageCallback(event) {
    try {
      const data = JSON.parse(event.data)
      // 支持直接回调
      if (this.onMessage) {
        this.onMessage(data)
      }
      // 支持订阅回调
      this.subscriptions.forEach(callback => callback(data))
    } catch (error) {
      console.error('解析消息失败:', error)
    }
  }

  // 简单的订阅 (注意：原生WebSocket没有topic概念，这里只是添加回调)
  subscribe(topic, callback) {
    // 忽略 topic 参数，因为原生 WebSocket 通常是单通道
    this.subscriptions.push(callback)
    return {
      unsubscribe: () => {
        const index = this.subscriptions.indexOf(callback)
        if (index > -1) {
          this.subscriptions.splice(index, 1)
        }
      }
    }
  }

  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送消息')
      return false
    }
    this.ws.send(JSON.stringify(data))
    return true
  }

  close() {
    this.subscriptions = []
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
  }
}

// 辅助函数：构建完整 WebSocket URL
const getWsUrl = (endpoint) => {
  return API_CONFIG.WS.BASE_URL + endpoint
}

// 1. R60ABD1 呼吸心跳数据 (实时)
export const createR60ABD1WebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.R60ABD1)
  console.log('创建R60ABD1 WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 2. TI6843 呼吸心跳数据 (实时)
export const createTI6843VitalWebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.TI6843_VITAL)
  console.log('创建TI6843 Vital WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 3. TI6843 人体位姿数据 (实时)
export const createTI6843PostureWebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.TI6843_POSTURE)
  console.log('创建TI6843 Posture WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 4. 跌倒警报 (实时)
export const createFallAlertWebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.FALL_ALERT)
  console.log('创建跌倒警报WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 5. 生命体征异常警报 (实时)
export const createVitalsAlertWebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.VITALS_ALERT)
  console.log('创建生命体征异常警报WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 6. 设备状态通知
export const createDeviceStatusWebSocket = () => {
  const wsUrl = getWsUrl(API_CONFIG.WS.ENDPOINTS.DEVICE_STATUS)
  console.log('创建设备状态通知WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

export default WebSocketClient
