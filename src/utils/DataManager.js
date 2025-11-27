// import { EventEmitter } from 'events'
import { API_CONFIG } from '@/api/config'
import { getDeviceType } from '@/utils/deviceConfig'

// 简单的 EventEmitter 实现，替代 Node.js 的 events 模块
class SimpleEventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
    return this
  }

  off(event, listener) {
    if (!this.events[event]) return this
    this.events[event] = this.events[event].filter(l => l !== listener)
    return this
  }

  emit(event, ...args) {
    if (!this.events[event]) return false
    this.events[event].forEach(listener => {
      try {
        listener.apply(this, args)
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e)
      }
    })
    return true
  }

  removeListener(event, listener) {
    return this.off(event, listener)
  }
}

class DataManager extends SimpleEventEmitter {
  constructor() {
    super()
    this.ws = null // 原生WebSocket连接
    this.connected = false
    this.deviceId = null
    this.deviceType = null
    this.retryCount = 0
    this.maxRetries = 10
    this.retryDelay = 5000
    this.dataBuffer = [] // 数据缓冲区
    this.bufferTimeout = null // 缓冲区定时器
    this.lastEmitTime = 0 // 上次发送数据的时间
    this.dataEmitInterval = 500 // 数据发送间隔(毫秒)
    this.heartbeatInterval = null // 心跳定时器
    this.heartbeatTimeout = 30000 // 30秒心跳间隔
    this.deviceSubscriptions = new Map() // 设备订阅管理 {deviceId: Set of callback functions}
  }

  // 添加isConnected getter，保持向后兼容
  get isConnected() {
    return this.connected
  }

