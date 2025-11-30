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
    this.connections = new Map() // 不同设备类型的WebSocket连接
    this.connected = false
    this.deviceId = null
    this.retryCount = 0
    this.maxRetries = 10
    this.retryDelay = 5000
    this.dataBuffer = [] // 数据缓冲区
    this.bufferTimeout = null // 缓冲区定时器
    this.lastEmitTime = 0 // 上次发送数据的时间
    this.dataEmitInterval = 500 // 数据发送间隔(毫秒)
    this.heartbeatTimeout = 30000 // 30秒心跳间隔
    this.defaultConnectionKeys = ['R60ABD1', 'TI6843_VITAL'] // 默认同时监听R60和TI6843呼吸心跳
    this.deviceSubscriptions = new Map() // 设备订阅管理 {deviceId: Set of callback functions}
    this.deviceDataCache = new Map() // 每个设备的最新数据缓存 {deviceId: latestData}
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
    
    // 如果有缓存数据，立即发送给新订阅者
    if (this.deviceDataCache.has(deviceId)) {
      const cachedData = this.deviceDataCache.get(deviceId)
      console.log(`📦 向新订阅者发送设备 ${deviceId} 的缓存数据`)
      try {
        callback(cachedData)
      } catch (error) {
        console.error(`❌ 发送缓存数据失败:`, error)
      }
    }
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

  // 获取设备的缓存数据
  getDeviceData(deviceId) {
    return this.deviceDataCache.get(deviceId) || null
  }

  // 获取所有设备的缓存数据
  getAllDeviceData() {
    return Array.from(this.deviceDataCache.entries()).map(([deviceId, data]) => ({
      deviceId,
      data,
      timestamp: data.timestamp,
      lastUpdate: new Date(data.timestamp).toLocaleString()
    }))
  }

  // 清除设备缓存数据
  clearDeviceCache(deviceId) {
    if (deviceId) {
      this.deviceDataCache.delete(deviceId)
      console.log(`🗑️ 清除设备 ${deviceId} 的缓存数据`)
    } else {
      this.deviceDataCache.clear()
      console.log(`🗑️ 清除所有设备的缓存数据`)
    }
  }

  start(deviceId) {
    console.log('==================================================')
    console.log('🚀 启动DataManager...')
    if (!deviceId) {
      console.warn('⚠️ 未指定设备ID，将采用默认连接策略（R60ABD1 + TI6843_VITAL）')
    } else {
      this.deviceId = deviceId
      console.log('📋 传入设备ID:', this.deviceId)
      console.log('✅ 识别设备类型:', getDeviceType(this.deviceId))
    }
    console.log('==================================================')
    
    this.initWebSocket()
  }

  initWebSocket() {
    const requiredConnections = this.getRequiredConnectionKeys()
    console.log('==================================================')
    console.log('?? ????WebSocket??:')
    console.log('   ->', Array.from(requiredConnections).join(', ') || '?')
    console.log('==================================================')
    requiredConnections.forEach(key => this.connectToEndpoint(key))
  }

  getRequiredConnectionKeys() {
    const keys = new Set(this.defaultConnectionKeys)
    if (this.deviceId) {
      const type = getDeviceType(this.deviceId)
      if (type === 'TI6843' && this.deviceId.toUpperCase().includes('POSTURE')) {
        keys.add('TI6843_POSTURE')
      }
    }
    return keys
  }

  getEndpointConfig(connectionKey) {
    const endpoints = API_CONFIG?.WS?.ENDPOINTS || {
      R60ABD1: '/ws/r60abd1',
      TI6843_VITAL: '/ws/ti6843-vital',
      TI6843_POSTURE: '/ws/ti6843-posture'
    }
    const labels = {
      R60ABD1: 'R60ABD1 ????',
      TI6843_VITAL: 'TI6843 ????',
      TI6843_POSTURE: 'TI6843 ??'
    }
    const endpoint = endpoints[connectionKey]
    if (!endpoint) return null
    return {
      endpoint,
      label: labels[connectionKey] || connectionKey
    }
  }

  connectToEndpoint(connectionKey) {
    const config = this.getEndpointConfig(connectionKey)
    if (!config) {
      console.warn(`?? ??? ${connectionKey} ?WebSocket????`)
      return
    }

    const existing = this.connections.get(connectionKey)
    if (existing?.ws && (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING)) {
      console.log(`?? [${connectionKey}] ?????????????`)
      return
    }

    const baseUrl = API_CONFIG?.WS?.BASE_URL || 'ws://localhost:8080'
    const wsUrl = baseUrl + config.endpoint
    console.log(`?? [${connectionKey}] ??WebSocket?? -> ${wsUrl}`)

    const connectionState = existing || {}
    connectionState.key = connectionKey
    connectionState.label = config.label
    connectionState.endpoint = config.endpoint
    connectionState.retryCount = connectionState.retryCount || 0
    connectionState.manualClose = false
    connectionState.connected = false
    this.clearReconnectTimer(connectionKey)

    const ws = new WebSocket(wsUrl)
    connectionState.ws = ws
    this.connections.set(connectionKey, connectionState)

    ws.onopen = (event) => {
      console.log(`? [${connectionKey}] WebSocket?????`, event)
      connectionState.connected = true
      connectionState.retryCount = 0
      this.updateRetryCount()
      this.startHeartbeatForConnection(connectionKey)
      this.updateGlobalConnectionStatus()
      console.log(`?? [${connectionKey}] ????????...`)
    }

    ws.onmessage = (event) => {
      this.handleIncomingMessage(connectionKey, event.data)
    }

    ws.onerror = (error) => {
      console.error(`? [${connectionKey}] WebSocket??:`, error)
      connectionState.connected = false
      this.updateGlobalConnectionStatus()
    }

    ws.onclose = (event) => {
      console.log(`?? [${connectionKey}] WebSocket?????`, event.code, event.reason)
      connectionState.connected = false
      this.stopHeartbeatForConnection(connectionKey)
      this.updateGlobalConnectionStatus()

      if (!connectionState.manualClose) {
        this.scheduleReconnect(connectionKey)
      }
    }
  }

  handleIncomingMessage(connectionKey, rawData) {
    try {
      const message = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
      if (message.type === 'connection_established') {
        console.log(`?? [${connectionKey}] ??????:`, message.message)
        return
      }

      if (message.type === 'r60abd1_realtime' || message.type === 'ti6843_vital_realtime') {
        console.log('==================================================')
        console.log(`?? [${connectionKey}] ??? ${message.type} ????`)
        console.log(`   ??ID: ${message.deviceId || message.data?.deviceId || '??'}`)
        console.log(`   ??ID: ${message.personId || message.data?.personId || '???'}`)
        console.log(`   ??: ${message.data?.heartRate || 'N/A'}`)
        console.log(`   ??: ${message.data?.breathRate || message.data?.respiration || 'N/A'}`)
        console.log('==================================================')
        if (message.data) {
          const dataWithTopLevelFields = {
            ...message.data,
            deviceId: message.data.deviceId || message.deviceId,
            personId: message.data.personId || message.personId,
            timestamp: message.data.timestamp || message.timestamp
          }
          this.handleData(dataWithTopLevelFields)
        } else {
          console.warn('?? ????? data ??')
        }
        return
      }

      if (message.deviceId || message.heartRate) {
        console.log(`?? [${connectionKey}] ??????????`)
        this.handleData(message)
        return
      }

      console.log(`?? [${connectionKey}] ??????????:`, message.type || '????', message)
    } catch (error) {
      console.error(`? [${connectionKey}] ??????:`, error)
      console.error('????:', rawData)
    }
  }

  startHeartbeatForConnection(connectionKey) {
    this.stopHeartbeatForConnection(connectionKey)
    const connection = this.connections.get(connectionKey)
    if (!connection) return

    connection.heartbeatInterval = setInterval(() => {
      if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ type: 'ping', source: connectionKey, timestamp: Date.now() }))
      }
    }, this.heartbeatTimeout)
  }

  stopHeartbeatForConnection(connectionKey) {
    const connection = this.connections.get(connectionKey)
    if (connection?.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval)
      connection.heartbeatInterval = null
    }
  }

  scheduleReconnect(connectionKey) {
    const connection = this.connections.get(connectionKey)
    if (!connection || connection.manualClose) {
      return
    }

    if (connection.retryCount >= this.maxRetries) {
      console.error(`? [${connectionKey}] ????????(${this.maxRetries})`)
      return
    }

    connection.retryCount += 1
    this.updateRetryCount()
    const delay = Math.min(this.retryDelay * Math.pow(2, connection.retryCount - 1), 30000)
    console.log(`? [${connectionKey}] ?? ${delay}ms ????? (${connection.retryCount}/${this.maxRetries})`)

    connection.reconnectTimer = setTimeout(() => {
      connection.reconnectTimer = null
      this.connectToEndpoint(connectionKey)
    }, delay)
  }

  clearReconnectTimer(connectionKey) {
    const connection = this.connections.get(connectionKey)
    if (connection?.reconnectTimer) {
      clearTimeout(connection.reconnectTimer)
      connection.reconnectTimer = null
    }
  }

  updateRetryCount() {
    const counts = Array.from(this.connections.values()).map(conn => conn.retryCount || 0)
    this.retryCount = counts.length > 0 ? Math.max(...counts) : 0
  }

  updateGlobalConnectionStatus() {
    const anyConnected = Array.from(this.connections.values()).some(conn => conn.connected)
    if (anyConnected !== this.connected) {
      this.connected = anyConnected
      this.emit('connectionChange', this.connected)
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
      console.log('========================================')
      console.log('DataManager - 发送处理后的数据')
      console.log('设备ID:', processedData.deviceId)
      console.log('心率:', processedData.heartRate)
      console.log('呼吸(respiration):', processedData.respiration)
      console.log('呼吸(breathRate):', processedData.breathRate)
      console.log('完整数据:', processedData)
      console.log('========================================')
      
      // 获取数据对应的设备ID
      const dataDeviceId = processedData.deviceId
      
      // 缓存设备数据
      if (dataDeviceId) {
        this.deviceDataCache.set(dataDeviceId, processedData)
        console.log(`💾 缓存设备 ${dataDeviceId} 的数据`)
      }
      
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
          // 4. 特殊处理：TI6843_VITAL 类型的额外匹配规则
          //    订阅 TI6843_VITAL_001 应该匹配 TI6843_VITAL
          else if (subscribedDeviceId.toUpperCase().includes('TI6843_VITAL') && 
                   dataDeviceId.toUpperCase().includes('TI6843_VITAL')) {
            isMatch = true
          }
          // 5. 特殊处理：R60ABD1 类型的额外匹配规则
          else if (subscribedDeviceId.toUpperCase().includes('R60ABD1') && 
                   dataDeviceId.toUpperCase().includes('R60ABD1')) {
            isMatch = true
          }
          
          if (isMatch && subscribers.size > 0) {
            foundSubscribers = true
            console.log(`📡 ✅ 匹配成功！向设备 ${subscribedDeviceId} 的 ${subscribers.size} 个订阅者发送数据`)
            console.log(`   数据来源: ${dataDeviceId}`)
            console.log(`   心率: ${processedData.heartRate}, 呼吸: ${processedData.respiration}`)
            subscribers.forEach(callback => {
              try {
                callback(processedData)
              } catch (error) {
                console.error(`❌ 向设备 ${subscribedDeviceId} 的订阅者发送数据失败:`, error)
              }
            })
          } else if (isMatch && subscribers.size === 0) {
            console.warn(`⚠️ 设备 ${subscribedDeviceId} 匹配但没有订阅者`)
          }
        }
        
        if (!foundSubscribers) {
          console.error(`❌ 设备 ${dataDeviceId} 没有匹配的订阅者！`)
          console.error(`   数据设备ID: ${dataDeviceId}`)
          console.error(`   当前订阅列表: [${Array.from(this.deviceSubscriptions.keys()).join(', ')}]`)
          console.error(`   `)
          console.error(`   💡 可能的原因：`)
          console.error(`   1. URL参数中的deviceId与后端发送的deviceId不匹配`)
          console.error(`   2. 订阅使用了人员ID而不是设备ID`)
          console.error(`   3. 设备ID格式不一致（如 RD002 vs R60ABD1_COM2）`)
          console.error(`   `)
          console.error(`   💡 建议：页面会自动更新订阅，请等待或刷新页面`)
        }
      } else {
        console.warn(`⚠️ 数据中没有设备ID，无法分发到订阅者`)
      }
      
      // 保持向后兼容：继续发送全局事件（但组件应该迁移到设备特定订阅）
      this.emit('dataUpdate', processedData)

      // 记录发送时间
      this.lastEmitTime = Date.now()

      // 清空缓冲区
      this.dataBuffer = []
    }
  }

  stop() {
    console.log('?? ???????...')

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
      this.bufferTimeout = null
    }

    this.dataBuffer = []

    for (const [connectionKey, connection] of this.connections.entries()) {
      connection.manualClose = true
      this.clearReconnectTimer(connectionKey)
      this.stopHeartbeatForConnection(connectionKey)

      if (connection.ws) {
        console.log(`?? ???? [${connectionKey}] WebSocket??`)
        try {
          connection.ws.close(1000, '????')
        } catch (error) {
          console.error(`? ?? [${connectionKey}] ????:`, error)
        }
      }
    }

    this.connections.clear()
    this.connected = false
    this.retryCount = 0
    this.emit('connectionChange', false)
    console.log('? ????????')
  }


  // ???????????WebSocket???
  sendCommand(command, targetConnectionKey = 'R60ABD1') {
    const connection = this.connections.get(targetConnectionKey)
    if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
      console.error(`? ${targetConnectionKey} WebSocket??????????`)
      return false
    }

    try {
      const message = {
        type: 'command',
        deviceId: this.deviceId,
        command,
        timestamp: Date.now()
      }

      console.log(`?? ????? ${targetConnectionKey}:`, message)
      connection.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error(`? ? ${targetConnectionKey} ??????:`, error)
      return false
    }
  }

}

// 创建单例实例
const dataManager = new DataManager()
export default dataManager
