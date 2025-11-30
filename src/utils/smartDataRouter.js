/**
 * 智能数据路由器
 * 根据时间范围和数据类型自动选择最优的数据源
 */

import WebSocketClient from '@/utils/websocket'
// import { getHistoryData, getHistoryStats } from '@/api/history'
import { getAllVitalSigns, getLatestVitalSigns } from '@/api/sensors/vital'
import { getAllPose, getLatestPose } from '@/api/sensors/posture'
// import { getAllECGData, getLatestECGData } from '@/api/ecg'

class SmartDataRouter {
  constructor() {
    this.wsConnections = new Map()
    this.dataCache = new Map()
    this.routingRules = this.initRoutingRules()
  }

  /**
   * 初始化路由规则
   */
  initRoutingRules() {
    return {
      // 实时数据路由规则
      realtime: {
        vital: {
          source: 'websocket',
          endpoint: 'vital',
          fallback: 'api'
        },
        posture: {
          source: 'websocket',
          endpoint: 'posture',
          fallback: 'api'
        },
        ecg: {
          source: 'websocket',
          endpoint: 'ecg',
          fallback: 'api'
        }
      },
      
      // 历史数据路由规则
      history: {
        // 最近24小时：使用高频缓存
        recent: {
          timeSpan: 24 * 60 * 60 * 1000, // 24小时
          source: 'cache',
          fallback: 'database'
        },
        
        // 最近7天：使用历史数据库
        short: {
          timeSpan: 7 * 24 * 60 * 60 * 1000, // 7天
          source: 'database',
          fallback: 'archive'
        },
        
        // 超过7天：使用归档数据
        long: {
          timeSpan: Infinity,
          source: 'archive',
          fallback: 'database'
        }
      }
    }
  }

  /**
   * 智能路由数据请求
   * @param {Object} options 请求选项
   * @param {string} options.mode 模式：'realtime' 或 'history'
   * @param {string} options.dataType 数据类型：'vital', 'posture', 'ecg'
   * @param {string} options.deviceId 设备ID
   * @param {Date} options.startTime 开始时间（历史模式）
   * @param {Date} options.endTime 结束时间（历史模式）
   * @param {Function} options.onData 数据回调函数
   * @param {Function} options.onError 错误回调函数
   */
  async routeDataRequest(options) {
    const {
      mode,
      dataType,
      deviceId,
      startTime,
      endTime,
      onData,
      onError
    } = options

    try {
      if (mode === 'realtime') {
        return await this.handleRealtimeRequest({
          dataType,
          deviceId,
          onData,
          onError
        })
      } else {
        return await this.handleHistoryRequest({
          dataType,
          deviceId,
          startTime,
          endTime,
          onData,
          onError
        })
      }
    } catch (error) {
      console.error('数据路由失败:', error)
      if (onError) {
        onError(error)
      }
      throw error
    }
  }

  /**
   * 处理实时数据请求
   */
  async handleRealtimeRequest({ dataType, deviceId, onData, onError }) {
    const rule = this.routingRules.realtime[dataType]
    if (!rule) {
      throw new Error(`不支持的数据类型: ${dataType}`)
    }

    // 尝试WebSocket连接
    if (rule.source === 'websocket') {
      try {
        const wsConnection = await this.establishWebSocketConnection(dataType, deviceId)
        if (wsConnection) {
          wsConnection.onData = onData
          wsConnection.onError = onError
          return {
            source: 'websocket',
            connection: wsConnection
          }
        }
      } catch (error) {
        console.warn('WebSocket连接失败，尝试备用方案:', error)
      }
    }

    // 备用方案：使用API轮询
    return await this.establishApiPolling(dataType, deviceId, onData, onError)
  }

  /**
   * 处理历史数据请求
   */
  async handleHistoryRequest({ dataType, deviceId, startTime, endTime, onData, onError }) {
    const timeSpan = endTime.getTime() - startTime.getTime()
    const rule = this.selectHistoryRule(timeSpan)

    console.log(`历史数据路由: 时间跨度=${timeSpan}ms, 选择规则=${rule.source}`)

    try {
      let data
      switch (rule.source) {
        case 'cache':
          data = await this.fetchFromCache(dataType, deviceId, startTime, endTime)
          break
        case 'database':
          data = await this.fetchFromDatabase(dataType, deviceId, startTime, endTime)
          break
        case 'archive':
          data = await this.fetchFromArchive(dataType, deviceId, startTime, endTime)
          break
        default:
          throw new Error(`未知的数据源: ${rule.source}`)
      }

      if (onData) {
        onData(data)
      }

      return {
        source: rule.source,
        data: data
      }
    } catch (error) {
      console.warn(`从${rule.source}获取数据失败，尝试备用方案:`, error)
      
      // 尝试备用方案
      if (rule.fallback) {
        return await this.handleHistoryRequest({
          dataType,
          deviceId,
          startTime,
          endTime,
          onData,
          onError
        })
      }
      
      throw error
    }
  }

