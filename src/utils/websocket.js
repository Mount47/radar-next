// import * as StompJs from '@stomp/stompjs'

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

// 创建生命体征数据的WebSocket连接
export const vitalSignsWS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/r60abd1`
  console.log('创建生命体征WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建姿态数据的WebSocket连接
export const postureWS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/r60abd1`
  console.log('创建姿态WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建心电图数据的WebSocket连接
export const ecgWS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/r60abd1`
  console.log('创建心电图WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建R60ABD1设备数据的WebSocket连接
export const r60abd1WS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/r60abd1`
  console.log('创建R60ABD1设备WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建TI6843 Vital设备数据的WebSocket连接
export const ti6843VitalWS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/ti6843-vital`
  console.log('创建TI6843 Vital WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建TI6843 Posture设备数据的WebSocket连接
export const ti6843PostureWS = (deviceId) => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/ti6843-posture`
  console.log('创建TI6843 Posture WebSocket连接:', wsUrl)
  return new WebSocketClient(wsUrl)
}

// 创建跌倒警报WebSocket连接（原生WebSocket）
export const fallAlertWS = () => {
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  const wsUrl = `ws://${serverIp}:${serverPort}/ws/fall-alert`
  console.log('创建跌倒警报WebSocket连接:', wsUrl)
  
  const ws = new WebSocket(wsUrl)
  let heartbeatInterval = null

  const originalOnOpen = ws.onopen
  ws.onopen = function(event) {
    console.log('✅ 跌倒警报WebSocket连接成功')
    
    // 启动心跳
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    if (originalOnOpen) {
      originalOnOpen.call(ws, event)
    }
  }

  const originalOnClose = ws.onclose
  ws.onclose = function(event) {
    console.log('🔌 跌倒警报WebSocket连接关闭')
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    if (originalOnClose) {
      originalOnClose.call(ws, event)
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

export default WebSocketClient
