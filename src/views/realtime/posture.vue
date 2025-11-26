<template>
  <div class="app-container">
    <h1>Posture Monitor</h1>
    
    <div class="debug-info">
      <h2>Person Info</h2>
      <pre>{{ currentPerson }}</pre>
    </div>

    <div class="debug-info">
      <h2>Device Info</h2>
      <pre>{{ currentDevice }}</pre>
      <p>Status: {{ currentDevice.status }}</p>
    </div>

    <div class="debug-info">
      <h2>Posture Status</h2>
      <p>Status: {{ postureStatus }}</p>
      <p>Last Update: {{ lastUpdateTime }}</p>
    </div>

    <div class="debug-info">
      <h2>Alerts</h2>
      <pre>{{ activeFallAlerts }}</pre>
    </div>

    <div class="visualization">
      <div ref="trajectoryContainer" style="width: 100%; height: 400px; background: #000;"></div>
    </div>

    <div class="actions">
      <button @click="toggleMonitoring">{{ isMonitoring ? 'Stop' : 'Start' }} Monitoring</button>
      <button @click="resetCamera">Reset Camera</button>
    </div>
  </div>
</template>

<script>
// 导入TI6843位姿传感器API
import { 
  getTI6843PostureLatest,
  getTI6843PosturePersonLatest,
  getTI6843PostureDevice,
  createTI6843PostureWebSocket,
  subscribeToTI6843PostureDevice,
  unsubscribeFromTI6843Posture,
  sendTI6843PostureHeartbeat,
  formatPostureDataForDisplay
} from '@/api/ti6843-posture'
import { getTrajectoryByDevice } from '@/api/trajectory'
// 导入跌倒警报API
import {
  getActiveFallAlerts,
  getDeviceActiveFallAlerts,
  getPersonActiveFallAlerts,
  createFallAlertWebSocket,
  formatAlertTime as apiFormatAlertTime,
  markFallAlertAsPending,
  markFallAlertAsResolved,
  markFallAlertAsFalseAlarm,
  ALERT_STATUS_MAP
} from '@/api/fall-alert'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default {
  name: 'PostureMonitor',
  data() {
    return {
      // 设备信息（适配TI6843格式）
      currentDevice: {
        deviceId: this.$route.query.deviceId || 'TI6843_POSTURE_001',
        modelType: 'TI6843_POSTURE',
        type: 'posture_sensor',
        location: this.$route.query.deviceLocation || '未设置',
        status: 'offline',
        name: this.$route.query.deviceName || 'TI6843位姿传感器',
        createdAt: null,
        updatedAt: null
      },
      currentPerson: {
        id: this.$route.query.personId || '',
        name: this.$route.query.personName || '未知用户'
      },
      mappingInfo: {
        name: this.$route.query.mappingName || '默认映射'
      },
      
      // 位姿状态和数据
      postureStatus: 'standing', // 默认为站立状态
      postureStatusMapping: {
        'normal': 'standing',
        'sitting': 'sitting',
        'lying': 'lying',
        'walking': 'walking',
        'fall': 'fall',
        'fallen': 'fall' // 添加fallen状态映射
      },
      currentPostureData: null, // 当前位姿数据
      
      // 跌倒警报相关
      fallAlertWs: null, // 跌倒警报WebSocket连接
      activeFallAlerts: [], // 活跃的跌倒警报列表
      currentFallAlert: null, // 最近一条警报（用于声音/通知）
      alertSoundUrl: '', // 警报音效URL
      isAlertSoundPlaying: false, // 警报音效播放状态
      flashInterval: null, // 闪烁定时器
      
      // WebSocket相关
      ws: null,
      wsConnectionStatus: 'disconnected', // 'connected', 'disconnected', 'connecting'
      heartbeatTimer: null,
      heartbeatInterval: 30000, // 30秒心跳间隔
      reconnectTimer: null,
      reconnectInterval: 5000, // 5秒重连间隔
      maxReconnectAttempts: 5,
      reconnectAttempts: 0,
      isMonitoring: false, // 默认不监控
      
      // 监测和连接状态（借鉴R60ABD1）
      monitoringStatus: '未监测', // 未监测/监测中/已停止
      sensorConnectionStatus: '未连接', // 未连接/已连接/连接异常
      dataReceiveStatus: '无数据', // 无数据/接收中/数据中断
      
      // 数据接收超时检测
      dataTimeout: null, // 数据超时定时器
      dataTimeoutDuration: 10000, // 10秒无数据认为超时
      lastDataReceiveTime: null, // 最后接收数据时间
      noDataTimeout: null, // 无数据检测定时器
      
      // 时间相关
      timer: null,
      updateInterval: 5000, // 更新间隔，默认5秒
      lastUpdateTime: null,
      currentTime: new Date().toLocaleString(),
      
      // 轨迹相关（保留原有功能）
      trajectoryPoints: [],
      displayPoints: [],
      smoothingFactor: 0.5,
      // 关键点平滑轨迹相关
      enableKeypointTrail: true,
      selectedKeypointIndex: 0,
      keypointTrailMaxPoints: 60,
      keypointTrailTimeWindow: 6000, // 轨迹时间窗口：4秒（单位：毫秒）
      smoothedKeypoint: null,
      trajectoryCleanupTimer: null, // 轨迹清理定时器
      
      // 3D可视化相关
      persons: [], // 存储所有人的数据
      colorPalette: [0xff8c00, 0x4169e1, 0x32cd32, 0xffd700, 0x6a5acd, 0xdb7093],
      width: 0,
      height: 0,
      loading: false,
      animationTimer: null,
      currentPointIndex: 0,
      pointInterval: 1000,
      maxDisplayPoints: 6,
      viewMode: 'both', // 'pointclouds', 'keypoints', 'both'
      useSmoothCurve: true, // 使用平滑曲线连接轨迹
      trailCurveSegments: 64, // 曲线细分段数

      // Three.js 相关属性
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      pointsGroup: null,
      lineGroup: null,
      pointCloudsGroup: null,
      keypointsGroup: null,
      animationFrame: null,
      initialCameraPosition: { x: 5, y: 5, z: 5 }
    }
  },
  mounted() {
    this.initializeComponent()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    // ==================== 组件初始化和清理 ====================
    
    async initializeComponent() {
      try {
        console.log('🚀 TI6843位姿监测页面 - 开始初始化')
        
        // 从URL参数获取信息
        this.parseUrlParams()
        
        // 更新页面标题
        this.updatePageTitle()
        
        // TI6843只通过WebSocket获取数据，不使用REST API（与R60ABD1保持一致）
        console.log('TI6843使用纯WebSocket数据传输，等待实时数据...')
        
        // 明确禁用设备信息API调用
        console.warn('⚠️ 注意：TI6843不调用设备信息API，设备信息完全来自URL参数')
        
        // 初始化3D可视化
        this.init3DVisualization()
        
        // 跳过初始数据获取，等待WebSocket数据
        console.log('⏭️ 跳过初始数据获取，等待WebSocket实时数据')
        
        // 获取初始跌倒警报数据
        await this.loadActiveFallAlerts()
        
        // 建立跌倒警报WebSocket连接
        this.connectFallAlertWebSocket()
        
        // 建立WebSocket连接
        this.toggleMonitoring()
        
        // 设置定时任务
        this.setupTimers()
        
        // 添加事件监听
        this.setupEventListeners()
        
        console.log('✅ TI6843位姿监测页面 - 初始化完成')
      } catch (error) {
        console.error('❌ 组件初始化失败:', error)
        // this.$message.error(`初始化失败: ${error.message}`)
      }
    },
    
    parseUrlParams() {
      const personId = this.$route.query.personId || ''
      const personName = this.$route.query.personName || '未知用户'
      const mappingName = this.$route.query.mappingName || '默认映射'
      const deviceId = this.$route.query.deviceId || 'TI6843_POSTURE_001'
      const deviceName = this.$route.query.deviceName || 'TI6843位姿传感器'
      const deviceLocation = this.$route.query.deviceLocation || '未设置'

      // 更新设备信息
      this.currentDevice = {
        ...this.currentDevice,
        deviceId: deviceId,
        name: deviceName,
        location: deviceLocation
      }

      // 更新人员信息
      this.currentPerson = {
        id: personId,
        name: personName
      }

      // 更新映射信息
      this.mappingInfo = {
        name: mappingName
      }

      console.log('📋 URL参数解析:', {
        deviceId,
        deviceName,
        deviceLocation,
        personId,
        personName,
        mappingName
      })
    },
    
    updatePageTitle() {
      const personName = this.currentPerson.name
      if (personName && personName !== '未知用户') {
        document.title = `${personName} - TI6843位姿监测 - 雷达监测系统`
      }
    },
    
    setupTimers() {
      // TI6843使用纯WebSocket，不需要定时获取数据（与R60ABD1保持一致）
      console.log('⏭️ TI6843跳过定时数据获取，只依赖WebSocket推送')
      
      // 只保留时间更新定时器
      setInterval(() => {
        this.currentTime = new Date().toLocaleString()
      }, 1000)
    },
    
    setupEventListeners() {
      // 添加窗口大小变化监听
      window.addEventListener('resize', this.onWindowResize)
    },
    
    cleanup() {
      console.log('🧹 清理组件资源')
      
      // 停止动画
      this.stopAnimation()
      
      // 清除定时器
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      if (this.trajectoryCleanupTimer) {
        clearInterval(this.trajectoryCleanupTimer)
        this.trajectoryCleanupTimer = null
      }
      
      // 停止警报闪烁
      this.stopAlertFlash()

      // 停止监测状态检测
      this.stopMonitoringStatusCheck()
      
      // 关闭WebSocket连接
      this.disconnectWebSocket()
      
      // 关闭跌倒警报WebSocket连接
      this.disconnectFallAlertWebSocket()
      
      // 移除事件监听
      window.removeEventListener('resize', this.onWindowResize)
      
      // 清理Three.js资源
      if (this.renderer) {
        this.renderer.dispose()
      }
      
      if (this.controls) {
        this.controls.dispose()
      }
      
      // 移除动画循环
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
      }
    },

    // ==================== 状态和文本处理 ====================
    
    getPostureTagType(status) {
      const typeMap = {
        'standing': 'success',
        'sitting': 'success',
        'lying': 'warning',
        'walking': 'info',
        'fall': 'danger'
      }
      return typeMap[status] || 'info'
    },

    getPostureText(status) {
      const textMap = {
        'standing': '站立',
        'sitting': '坐着',
        'lying': '躺着',
        'walking': '走动',
        'fall': '跌倒'
      }
      return textMap[status] || '未知'
    },
    
    getDeviceStatusType(status) {
      const typeMap = {
        'active': 'success',
        'inactive': 'info',
        'online': 'success',
        'offline': 'danger'
      }
      return typeMap[status] || 'info'
    },
    
    getDeviceStatusText(status) {
      const textMap = {
        'active': '活跃',
        'inactive': '非活跃',
        'online': '在线',
        'offline': '离线'
      }
      return textMap[status] || '未知'
    },
    
    getQualityColor(percentage) {
      if (percentage >= 80) return '#67C23A'
      if (percentage >= 60) return '#E6A23C'
      if (percentage >= 40) return '#F56C6C'
      return '#909399'
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      return new Date(timestamp).toLocaleString('zh-CN')
    },

    // ==================== 状态管理（借鉴R60ABD1）====================
    
    // 启动监测状态检测
    startMonitoringStatusCheck() {
      // 启动数据接收超时检测
      this.startDataTimeoutCheck()
      this.monitoringStatus = '监测中'
      this.updateOverallStatus()
    },
    
    // 停止监测状态检测
    stopMonitoringStatusCheck() {
      this.clearDataTimeoutCheck()
      this.monitoringStatus = '已停止'
      this.dataReceiveStatus = '无数据'
      this.updateOverallStatus()
    },
    
    // 启动数据超时检测
    startDataTimeoutCheck() {
      this.clearDataTimeoutCheck()
      this.noDataTimeout = setInterval(() => {
        const now = Date.now()
        if (this.lastDataReceiveTime && (now - this.lastDataReceiveTime > this.dataTimeoutDuration)) {
          console.warn('数据接收超时，可能传感器未连接或数据传输中断')
          this.dataReceiveStatus = '数据中断'
          this.sensorConnectionStatus = '连接异常'
          this.updateOverallStatus()
        }
      }, 3000) // 每3秒检查一次
    },
    
    // 清除数据超时检测
    clearDataTimeoutCheck() {
      if (this.noDataTimeout) {
        clearInterval(this.noDataTimeout)
        this.noDataTimeout = null
      }
    },
    
    // 更新总体状态
    updateOverallStatus() {
      // 根据各种状态更新设备状态和端口状态
      if (this.monitoringStatus === '监测中' && this.dataReceiveStatus === '接收中') {
        this.currentDevice.status = 'online'
        this.sensorConnectionStatus = '已连接'
      } else if (this.monitoringStatus === '监测中' && this.dataReceiveStatus === '数据中断') {
        this.currentDevice.status = 'offline'
        this.sensorConnectionStatus = '连接异常'
      } else if (this.monitoringStatus === '未监测') {
        this.currentDevice.status = 'offline'
        this.sensorConnectionStatus = '未连接'
      } else {
        this.currentDevice.status = 'offline'
        this.sensorConnectionStatus = '未连接'
      }
      
      console.log('📊 TI6843位姿状态更新:', {
        monitoring: this.monitoringStatus,
        dataReceive: this.dataReceiveStatus,
        sensorConnection: this.sensorConnectionStatus,
        deviceStatus: this.currentDevice.status
      })
    },

    // ==================== 操作控制 ====================
    toggleMonitoring() {
      if (this.isMonitoring) {
        this.disconnectWebSocket()
        this.stopMonitoringStatusCheck() // 停止监控时停止状态检测
      } else {
        this.connectWebSocket()
        this.startMonitoringStatusCheck() // 开始监控时启动状态检测
      }
      this.isMonitoring = !this.isMonitoring
    },

    showHistory() {
      const query = {}
      // 优先 personId，其次 deviceId
      if (this.currentPerson && this.currentPerson.id) query.personId = this.currentPerson.id
      if (this.currentDevice && this.currentDevice.deviceId) query.deviceId = this.currentDevice.deviceId
      if (Object.keys(query).length === 0) {
        // this.$message.error('缺少人员或设备标识，无法查看历史数据')
        return
      }
      this.$router.push({ name: 'HistoryPosture', query })
    },

    // ==================== WebSocket连接管理 ====================
    
    connectWebSocket() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('⚠️ WebSocket已连接，跳过重复连接')
        return
      }
      
      this.wsConnectionStatus = 'connecting'
      console.log('🔗 开始建立TI6843位姿WebSocket连接')
      
      this.ws = createTI6843PostureWebSocket(
        this.onWebSocketMessage.bind(this),
        this.onWebSocketError.bind(this),
        this.onWebSocketClose.bind(this)
      )
      
      this.ws.onopen = () => {
        console.log('✅ TI6843位姿WebSocket连接成功')
        this.wsConnectionStatus = 'connected'
        this.reconnectAttempts = 0
        
        // 订阅设备数据
        this.subscribeToDevice()
        
        // 开始心跳
        this.startHeartbeat()
        
        // WebSocket连接成功，但需要等待实际数据来确认传感器状态
        console.log('WebSocket连接成功，等待数据确认传感器状态')
        
        // this.$message.success('实时连接已建立')
      }
    },
    
    disconnectWebSocket() {
      if (this.ws) {
        // 取消订阅
        unsubscribeFromTI6843Posture(this.ws)
        
        // 停止心跳
        this.stopHeartbeat()
        
        // 关闭连接
        this.ws.close()
        this.ws = null
      }
      this.wsConnectionStatus = 'disconnected'
      // WebSocket断开时，数据接收肯定中断
      this.dataReceiveStatus = '数据中断'
      this.sensorConnectionStatus = '连接异常'
      this.updateOverallStatus()
    },
    
    subscribeToDevice() {
      if (this.ws && this.currentDevice.deviceId) {
        subscribeToTI6843PostureDevice(this.ws, this.currentDevice.deviceId)
        console.log(`📡 已订阅设备数据: ${this.currentDevice.deviceId}`)
      }
    },
    
    startHeartbeat() {
      this.stopHeartbeat()
      this.heartbeatTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          sendTI6843PostureHeartbeat(this.ws)
        }
      }, this.heartbeatInterval)
    },
    
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }
    },
    
    onWebSocketMessage(message) {
      console.log('📨 收到WebSocket消息:', message)
      
      switch (message.type) {
        case 'welcome':
          console.log('🎉 收到欢迎消息:', message.message)
          break
          
        case 'subscription_confirmed':
          console.log('✅ 订阅确认:', message.message)
          break
          
        case 'ti6843_posture_data':
          this.handleRealtimePostureData(message.data)
          break
          
        case 'pong':
          console.log('💓 心跳响应')
          break
          
        case 'error':
          console.error('❌ WebSocket错误:', message.message)
          // this.$message.error(`实时连接错误: ${message.message}`)
          break
          
        default:
          console.log('📬 未知消息类型:', message.type)
      }
    },
    
    onWebSocketError(event) {
      console.error('❌ WebSocket连接错误:', event)
      this.wsConnectionStatus = 'disconnected'
      this.isMonitoring = false // 连接错误时，设置监控状态为 off
      // 连接错误时更新状态
      this.dataReceiveStatus = '数据中断'
      this.sensorConnectionStatus = '连接异常'
      this.updateOverallStatus()
      // this.$message.error('实时连接出现错误')
      this.attemptReconnect()
    },
    
    onWebSocketClose(event) {
      console.log('🔌 WebSocket连接关闭')
      this.wsConnectionStatus = 'disconnected'
      this.isMonitoring = false // 连接关闭时，设置监控状态为 off
      this.stopHeartbeat()
      // 连接关闭时更新状态
      this.dataReceiveStatus = '无数据'
      this.sensorConnectionStatus = '未连接'
      this.currentDevice.status = 'offline'
      
      // 如果不是主动关闭，尝试重连
      if (event.code !== 1000) {
        this.attemptReconnect()
      }
    },
    
    attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ 超过最大重连次数，停止重连')
        // this.$message.error('实时连接重连失败，请刷新页面')
        return
      }
      
      this.reconnectAttempts++
      console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      this.reconnectTimer = setTimeout(() => {
        this.connectWebSocket()
      }, this.reconnectInterval)
    },
    
    handleRealtimePostureData(data) {
      console.log('🎯 处理实时位姿数据:', data)
      
      // 记录数据接收时间（关键！）
      this.lastDataReceiveTime = Date.now()
      this.dataReceiveStatus = '接收中'
      
      // 只要收到数据，就意味着传感器连接正常
      this.sensorConnectionStatus = '已连接'
      this.updateOverallStatus()
      
      // 格式化数据
      const formattedData = formatPostureDataForDisplay(data)
      
      // 更新当前数据
      this.currentPostureData = formattedData
      this.lastUpdateTime = new Date().toISOString()
      
      // 更新位姿状态（检测跌倒）
      if (data.postureStatus || data.postureState) {
        const postureValue = data.postureStatus || data.postureState
        const mappedStatus = this.postureStatusMapping[postureValue] || 'standing'
        this.postureStatus = mappedStatus
        
        // 日志输出位姿状态
        console.log('📍 位姿状态更新:', {
          original: postureValue,
          mapped: mappedStatus,
          isFallen: mappedStatus === 'fall'
        })
      }
      
      // 更新3D可视化
      this.updatePostureVisualization(formattedData)

      // 更新关键点平滑轨迹
      this.updateKeypointTrail(formattedData)
    },

    // ==================== 数据获取方法 ====================
    
    async fetchPostureData() {
      try {
        this.loading = true
        
        let response
        
        // 优先通过人员ID获取数据
        if (this.currentPerson.id) {
          response = await getTI6843PosturePersonLatest(this.currentPerson.id)
          if (response && response.length > 0) {
            response = response[0] // 取最新的一条
          }
        } else {
          // 通过设备ID获取数据
          response = await getTI6843PostureLatest(this.currentDevice.deviceId)
        }

        if (!response) {
          throw new Error('未获取到位姿数据')
        }

        console.log('📊 获取的位姿数据:', response)

        // 格式化数据用于显示
        const formattedData = formatPostureDataForDisplay(response)
        
        // 更新组件状态
        this.currentPostureData = formattedData
        this.lastUpdateTime = new Date().toISOString()
        
        // 处理位姿状态
        if (response.posture_status) {
          const mappedStatus = this.postureStatusMapping[response.posture_status] || 'standing'
          this.postureStatus = mappedStatus
          console.log('🏃 当前位姿状态:', this.postureStatus)
        }

        // 更新3D可视化
        this.updatePostureVisualization(formattedData)
        
      } catch (error) {
        console.error('❌ 获取位姿数据失败:', error)
        if (!this.ws || this.wsConnectionStatus !== 'connected') {
          // this.$message.error(`获取位姿数据失败: ${error.message}`)
        }
      } finally {
        this.loading = false
      }
    },

    async fetchTrajectoryData() {
      try {
        // TI6843位姿传感器不需要单独的轨迹数据，从位姿数据中提取
        if (this.currentDevice.modelType === 'TI6843_POSTURE') {
          console.log('📈 TI6843设备从位姿数据中提取轨迹信息，跳过轨迹API调用')
          return
        }
        
        // 使用设备ID获取轨迹数据（兼容旧API）
        const deviceId = this.currentDevice.deviceId || this.currentDevice.id
        const response = await getTrajectoryByDevice(deviceId)
        console.log('📈 API返回的轨迹数据:', response)

        // 确保response是数组且不为空
        if (!Array.isArray(response) || response.length === 0) {
          console.warn('⚠️ 没有轨迹数据，跳过轨迹展示')
          return
        }

        // 获取最新的一条数据
        const latestData = response[0]

        // 解析position字符串为数组
        let positionArray
        try {
          positionArray = JSON.parse(latestData.position)
          console.log('解析后的position数组:', positionArray)
        } catch (e) {
          console.error('Position解析失败:', e)
          throw new Error('Position数据格式不正确')
        }

        // 清空现有点
        this.trajectoryPoints = []
        this.displayPoints = []

        // 处理position数组中的坐标点
        if (Array.isArray(positionArray)) {
          this.trajectoryPoints = positionArray.map((point, index) => {
            if (Array.isArray(point) && point.length >= 3) {
              return {
                x: point[0],
                y: point[1],
                z: point[2],
                index: index
              }
            }
            return null
          }).filter(point => point !== null)
        }

        if (this.trajectoryPoints.length > 0) {
          console.log(`🎯 成功解析 ${this.trajectoryPoints.length} 个轨迹点，开始动画展示`)
          this.startAnimation()
        }
      } catch (error) {
        console.error('❌ 获取轨迹数据失败:', error)
        // 轨迹数据获取失败不影响位姿数据显示
      }
    },

    // ==================== 3D可视化控制 ====================
    
    setViewMode(mode) {
      this.viewMode = mode
      console.log('🎨 切换显示模式:', mode)
      
      // 根据模式显示/隐藏不同的组
      if (this.pointCloudsGroup) {
        this.pointCloudsGroup.visible = mode === 'pointclouds' || mode === 'both'
      }
      if (this.keypointsGroup) {
        this.keypointsGroup.visible = mode === 'keypoints' || mode === 'both'
      }
    },
    
    resetCamera() {
      if (this.camera && this.controls) {
        this.camera.position.set(
          this.initialCameraPosition.x,
          this.initialCameraPosition.y,
          this.initialCameraPosition.z
        )
        this.camera.lookAt(0, 0, 0)
        this.controls.reset()
        console.log('📷 摄像机视角已重置')
      }
    },
    
    updatePostureVisualization(data) {
      if (!data) return
      
      // 构造persons数据格式以兼容现有的3D渲染逻辑
      this.persons = []
      
      if (data.pointclouds || data.keypoints) {
        this.persons.push({
          id: data.personId || 'person_0',
          pointClouds: data.pointclouds || [],
          keypoints: data.keypoints || []
        })
      }
      
      // 更新3D视图
      this.update3DView()
    },

    // 基于关键点的实时平滑运动轨迹
    updateKeypointTrail(data) {
      if (!this.enableKeypointTrail) return
      if (!data || !Array.isArray(data.keypoints) || data.keypoints.length === 0) return

      const idx = Math.max(0, Math.min(this.selectedKeypointIndex, data.keypoints.length - 1))
      const kp = data.keypoints[idx]
      if (!Array.isArray(kp) || kp.length < 3) return

      const rawPoint = { x: kp[0], y: kp[1], z: kp[2] }

      // 指数滑动平均 EMA 平滑
      const alpha = Math.max(0, Math.min(1, this.smoothingFactor || 0.5))
      if (!this.smoothedKeypoint) {
        this.smoothedKeypoint = { ...rawPoint }
      } else {
        this.smoothedKeypoint = {
          x: alpha * rawPoint.x + (1 - alpha) * this.smoothedKeypoint.x,
          y: alpha * rawPoint.y + (1 - alpha) * this.smoothedKeypoint.y,
          z: alpha * rawPoint.z + (1 - alpha) * this.smoothedKeypoint.z
        }
      }

      // 获取当前时间戳
      const currentTime = Date.now()

      // 将平滑后的点推入显示缓冲，并添加时间戳
      this.displayPoints.push({ 
        ...this.smoothedKeypoint,
        timestamp: currentTime
      })

      // 清理超过时间窗口的旧轨迹点（4秒外的点）
      this.cleanupOldTrajectoryPoints()

      // 同时保留原有的点数限制作为备份机制
      if (this.displayPoints.length > this.keypointTrailMaxPoints) {
        this.displayPoints.shift()
      }

      // 渲染轨迹
      this.updateTrajectory3D()
    },

    // 清理超过时间窗口的旧轨迹点
    cleanupOldTrajectoryPoints() {
      const currentTime = Date.now()
      const timeWindow = this.keypointTrailTimeWindow

      // 过滤掉超过4秒的轨迹点
      this.displayPoints = this.displayPoints.filter(point => {
        // 如果点没有时间戳（兼容旧数据），保留它
        if (!point.timestamp) return true
        // 只保留时间窗口内的点
        return (currentTime - point.timestamp) <= timeWindow
      })

      console.log(`🧹 轨迹清理: 当前显示 ${this.displayPoints.length} 个点 (${timeWindow / 1000}秒内)`)
    },

    // ==================== 轨迹动画控制 ====================
    
    startAnimation() {
      // 停止现有动画
      this.stopAnimation()

      // 重置状态
      this.currentPointIndex = 0
      this.displayPoints = []

      // 重置3D场景中的点和线
      this.clearTrajectoryScene()

      console.log(`🎬 开始轨迹动画展示，共 ${this.trajectoryPoints.length} 个点，间隔 ${this.pointInterval}ms`)

      // 记录动画开始时间
      const animationStartTime = Date.now()

      // 设置定时器逐个显示点
      this.animationTimer = setInterval(() => {
        if (this.currentPointIndex >= this.trajectoryPoints.length) {
          this.stopAnimation()
          return
        }

        // 添加新的点到显示数组，并附加模拟时间戳
        const point = this.trajectoryPoints[this.currentPointIndex]
        const simulatedTimestamp = animationStartTime + (this.currentPointIndex * this.pointInterval)
        
        this.displayPoints.push({
          ...point,
          timestamp: simulatedTimestamp
        })

        // 清理超过时间窗口的旧轨迹点
        this.cleanupOldTrajectoryPoints()

        // 同时保留原有的点数限制作为备份机制
        if (this.displayPoints.length > this.maxDisplayPoints) {
          this.displayPoints.shift() // 移除最早的点
        }

        console.log(`📍 显示第 ${this.currentPointIndex + 1} 个点，当前共显示 ${this.displayPoints.length} 个点`)

        // 更新3D轨迹视图
        this.updateTrajectory3D()

        // 移动到下一个点
        this.currentPointIndex++
      }, this.pointInterval)
    },

    stopAnimation() {
      if (this.animationTimer) {
        clearInterval(this.animationTimer)
        this.animationTimer = null
      }
    },

    // ==================== Three.js 3D可视化 ====================
    
    onWindowResize() {
      if (!this.camera || !this.renderer || !this.$refs.trajectoryContainer) return

      const container = this.$refs.trajectoryContainer
      this.width = container.clientWidth

      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
    },

    init3DVisualization() {
      const container = this.$refs.trajectoryContainer
      this.width = container.clientWidth
      this.height = 400

      console.log('🎨 初始化3D可视化系统')

      // 创建场景
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x1a1a1a)

      // 创建相机
      this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
      this.camera.position.set(
        this.initialCameraPosition.x,
        this.initialCameraPosition.y,
        this.initialCameraPosition.z
      )
      this.camera.lookAt(0, 0, 0)

      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setSize(this.width, this.height)
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(this.renderer.domElement)

      // 添加轨道控制器
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.25
      this.controls.screenSpacePanning = false
      this.controls.maxPolarAngle = Math.PI / 2

      // 创建坐标轴辅助
      const axesHelper = new THREE.AxesHelper(5)
      this.scene.add(axesHelper)

      // 创建网格
      this.addGrid()

      // 创建不同功能的组
      this.pointsGroup = new THREE.Group() // 轨迹点
      this.lineGroup = new THREE.Group() // 轨迹线
      this.pointCloudsGroup = new THREE.Group() // 点云数据
      this.keypointsGroup = new THREE.Group() // 关键点数据
      
      this.scene.add(this.pointsGroup)
      this.scene.add(this.lineGroup)
      this.scene.add(this.pointCloudsGroup)
      this.scene.add(this.keypointsGroup)

      // 添加灯光系统
      this.setupLighting()

      // 开始动画循环
      this.animate()
      
      console.log('✅ 3D可视化系统初始化完成')
    },
    
    setupLighting() {
      // 环境光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      this.scene.add(ambientLight)

      // 主方向光
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 10)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      this.scene.add(directionalLight)

      // 补充光源
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
      fillLight.position.set(-10, -10, -10)
      this.scene.add(fillLight)
    },

    animate() {
      this.animationFrame = requestAnimationFrame(this.animate)

      // 更新控制器
      if (this.controls) {
        this.controls.update()
      }

      // 渲染场景
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    },

    clearTrajectoryScene() {
      // 只清除轨迹相关的点和线
      if (this.pointsGroup) {
        while (this.pointsGroup.children.length > 0) {
          const object = this.pointsGroup.children[0]
          this.pointsGroup.remove(object)
          if (object.geometry) object.geometry.dispose()
          if (object.material) object.material.dispose()
        }
      }

      if (this.lineGroup) {
        while (this.lineGroup.children.length > 0) {
          const object = this.lineGroup.children[0]
          this.lineGroup.remove(object)
          if (object.geometry) object.geometry.dispose()
          if (object.material) object.material.dispose()
        }
      }
    },

    clearPostureScene() {
      // 只清除位姿相关的点云和关键点
      if (this.pointCloudsGroup) {
        while (this.pointCloudsGroup.children.length > 0) {
          const object = this.pointCloudsGroup.children[0]
          this.pointCloudsGroup.remove(object)
          if (object.geometry) object.geometry.dispose()
          if (object.material) object.material.dispose()
        }
      }
      
      if (this.keypointsGroup) {
        while (this.keypointsGroup.children.length > 0) {
          const object = this.keypointsGroup.children[0]
          this.keypointsGroup.remove(object)
          if (object.geometry) object.geometry.dispose()
          if (object.material) object.material.dispose()
        }
      }
    },

    updateTrajectory3D() {
      if (!this.displayPoints.length) return

      // 清除现有的轨迹点和线
      this.clearTrajectoryScene()

      // 渲染轨迹点
      for (let i = 0; i < this.displayPoints.length; i++) {
        const point = this.displayPoints[i]

        // 计算透明度：最新的点完全不透明，最旧的点最透明
        const opacity = (i + 1) / this.displayPoints.length

        // 创建球体表示点
        const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16)
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: opacity
        })
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

        sphere.position.set(point.x, point.y, point.z)
        this.pointsGroup.add(sphere)
      }

      // 如果有多个点，创建轨迹线
      if (this.displayPoints.length > 1){
        let curvePoints = []

        if (this.useSmoothCurve && this.displayPoints.length >= 3) {
          // 使用 Catmull-Rom 生成平滑曲线，按时间顺序连接
          const vectors = this.displayPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))
          const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.5)
          curvePoints = curve.getPoints(Math.max(this.trailCurveSegments, this.displayPoints.length))
        } else {
          // 点数不足或关闭平滑时，使用原始折线
          curvePoints = this.displayPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))
        }

        const lineGeometry = new THREE.BufferGeometry()
        const linePositions = []
        for (let i = 0; i < curvePoints.length; i++) {
          const v = curvePoints[i]
          linePositions.push(v.x, v.y, v.z)
        }
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))

        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x4CAF50,
          linewidth: 2,
          opacity: 0.9,
          transparent: true
        })

        const line = new THREE.Line(lineGeometry, lineMaterial)
        this.lineGroup.add(line)
      }
    },

    update3DView() {
      // 清除旧的位姿数据
      this.clearPostureScene()

      if (!this.persons || this.persons.length === 0) {
        console.log('📊 没有位姿数据需要渲染')
        return
      }

      console.log('🎨 开始渲染位姿数据:', this.persons)

      this.persons.forEach((person, index) => {
        const color = this.colorPalette[index % this.colorPalette.length]

        // 渲染点云数据
        if (person.pointClouds && person.pointClouds.length > 0) {
          this.renderPointClouds(person.pointClouds, color)
        }

        // 渲染关键点数据
        if (person.keypoints && person.keypoints.length > 0) {
          this.renderKeypoints(person.keypoints, color)
        }
      })

      // 根据当前视图模式设置可见性
      this.setViewMode(this.viewMode)
    },
    
    renderPointClouds(pointClouds, color) {
      try {
        const positions = []
        let validPointCount = 0
        
        // 处理点云数据，支持多种数据格式
        if (Array.isArray(pointClouds)) {
          // 如果是三维数组 [[[x,y,z], ...], ...]
          if (pointClouds.length > 0 && Array.isArray(pointClouds[0])) {
            pointClouds.forEach(cloud => {
              if (Array.isArray(cloud)) {
                cloud.forEach(point => {
                  if (Array.isArray(point) && point.length >= 3) {
                    positions.push(point[0], point[1], point[2])
                    validPointCount++
                  }
                })
              }
            })
          } else {
            // 如果是二维数组 [[x,y,z], ...]
            pointClouds.forEach(point => {
              if (Array.isArray(point) && point.length >= 3) {
                positions.push(point[0], point[1], point[2])
                validPointCount++
              }
            })
          }
        }
        
        if (validPointCount > 0) {
          const pointsGeometry = new THREE.BufferGeometry()
          pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          
          const pointsMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.02,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
          })
          
          const points = new THREE.Points(pointsGeometry, pointsMaterial)
          this.pointCloudsGroup.add(points)
          
          console.log(`✅ 渲染点云数据: ${validPointCount} 个点`)
        }
      } catch (error) {
        console.error('❌ 渲染点云数据失败:', error)
      }
    },
    
    renderKeypoints(keypoints, color) {
      try {
        let validKeypointCount = 0
        const keypointGeometry = new THREE.SphereGeometry(0.03, 8, 8)
        const keypointMaterial = new THREE.MeshLambertMaterial({ 
          color: color,
          transparent: true,
          opacity: 0.9
        })

        keypoints.forEach(point => {
          if (Array.isArray(point) && point.length >= 3) {
            const keypoint = new THREE.Mesh(keypointGeometry, keypointMaterial.clone())
            keypoint.position.set(point[0], point[1], point[2])
            keypoint.castShadow = true
            this.keypointsGroup.add(keypoint)
            validKeypointCount++
          }
        })
        
        if (validKeypointCount > 0) {
          console.log(`✅ 渲染关键点数据: ${validKeypointCount} 个关键点`)
        }
      } catch (error) {
        console.error('❌ 渲染关键点数据失败:', error)
      }
    },

    addGrid() {
      // 添加网格辅助
      const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333)
      gridHelper.position.y = -0.01 // 稍微降低避免z-fighting
      this.scene.add(gridHelper)

      // 添加XZ平面
      const planeGeometry = new THREE.PlaneGeometry(10, 10)
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x2a2a2a,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })

      const plane = new THREE.Mesh(planeGeometry, planeMaterial)
      plane.rotation.x = -Math.PI / 2
      plane.position.y = -0.02
      plane.receiveShadow = true
      this.scene.add(plane)
    },

    // ==================== 跌倒警报相关方法 ====================
    
    /**
     * 加载活跃的跌倒警报
     */
    async loadActiveFallAlerts() {
      try {
        console.log('📋 加载活跃跌倒警报...')
        
        let alerts = []
        
        // 优先通过人员ID获取
        if (this.currentPerson.id) {
          alerts = await getPersonActiveFallAlerts(this.currentPerson.id)
          console.log(`✅ 人员 ${this.currentPerson.id} 的活跃警报:`, alerts)
        } else if (this.currentDevice.deviceId) {
          alerts = await getDeviceActiveFallAlerts(this.currentDevice.deviceId)
          console.log(`✅ 设备 ${this.currentDevice.deviceId} 的活跃警报:`, alerts)
        }
        
        this.activeFallAlerts = Array.isArray(alerts) ? alerts : []
        
        if (this.activeFallAlerts.length > 0) {
          console.log(`⚠️ 发现 ${this.activeFallAlerts.length} 个活跃警报`)
        }
      } catch (error) {
        console.error('❌ 加载跌倒警报失败:', error)
      }
    },
    
    /**
     * 连接跌倒警报WebSocket
     */
    connectFallAlertWebSocket() {
      console.log('🔗 连接跌倒警报WebSocket...')
      
      this.fallAlertWs = createFallAlertWebSocket({
        onOpen: () => {
          console.log('✅ 跌倒警报WebSocket连接成功')
        },
        onFallAlert: (alert) => {
          console.log('⚠️ 收到跌倒警报:', alert)
          this.handleNewFallAlert(alert)
        },
        onAlertStatusUpdate: (alert) => {
          console.log('🔄 警报状态更新:', alert)
          this.handleAlertStatusUpdate(alert)
        },
        onError: (error) => {
          console.error('❌ 跌倒警报WebSocket错误:', error)
        },
        onClose: () => {
          console.log('🔌 跌倒警报WebSocket连接关闭')
        }
      })
    },
    
    /**
     * 断开跌倒警报WebSocket
     */
    disconnectFallAlertWebSocket() {
      if (this.fallAlertWs) {
        if (this.fallAlertWs.closeConnection) {
          this.fallAlertWs.closeConnection()
        } else {
          this.fallAlertWs.close()
        }
        this.fallAlertWs = null
        console.log('🔴 跌倒警报WebSocket已断开')
      }
    },
    
    /**
     * 处理新跌倒警报
     */
    handleNewFallAlert(alert) {
      console.log('🚨 处理新跌倒警报:', alert)
      
      // 添加到活跃警报列表（如果不存在）
      const existingIndex = this.activeFallAlerts.findIndex(a => a.id === alert.id)
      if (existingIndex === -1) {
        this.activeFallAlerts.unshift(alert)
      }
      
      // 顶部提示条功能已移除，仅保留消息提示与声音

      // 播放警报音效
      // this.playAlertSound()
      
      // // 开始屏幕闪烁
      // this.startAlertFlash()
      
      // // 浏览器通知
      // this.showBrowserNotification(alert)
      
      // 非阻塞通知
      // this.$message.error({
      //   message: `⚠️ ${alert.personName || '未知人员'} 发生跌倒！位置：${alert.location || '未知'}`,
      //   duration: 5000,
      //   showClose: true
      // })
    },
    
    /**
     * 处理警报状态更新
     */
    handleAlertStatusUpdate(updatedAlert) {
      console.log('🔄 更新警报状态:', updatedAlert)
      
      const index = this.activeFallAlerts.findIndex(a => a.id === updatedAlert.id)
      
      if (index !== -1) {
        // 如果警报已解决或标记为误报，从列表中移除
        if (updatedAlert.alertStatus === 'RESOLVED' || updatedAlert.alertStatus === 'FALSE_ALARM') {
          this.activeFallAlerts.splice(index, 1)
        } else {
          // 否则更新警报信息（合并原有数据和更新数据）
          // this.$set(this.activeFallAlerts, index, {
          //   ...this.activeFallAlerts[index],
          //   ...updatedAlert
          // })
          // Vue 3 reactivity
          this.activeFallAlerts[index] = {
            ...this.activeFallAlerts[index],
            ...updatedAlert
          }
        }
      }
      
      // 如果当前显示的警报被更新，也更新弹窗内容
      if (this.currentFallAlert && this.currentFallAlert.id === updatedAlert.id) {
        this.currentFallAlert = updatedAlert
        
        // 如果已处理，关闭弹窗
        if (updatedAlert.alertStatus === 'RESOLVED' || updatedAlert.alertStatus === 'FALSE_ALARM') {
          this.fallAlertDialogVisible = false
          this.stopAlertFlash()
        }
      }
    },
    
    /**
     * 标记警报为待解决
     */
    async handleMarkPending(alert) {
      try {
        // const { value: handlerName } = await this.$prompt('请输入您的姓名', '标记为待解决', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   inputPattern: /.+/,
        //   inputErrorMessage: '请输入处理人姓名'
        // })
        const handlerName = 'Admin' // Mock
        
        console.log('🔄 标记警报为待解决:', alert.id)
        const updatedAlert = await markFallAlertAsPending(alert.id, {
          handlerBy: handlerName
        })
        
        // this.$message.success('已标记为待解决')
        
        // 更新本地列表（合并原有数据和更新数据）
        const index = this.activeFallAlerts.findIndex(a => a.id === alert.id)
        if (index !== -1) {
          // 保留原有字段，只更新后端返回的字段
          // this.$set(this.activeFallAlerts, index, {
          //   ...this.activeFallAlerts[index],
          //   ...updatedAlert
          // })
          this.activeFallAlerts[index] = {
            ...this.activeFallAlerts[index],
            ...updatedAlert
          }
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('标记待解决失败:', error)
          // this.$message.error('操作失败: ' + (error.message || error))
        }
      }
    },
    
    /**
     * 标记警报为已解决
     */
    async handleMarkResolved(alert) {
      try {
        // const { value: handlerName } = await this.$prompt('请输入您的姓名', '标记为已解决', {
        //   confirmButtonText: '下一步',
        //   cancelButtonText: '取消',
        //   inputPattern: /.+/,
        //   inputErrorMessage: '请输入处理人姓名'
        // })
        const handlerName = 'Admin' // Mock
        
        // const { value: notes } = await this.$prompt('请输入处理备注（可选）', '处理备注', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   inputType: 'textarea'
        // })
        const notes = 'Resolved' // Mock
        
        console.log('✅ 标记警报为已解决:', alert.id)
        await markFallAlertAsResolved(alert.id, {
          handlerBy: handlerName,
          notes: notes || ''
        })
        
        // this.$message.success('已标记为已解决')
        
        // 从活跃列表中移除
        const index = this.activeFallAlerts.findIndex(a => a.id === alert.id)
        if (index !== -1) {
          this.activeFallAlerts.splice(index, 1)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('标记已解决失败:', error)
          // this.$message.error('操作失败: ' + (error.message || error))
        }
      }
    },
    
    /**
     * 标记为误报
     */
    async handleMarkFalseAlarm(alert) {
      try {
        // const { value: handlerName } = await this.$prompt('请输入您的姓名', '标记为误报', {
        //   confirmButtonText: '下一步',
        //   cancelButtonText: '取消',
        //   inputPattern: /.+/,
        //   inputErrorMessage: '请输入处理人姓名'
        // })
        const handlerName = 'Admin' // Mock
        
        // const { value: notes } = await this.$prompt('请输入误报原因（可选）', '误报原因', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   inputType: 'textarea'
        // })
        const notes = 'False Alarm' // Mock
        
        console.log('🔕 标记警报为误报:', alert.id)
        await markFallAlertAsFalseAlarm(alert.id, {
          handlerBy: handlerName,
          notes: notes || '误报'
        })
        
        // this.$message.success('已标记为误报')
        
        // 从活跃列表中移除
        const index = this.activeFallAlerts.findIndex(a => a.id === alert.id)
        if (index !== -1) {
          this.activeFallAlerts.splice(index, 1)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('标记误报失败:', error)
          // this.$message.error('操作失败: ' + (error.message || error))
        }
      }
    },
    
    /**
     * 快速处理（从弹窗）
     */
    handleQuickResolve() {
      if (!this.currentFallAlert) return
      this.fallAlertDialogVisible = false
      this.handleResolveAlert(this.currentFallAlert)
    },
    
    /**
     * 关闭警报弹窗
     */
    handleDismissAlert() {
      this.fallAlertDialogVisible = false
      this.stopAlertFlash()
    },
    
    /**
     * 警报弹窗关闭回调
     */
    handleAlertDialogClose() {
      this.stopAlertFlash()
    },
    
    /**
     * 查看所有警报
     */
    viewAllAlerts() {
      // TODO: 跳转到警报管理页面
      // this.$message.info('警报管理页面开发中...')
    },
    
    /**
     * 播放警报音效
     */
    playAlertSound() {
      try {
        if (this.$refs.alertAudio && !this.isAlertSoundPlaying) {
          this.$refs.alertAudio.play()
          this.isAlertSoundPlaying = true
          
          setTimeout(() => {
            this.isAlertSoundPlaying = false
          }, 3000)
        }
      } catch (error) {
        console.warn('播放警报音效失败:', error)
      }
    },
    
    /**
     * 开始屏幕闪烁
     */
    startAlertFlash() {
      this.stopAlertFlash()
      
      let flashCount = 0
      this.flashInterval = setInterval(() => {
        document.body.style.backgroundColor = flashCount % 2 === 0 ? '#ffebee' : '#ffffff'
        flashCount++
        
        if (flashCount >= 10) {
          this.stopAlertFlash()
        }
      }, 500)
    },
    
    /**
     * 停止屏幕闪烁
     */
    stopAlertFlash() {
      if (this.flashInterval) {
        clearInterval(this.flashInterval)
        this.flashInterval = null
        document.body.style.backgroundColor = '#ffffff'
      }
    },
    
    /**
     * 显示浏览器通知
     */
    showBrowserNotification(alert) {
      if (!('Notification' in window)) {
        return
      }
      
      if (Notification.permission === 'granted') {
        new Notification('⚠️ 跌倒警报', {
          body: `${alert.personName || '未知人员'} 发生跌倒！\n位置：${alert.location || '未知'}`,
          icon: '/favicon.ico',
          tag: `fall-alert-${alert.id}`,
          requireInteraction: true
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showBrowserNotification(alert)
          }
        })
      }
    },
    
    // ==================== 警报辅助方法 ====================
    
    formatAlertTime(timestamp) {
      return apiFormatAlertTime(timestamp)
    },
    
    formatFullTime(timestamp) {
      if (!timestamp) return '未知'
      try {
        return new Date(timestamp).toLocaleString('zh-CN')
      } catch (e) {
        return String(timestamp)
      }
    },
    
    getAlertStatusText(status) {
      return ALERT_STATUS_MAP[status] || status
    },
    
    getAlertStatusTagType(status) {
      const map = {
        NEW: 'danger',
        PENDING: 'warning',
        RESOLVED: 'success',
        FALSE_ALARM: 'info'
      }
      return map[status] || 'info'
    },
    
    getSeverityText(severity) {
      const map = {
        LOW: '低',
        MEDIUM: '中',
        HIGH: '高',
        CRITICAL: '紧急'
      }
      return map[severity] || severity
    },
    
    getSeverityTagType(severity) {
      const map = {
        LOW: 'info',
        MEDIUM: 'warning',
        HIGH: 'danger',
        CRITICAL: 'danger'
      }
      return map[severity] || 'info'
    },
    
    getAlertTimelineType(status) {
      const map = {
        NEW: 'danger',
        PENDING: 'warning',
        RESOLVED: 'success',
        FALSE_ALARM: 'info'
      }
      return map[status] || 'primary'
    },
    
    getAlertIcon(status) {
      const map = {
        NEW: 'el-icon-warning',
        PENDING: 'el-icon-s-claim',
        RESOLVED: 'el-icon-success',
        FALSE_ALARM: 'el-icon-circle-close'
      }
      return map[status] || 'el-icon-more'
    }
  }
}
</script>