  /**
   * 选择历史数据规则
   */
  selectHistoryRule(timeSpan) {
    const rules = this.routingRules.history
    
    if (timeSpan <= rules.recent.timeSpan) {
      return rules.recent
    } else if (timeSpan <= rules.short.timeSpan) {
      return rules.short
    } else {
      return rules.long
    }
  }

  /**
   * 建立WebSocket连接
   */
  async establishWebSocketConnection(dataType, deviceId) {
    const connectionKey = `${dataType}_${deviceId}`

    // 检查是否已有连接
    if (this.wsConnections.has(connectionKey)) {
      const existingConnection = this.wsConnections.get(connectionKey)
      if (existingConnection.connected) {
        return existingConnection
      }
    }

    // 创建WebSocket URL
    const wsUrl = `ws://localhost:8080/radar-websocket?deviceId=${deviceId}&clientType=frontend&dataType=${dataType}`

    // 创建新连接
    const wsClient = new WebSocketClient(wsUrl)

    // 包装连接对象
    const connection = {
      client: wsClient,
      connected: false,
      dataType,
      deviceId,
      onData: null,
      onError: null
    }

    // 设置连接事件
    wsClient.onOpen = () => {
      connection.connected = true
      console.log(`WebSocket连接成功: ${connectionKey}`)
    }

    wsClient.onError = (error) => {
      connection.connected = false
      console.error(`WebSocket连接错误: ${connectionKey}`, error)
      if (connection.onError) {
        connection.onError(error)
      }
    }

    wsClient.onMessage = (data) => {
      if (connection.onData) {
        connection.onData(data)
      }
    }

    this.wsConnections.set(connectionKey, connection)
    return connection
  }

  /**
   * 建立API轮询
   */
  async establishApiPolling(dataType, deviceId, onData, onError) {
    const pollingInterval = 1000 // 1秒轮询一次
    
    const poll = async () => {
      try {
        let data
        switch (dataType) {
          case 'vital':
            data = await getLatestVitalSigns()
            break
          case 'posture':
            data = await getLatestPose()
            break
          case 'ecg':
            data = await getLatestECGData()
            break
          default:
            throw new Error(`不支持的API数据类型: ${dataType}`)
        }

        if (onData) {
          onData(data.data)
        }
      } catch (error) {
        console.error('API轮询错误:', error)
        if (onError) {
          onError(error)
        }
      }
    }

    // 立即执行一次
    await poll()

    // 设置定时轮询
    const intervalId = setInterval(poll, pollingInterval)

    return {
      source: 'api_polling',
      intervalId,
      stop: () => clearInterval(intervalId)
    }
  }

  /**
   * 从缓存获取数据
   */
  async fetchFromCache(dataType, deviceId, startTime, endTime) {
    // 这里应该从Redis或内存缓存获取数据
    // 暂时使用API作为模拟
    console.log('从缓存获取数据')
    return await this.fetchFromDatabase(dataType, deviceId, startTime, endTime)
  }

  /**
   * 从数据库获取数据
   */
  async fetchFromDatabase(dataType, deviceId, startTime, endTime) {
    console.log('从数据库获取数据')
    
    const params = {
      deviceId,
      start: startTime.toISOString(),
      end: endTime.toISOString()
    }

    // 根据数据类型选择API
    switch (dataType) {
      case 'vital':
      case 'posture':
      case 'ecg':
        const response = await getHistoryData(params)
        return response.data
      default:
        throw new Error(`不支持的数据库数据类型: ${dataType}`)
    }
  }

  /**
   * 从归档获取数据
   */
  async fetchFromArchive(dataType, deviceId, startTime, endTime) {
    // 这里应该从归档系统获取数据
    // 暂时使用数据库作为模拟
    console.log('从归档获取数据')
    return await this.fetchFromDatabase(dataType, deviceId, startTime, endTime)
  }

  /**
   * 断开所有连接
   */
  disconnectAll() {
    this.wsConnections.forEach((connection, key) => {
      if (connection.client && connection.client.disconnect) {
        connection.client.disconnect()
      }
      console.log(`断开连接: ${key}`)
    })
    this.wsConnections.clear()
  }

  /**
   * 断开特定连接
   */
  disconnect(dataType, deviceId) {
    const connectionKey = `${dataType}_${deviceId}`
    const connection = this.wsConnections.get(connectionKey)
    
    if (connection) {
      if (connection.client && connection.client.disconnect) {
        connection.client.disconnect()
      }
      this.wsConnections.delete(connectionKey)
      console.log(`断开连接: ${connectionKey}`)
    }
  }
}

// 创建单例实例
const smartDataRouter = new SmartDataRouter()

export default smartDataRouter
