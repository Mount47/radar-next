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
      // 确保 API_CONFIG 和 WS 配置存在
      if (!API_CONFIG || !API_CONFIG.WS || !API_CONFIG.WS.ENDPOINTS) {
        console.error('❌ API配置未正确加载，使用默认配置')
      }

      const endpoints = API_CONFIG?.WS?.ENDPOINTS || {
        R60ABD1: '/ws/r60abd1',
        TI6843_VITAL: '/ws/ti6843-vital',
        TI6843_POSTURE: '/ws/ti6843-posture'
      }

      // 根据设备类型选择WebSocket地址
      let wsEndpoint = endpoints.R60ABD1
      
      if (this.deviceType === 'TI6843') {
        // 检查是否为姿态监测设备
        if (this.deviceId && this.deviceId.toUpperCase().includes('POSTURE')) {
           wsEndpoint = endpoints.TI6843_POSTURE
        } else {
           wsEndpoint = endpoints.TI6843_VITAL
        }
      } else if (this.deviceType === 'R60ABD1') {
        wsEndpoint = endpoints.R60ABD1
      }

      if (!wsEndpoint) {
        console.error(`❌ 无法为设备类型 ${this.deviceType} 找到对应的 WebSocket 端点，使用默认值`)
        wsEndpoint = '/ws/r60abd1'
      }

      const baseUrl = API_CONFIG?.WS?.BASE_URL || 'ws://localhost:8080'
      const wsUrl = baseUrl + wsEndpoint
      console.log(`📡 准备连接到 WebSocket: ${wsUrl} (设备类型: ${this.deviceType}, ID: ${this.deviceId})`)

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
             console.log(`📊 接收到 ${message.type} 实时数据, 设备ID: ${message.data?.deviceId}`)
             if (message.data) {
               this.handleData(message.data)
             }
          } else {
             console.log('📨 接收到其他类型消息:', message.type || '未知类型')
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
          // TI6843 使用 breathRate, R60ABD1 使用 respiration
          heartRate: latestData.heartRate,
          respiration: latestData.respiration || latestData.breathRate, // 统一映射为 respiration
          breathRate: latestData.breathRate || latestData.respiration, // 同时保留 breathRate 字段
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
          sleepStatus: latestData.sleepStatus,
          status: latestData.status
        }
      } else {
        processedData = latestData
      }

      // 添加调试日志
      console.log('DataManager - 发送处理后的数据:', processedData)
      
      // 获取数据对应的设备ID
      const dataDeviceId = processedData.deviceId
      
      // 向特定设备的订阅者发送数据（支持智能模糊匹配）
      let foundSubscribers = false
      if (dataDeviceId) {
        // 遍历所有订阅，查找匹配的设备ID
        for (const [subscribedDeviceId, subscribers] of this.deviceSubscriptions.entries()) {
          let isMatch = false
          
          // 1. 完全匹配：精确相等
          if (dataDeviceId === subscribedDeviceId) {
            isMatch = true
          }
          // 2. 智能前缀匹配：订阅ID是数据ID的前缀
          //    例如：订阅 R60ABD1，接收 R60ABD1_COM3
          //    例如：订阅 TI6843_VITAL，接收 TI6843_VITAL_01
          //    但：订阅 TI6843 不应匹配 TI6843_VITAL 或 TI6843_POSTURE（需要明确设备类型）
          else if (dataDeviceId.startsWith(subscribedDeviceId + '_')) {
            // 对于TI6843设备，确保不会混淆 VITAL 和 POSTURE
            const isTI6843Base = subscribedDeviceId.toUpperCase() === 'TI6843'
            const dataHasSubtype = dataDeviceId.toUpperCase().includes('_VITAL') || 
                                   dataDeviceId.toUpperCase().includes('_POSTURE')
            
            // 如果订阅的是基础TI6843但数据有子类型，不匹配（需要明确订阅子类型）
            if (isTI6843Base && dataHasSubtype) {
              isMatch = false
            } else {
              isMatch = true
            }
          }
          // 3. 反向匹配：数据ID是订阅ID的前缀（用于处理后端简化ID的情况）
          //    例如：订阅 R60ABD1_COM3，接收 R60ABD1
          else if (subscribedDeviceId.startsWith(dataDeviceId + '_')) {
            // 同样对TI6843进行特殊处理
            const isDataTI6843Base = dataDeviceId.toUpperCase() === 'TI6843'
            const subscribedHasSubtype = subscribedDeviceId.toUpperCase().includes('_VITAL') || 
                                         subscribedDeviceId.toUpperCase().includes('_POSTURE')
            
            if (isDataTI6843Base && subscribedHasSubtype) {
              isMatch = false
            } else {
              isMatch = true
            }
          }
          
          if (isMatch && subscribers.size > 0) {
            foundSubscribers = true
            console.log(`📡 向设备 ${subscribedDeviceId} 的 ${subscribers.size} 个订阅者发送数据 (数据来自: ${dataDeviceId})`)
            subscribers.forEach(callback => {
              try {
                callback(processedData)
              } catch (error) {
                console.error(`向设备 ${subscribedDeviceId} 的订阅者发送数据失败:`, error)
              }
            })
          }
        }
        
        if (!foundSubscribers) {
          console.warn(`📡 设备 ${dataDeviceId} 没有匹配的订阅者，跳过数据分发. 当前订阅: [${Array.from(this.deviceSubscriptions.keys()).join(', ')}]`)
        }
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