  // 为特定设备订阅数据更新
  subscribeToDevice(deviceId, callback) {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set())
    }
    this.deviceSubscriptions.get(deviceId).add(callback)
    console.log(`📝 设备 ${deviceId} 添加订阅，当前订阅数量: ${this.deviceSubscriptions.get(deviceId).size}`)
  }

  // 取消特定设备的数据订阅
  unsubscribeFromDevice(deviceId, callback) {
    if (this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.get(deviceId).delete(callback)
      if (this.deviceSubscriptions.get(deviceId).size === 0) {
        this.deviceSubscriptions.delete(deviceId)
      }
      console.log(`📝 设备 ${deviceId} 移除订阅`)
    }
  }

  start(deviceId) {
    console.log('启动数据管理器...')
    this.deviceId = deviceId || 'R60ABD1' // 默认设备ID为R60ABD1
    this.deviceType = getDeviceType(this.deviceId)
    this.initWebSocket()
  }

  initWebSocket() {
    console.log(`🔗 正在建立 ${this.deviceType} WebSocket连接...`)
    
    try {
      // 根据设备类型选择WebSocket地址
      let wsEndpoint = API_CONFIG.WS.ENDPOINTS.R60ABD1
      
      if (this.deviceType === 'TI6843') {
        // 检查是否为姿态监测设备
        if (this.deviceId && this.deviceId.toUpperCase().includes('POSTURE')) {
           wsEndpoint = API_CONFIG.WS.ENDPOINTS.TI6843_POSTURE
        } else {
           wsEndpoint = API_CONFIG.WS.ENDPOINTS.TI6843_VITAL
        }
      } else if (this.deviceType === 'R60ABD1') {
        wsEndpoint = API_CONFIG.WS.ENDPOINTS.R60ABD1
      }

      const wsUrl = API_CONFIG.WS.BASE_URL + wsEndpoint
      console.log(`📡 连接到 WebSocket: ${wsUrl}`)

      // 创建原生WebSocket连接
      this.ws = new WebSocket(wsUrl)

      // 连接打开事件
      this.ws.onopen = (event) => {
        console.log(`✅ ${this.deviceType} WebSocket连接已建立`, event)
        this.connected = true
        this.retryCount = 0
        
        // 启动心跳
        this.startHeartbeat()
        
        // 发送连接成功事件
        this.emit('connectionChange', true)
        
        console.log(`🎯 等待接收 ${this.deviceType} 实时数据...`)
      }

      // 接收消息事件
      this.ws.onmessage = (event) => {
        try {
          // console.log('📨 收到WebSocket消息:', event.data)
          const message = JSON.parse(event.data)
          
          // 处理不同类型的消息
          if (message.type === 'connection_established') {
             console.log('🟢 连接建立确认:', message.message)
          } else if (message.type === 'r60abd1_realtime' || message.type === 'ti6843_vital_realtime') {
             // console.log(`📊 接收到 ${this.deviceType} 实时数据:`, message.data)
             if (message.data) {
               this.handleData(message.data)
             }
          } else {
             // 尝试直接处理数据（兼容旧格式）
             if (message.deviceId || message.heartRate) {
                this.handleData(message)
             }
          }
        } catch (error) {
          console.error('❌ 解析WebSocket消息失败:', error, '原始消息:', event.data)
        }
      }

      // 错误处理
      this.ws.onerror = (error) => {
        console.error(`❌ ${this.deviceType} WebSocket错误:`, error)
        this.connected = false
        this.emit('connectionChange', false)
      }

      // 连接关闭事件
      this.ws.onclose = (event) => {
        console.log(`🔌 ${this.deviceType} WebSocket连接已关闭`, event.code, event.reason)
        this.connected = false
        this.stopHeartbeat()
        this.emit('connectionChange', false)
        
        // 如果不是主动关闭，则尝试重连
        if (!event.wasClean && this.retryCount < this.maxRetries) {
          console.log('🔄 准备重新连接...')
          setTimeout(() => this.reconnect(), this.retryDelay)
        }
      }
      
    } catch (error) {
      console.error('❌ 创建WebSocket连接失败:', error)
      this.reconnect()
    }
  }

  // 启动心跳
  startHeartbeat() {
    this.stopHeartbeat() // 确保没有重复的心跳
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('💓 发送WebSocket心跳')
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, this.heartbeatTimeout)
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  handleData(data) {
    try {
      // 将数据添加到缓冲区
      this.dataBuffer.push(data)

      // 检查是否应该触发数据更新
      const now = Date.now()
      const shouldEmitNow = now - this.lastEmitTime >= this.dataEmitInterval

      // 如果定时器未激活且当前时间未到达发送间隔，设置定时器
      if (!this.bufferTimeout && !shouldEmitNow) {
        this.bufferTimeout = setTimeout(() => {
          this.emitBufferedData()
        }, this.dataEmitInterval)
      } else if (shouldEmitNow) {
        // 如果达到发送间隔，立即发送数据
        this.emitBufferedData()
      }
    } catch (error) {
      console.error('处理消息失败:', error)
    }
  }

  emitBufferedData() {
    // 清除定时器
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
      this.bufferTimeout = null
    }

    // 只有在有数据时才发送
    if (this.dataBuffer.length > 0) {
      // 获取最新的数据
      const latestData = this.dataBuffer[this.dataBuffer.length - 1]

      // 处理格式化数据
      let processedData

      // R60ABD1数据格式固定，直接使用
      if (latestData && typeof latestData === 'object') {
        // 统一数据格式
        processedData = {
          // 基础信息
          deviceId: latestData.deviceId || this.deviceId,
          personId: latestData.personId,
          timestamp: latestData.timestamp || Date.now(),
          
          // 生命体征数据 (兼容 R60ABD1 和 TI6843)
          heartRate: latestData.heartRate,
          respiration: latestData.respiration || latestData.breathRate, // TI6843 uses breathRate
          bodyMovement: latestData.bodyMovement,
          
          // 波形数据 (如果有)
          heartRateWave: latestData.heartRateWave,
          respirationWave: latestData.respirationWave,
          
          // 状态数据
          presence: latestData.presence,
          motion: latestData.motion,
          sleep: latestData.sleep,
          presenceStatus: latestData.presenceStatus,
          motionStatus: latestData.motionStatus,
          sleepStatus: latestData.sleepStatus
        }
      } else {
        processedData = latestData
      }

      // 添加调试日志
      console.log('DataManager - 发送处理后的数据:', processedData)
      
      // 获取数据对应的设备ID
      const dataDeviceId = processedData.deviceId
      
      // 向特定设备的订阅者发送数据
      if (dataDeviceId && this.deviceSubscriptions.has(dataDeviceId)) {
        const subscribers = this.deviceSubscriptions.get(dataDeviceId)
        console.log(`📡 向设备 ${dataDeviceId} 的 ${subscribers.size} 个订阅者发送数据`)
        subscribers.forEach(callback => {
          try {
            callback(processedData)
          } catch (error) {
            console.error(`向设备 ${dataDeviceId} 的订阅者发送数据失败:`, error)
          }
        })
      } else {
        console.log(`📡 设备 ${dataDeviceId} 没有订阅者，跳过数据分发`)
      }
      
      // 保持向后兼容：继续发送全局事件（但组件应该迁移到设备特定订阅）
      this.emit('dataUpdate', processedData)

      // 记录发送时间
      this.lastEmitTime = Date.now()

      // 清空缓冲区
      this.dataBuffer = []
    }
  }

  reconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error('重试次数超过最大限制')
      return
    }

    console.log(`尝试重新连接... (${++this.retryCount}/${this.maxRetries})`)
    this.stop()

    // 计算延迟时间（指数退避策略）
    const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount - 1), 30000)
    console.log(`等待 ${delay}ms 后重试...`)

    setTimeout(() => {
      this.initWebSocket()
    }, delay)
  }

  stop() {
    console.log('🛑 停止数据管理器...')

    // 停止心跳
    this.stopHeartbeat()

    // 清除可能存在的缓冲区定时器
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
      this.bufferTimeout = null
    }

    // 清空数据缓冲区
    this.dataBuffer = []

    // 关闭WebSocket连接
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        console.log('🔌 主动关闭WebSocket连接')
        this.ws.close(1000, '正常关闭')
      }
      this.ws = null
    }
    
    this.connected = false
    console.log('✅ 数据管理器已停止')
  }

  // 发送命令到服务器（原生WebSocket版本）
  sendCommand(command) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket未连接，无法发送命令')
      return false
    }

    try {
      const message = {
        type: 'command',
        deviceId: this.deviceId,
        command: command,
        timestamp: Date.now()
      }
      
      console.log(`📤 发送命令到R60ABD1:`, message)
      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('❌ 发送命令失败:', error)
      return false
    }
  }
}

// 创建单例实例
const dataManager = new DataManager()
export default dataManager
