<template>
  <div class="app-container">
    <h1>Vital Monitor</h1>
    
    <div class="debug-info">
      <h2>Person Info</h2>
      <pre>{{ currentPerson }}</pre>
      <pre>{{ mappingInfo }}</pre>
    </div>

    <div class="debug-info">
      <h2>Device Info</h2>
      <pre>{{ currentDevice }}</pre>
      <p>Status: {{ currentDevice.status }}</p>
      <p>Type: {{ deviceType }}</p>
    </div>

    <div class="debug-info">
      <h2>Realtime Data</h2>
      <p>Breath Rate: {{ breathRate }} ({{ breathStatus }})</p>
      <p>Heart Rate: {{ heartRate }} ({{ heartStatus }})</p>
      <p>Motion: {{ motionValue }}</p>
      <p>Last Update: {{ lastUpdateTime }}</p>
    </div>

    <div class="debug-info">
      <h2>System Status</h2>
      <p>Monitoring: {{ monitoringStatus }}</p>
      <p>Sensor Connection: {{ sensorConnectionStatus }}</p>
      <p>Data Receive: {{ dataReceiveStatus }}</p>
      <p>Port: {{ port }} ({{ baudRate }})</p>
    </div>

    <div class="actions">
      <button @click="toggleMonitoring">{{ isMonitoring ? 'Stop' : 'Start' }} Monitoring</button>
      <button @click="testWebSocket">Test WebSocket</button>
      <button @click="testR60ABD1APIs">Test API</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useDeviceStore } from '@/stores/device'
import { showGlobalError } from '@/utils/error-handler'
import dataManager from '@/utils/DataManager'
import { getPersonRealtimeData, createPersonDeviceMapping, getActivePersonDeviceMappings } from '@/api/r60abd1'
import { getTI6843DeviceRealtimeData, createTI6843VitalWebSocket } from '@/api/ti6843-vital'
import { getDevicePortConfig, getDeviceType } from '@/utils/deviceConfig'

export default {
  name: 'VitalMonitor',
  data() {
    return {
      dataManager: dataManager,
      breathStatus: 'normal',
      breathRate: 0,
      breathWaveform: [],
      heartStatus: 'normal',
      heartRate: 0,
      heartWaveform: [],
      motionValue: 0,
      motionWaveform: [],
      currentDevice: {},
      currentPerson: {},
      mappingInfo: {},
      loading: false,
      initialDataLoaded: false,
      currentTime: new Date().toLocaleString(),
      portStatus: '关闭',
      port: 'COM3', // 默认端口，会根据设备ID动态设置
      baudRate: '115200',
      // 监测和连接状态
      monitoringStatus: '未监测', // 未监测/监测中/已停止
      sensorConnectionStatus: '未连接', // 未连接/已连接/连接异常
      dataReceiveStatus: '无数据', // 无数据/接收中/数据中断
      isMonitoring: true,
      connectionStatus: 'disconnected',
      lastError: null,
      reconnectAttempts: 0,
      lastDataUpdate: Date.now(),
      lastUpdateTime: null, // 添加最后更新时间属性
      updateTimer: null, // 用于防抖的计时器
      renderRequestId: null, // 用于动画帧请求ID
      // 数据接收超时检测
      dataTimeout: null, // 数据超时定时器
      dataTimeoutDuration: 10000, // 10秒无数据认为超时
      lastDataReceiveTime: null, // 最后接收数据时间
      noDataTimeout: null // 无数据检测定时器
    }
  },
  computed: {
    ...mapState(useDeviceStore, ['currentDeviceId']),

    // 设备类型检测
    deviceType() {
      return getDeviceType(this.currentDevice.id)
    },

    // 设备类型显示名称
    deviceTypeDisplayName() {
      const typeMap = {
        'R60ABD1': 'R60ABD1雷达传感器',
        'TI6843': 'TI6843呼吸心跳传感器',
        'R77ABH1': 'R77ABH1传感器'
      }
      return typeMap[this.deviceType] || this.deviceType
    },

    // 是否显示体动数据 (只有R60ABD1支持体动检测)
    showMotionData() {
      return this.deviceType === 'R60ABD1'
    },

    // 格式化后的呼吸数据
    formattedBreathData() {
      return this.breathWaveform.length > 0 ? [...this.breathWaveform] : [0, 0, 0]
    },

    // 格式化后的心率数据
    formattedHeartData() {
      return this.heartWaveform.length > 0 ? [...this.heartWaveform] : [0, 0, 0]
    },

    // 格式化后的体动数据
    formattedMotionData() {
      return this.motionWaveform.length > 0 ? [...this.motionWaveform] : [0, 0, 0]
    }
  },
  watch: {
    currentDeviceId: {
      handler(newId, oldId) {
        if (newId && newId !== this.currentDevice.id) {
          const oldDeviceType = oldId ? getDeviceType(oldId) : null
          const newDeviceType = getDeviceType(newId)

          // 清理旧设备连接
          if (oldId) {
            if (oldDeviceType === 'TI6843' && this.ti6843WebSocket) {
              this.ti6843WebSocket.close()
              this.ti6843WebSocket = null
            } else if (this.dataManager) {
              this.dataManager.unsubscribeFromDevice(oldId, this.handleData)
            }
          }

          this.currentDevice.id = newId
          this.updateDevicePortConfig(newId)

          // 建立新设备连接
          if (this.dataManager) {
            this.dataManager.subscribeToDevice(newId, this.handleData)
            this.restartDataManager()
          }
        }
      },
      immediate: true
    }
  },
  mounted() {
    // 从URL参数或Vuex状态中获取设备和人员信息
    const deviceId = this.$route.query.deviceId || this.currentDeviceId || 'R60ABD1'
    const deviceName = this.$route.query.deviceName || '雷达设备A'
    const deviceLocation = this.$route.query.deviceLocation || '房间1'

    // 获取人员信息
    const personId = this.$route.query.personId || ''
    const personName = this.$route.query.personName || '未知用户'
    const mappingName = this.$route.query.mappingName || '默认映射'

    // 添加日志
    console.log('Vital页面 - 初始化')
    console.log('Vital页面 - 设备ID:', deviceId)
    console.log('Vital页面 - 设备名称:', deviceName)
    console.log('Vital页面 - 设备位置:', deviceLocation)
    console.log('Vital页面 - 人员ID:', personId)
    console.log('Vital页面 - 人员姓名:', personName)
    console.log('Vital页面 - 映射名称:', mappingName)

    if (this.$route.query.deviceId && this.$route.query.deviceId !== this.currentDeviceId) {
      this.setCurrentDevice(this.$route.query.deviceId)
    }

    // 设置设备信息
    this.currentDevice = {
      id: deviceId,
      name: deviceName,
      location: deviceLocation,
      status: 'offline' // 初始状态为离线
    }

    // 根据设备ID设置端口参数
    this.updateDevicePortConfig(deviceId)

    // 设置人员信息
    this.currentPerson = {
      id: personId,
      name: personName
    }

    // 设置映射信息
    this.mappingInfo = {
      name: mappingName
    }

    // 如果有人员信息，更新页面标题
    if (personName && personName !== '未知用户') {
      document.title = `${personName} - 呼吸心跳监测 - 雷达监测系统`
    }

    // 更新时间显示
    this.updateCurrentTime()

    // 根据设备类型选择数据源
    const detectedDeviceType = getDeviceType(deviceId)
    console.log('🔍 检测到设备类型:', detectedDeviceType)

    // 统一使用 DataManager 连接
    console.log(`📡 ${detectedDeviceType}设备 - 使用DataManager连接`)
    this.dataManager.subscribeToDevice(deviceId, this.handleData)
    this.dataManager.on('connectionChange', this.handleConnectionChange)
    this.restartDataManager()
  },
  beforeDestroy() {
    console.log('Vital页面 - 销毁')

    // 停止DataManager
    this.dataManager.stop()
    // 移除设备特定的订阅
    if (this.currentDevice && this.currentDevice.id) {
      this.dataManager.unsubscribeFromDevice(this.currentDevice.id, this.handleData)
    }
    // 移除全局事件监听器
    this.dataManager.off('connectionChange', this.handleConnectionChange)

    // 停止监测状态检测
    this.stopMonitoringStatusCheck()
    // 清除计时器和动画帧
    if (this.updateTimer) clearTimeout(this.updateTimer)
    if (this.renderRequestId) cancelAnimationFrame(this.renderRequestId)
  },
  methods: {
    ...mapActions(useDeviceStore, ['setCurrentDevice']),
    updateCurrentTime() {
      this.currentTime = new Date().toLocaleString()
    },
    // 根据设备ID更新端口配置
    updateDevicePortConfig(deviceId) {
      const config = getDevicePortConfig(deviceId)
      
      this.port = config.port
      this.baudRate = config.baudRate
      console.log(`设备 ${deviceId} 端口配置:`, config)
    },
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
        this.portStatus = '打开'
        this.sensorConnectionStatus = '已连接'
      } else if (this.monitoringStatus === '监测中' && this.dataReceiveStatus === '数据中断') {
        this.currentDevice.status = 'offline'
        this.portStatus = '打开'
        this.sensorConnectionStatus = '连接异常'
      } else if (this.monitoringStatus === '未监测') {
        this.currentDevice.status = 'offline'
        this.portStatus = '关闭'
        this.sensorConnectionStatus = '未连接'
      } else {
        this.currentDevice.status = 'offline'
        this.portStatus = '关闭'
        this.sensorConnectionStatus = '未连接'
      }
      
      console.log('状态更新:', {
        monitoring: this.monitoringStatus,
        dataReceive: this.dataReceiveStatus,
        sensorConnection: this.sensorConnectionStatus,
        deviceStatus: this.currentDevice.status,
        portStatus: this.portStatus
      })
    },

    restartDataManager() {
      // 停止当前的数据管理器
      dataManager.stop()
      this.stopMonitoringStatusCheck()

      // 启动新的数据管理器
      dataManager.start(this.currentDevice.id)
      this.startMonitoringStatusCheck()
    },
    startMonitoring() {
      this.isMonitoring = true
      dataManager.start(this.currentDevice.id)
      this.startMonitoringStatusCheck()
    },
    stopMonitoring() {
      this.isMonitoring = false
      dataManager.stop()
      this.stopMonitoringStatusCheck()
    },
    toggleMonitoring() {
      if (this.isMonitoring) {
        this.stopMonitoring()
      } else {
        this.startMonitoring()
      }
    },
    showHistory() {
      const query = {}
      // 优先 personId，其次 deviceId
      if (this.currentPerson && this.currentPerson.id) query.personId = this.currentPerson.id
      if (this.currentDevice && this.currentDevice.id) query.deviceId = this.currentDevice.id
      if (Object.keys(query).length === 0) {
        showGlobalError('缺少人员或设备标识，无法查看历史数据')
        return
      }
      this.$router.push({ name: 'HistoryIndex', query })
    },
    handleConnectionChange(isConnected) {
      this.connectionStatus = isConnected ? 'connected' : 'disconnected'
      
      if (!isConnected) {
        this.reconnectAttempts = dataManager.retryCount
        // WebSocket断开时，数据接收肯定中断
        this.dataReceiveStatus = '数据中断'
        this.sensorConnectionStatus = '连接异常'
      } else {
        this.reconnectAttempts = 0
        this.lastError = null
        // WebSocket连接成功，但需要等待实际数据来确认传感器状态
        console.log('WebSocket连接成功，等待数据确认传感器状态')
      }
      
      this.updateOverallStatus()
    },
    handleError(error) {
      console.error('数据接收错误:', error)
      this.lastError = error.message || '数据接收失败'
      showGlobalError(this, `数据接收失败: ${this.lastError}`)
    },
    // 测试WebSocket连接
    testWebSocket() {
      console.log('🧪 开始WebSocket连接测试...')
      console.log('当前连接状态:', dataManager.connected)
      console.log('设备ID:', this.currentDevice.id)
      
      // 模拟一个测试数据
      const testData = {
        heartRate: 75,
        respiration: 18,
        bodyMovement: 25,
        presence: 1,
        motion: 1,
        sleep: 0,
        presenceStatus: "有人",
        motionStatus: "运动", 
        sleepStatus: "清醒",
        timestamp: new Date().toISOString()
      }
      
      console.log('🧪 使用测试数据模拟数据接收:', testData)
      this.handleData(testData)
      
      // this.$message.success('测试数据已应用，如果页面更新说明数据处理正常')
    },

    // 测试R60ABD1 API接口
    async testR60ABD1APIs() {
      console.log('🧪 开始测试R60ABD1 API接口...')
      
      try {
        // 1. 测试获取活跃绑定关系
        console.log('📡 测试获取活跃绑定关系API...')
        const mappings = await getActivePersonDeviceMappings()
        console.log('✅ 绑定关系API测试成功:', mappings)
        
        // 2. 测试获取人员实时数据
        if (this.currentPerson.id) {
          console.log('📡 测试获取人员实时数据API...')
          const realtimeData = await getPersonRealtimeData(this.currentPerson.id)
          console.log('✅ 实时数据API测试成功:', realtimeData)
          
          // 如果获取到实时数据，显示在界面上
          if (realtimeData && realtimeData.length > 0) {
            this.handleData(realtimeData[0])
            // this.$message.success('从API获取到实时数据并已显示')
          }
        }
        
        // this.$message.success('R60ABD1 API测试完成，请查看控制台日志')
      } catch (error) {
        console.error('❌ R60ABD1 API测试失败:', error)
        // this.$message.error('API测试失败: ' + error.message)
      }
    },

    // ==================== R60ABD1数据处理（原有方法）====================
    handleData(data) {
      try {
        // 打印接收到的数据进行调试
        // console.log('Vital页面 - 接收到数据:', data)
        
        if (!data || typeof data !== 'object') {
          console.warn('Vital页面 - 数据格式无效:', data)
          return
        }
        
        // 检查数据是否来自当前设备
        const dataDeviceId = data.deviceId
        const currentDeviceId = this.currentDevice.id
        
        if (dataDeviceId && currentDeviceId && dataDeviceId !== currentDeviceId) {
          // console.log(`🚫 Vital页面 - 跳过非当前设备数据: 数据来自 ${dataDeviceId}, 当前设备 ${currentDeviceId}`)
          return
        }
        
        // 记录数据接收时间
        this.lastDataReceiveTime = Date.now()
        this.dataReceiveStatus = '接收中'
        
        // 只要收到数据，就意味着传感器连接正常
        this.sensorConnectionStatus = '已连接'
        this.updateOverallStatus()

        // --- 数据处理节流 ---
        const now = Date.now()
        if (now - this.lastDataUpdate < 100) { return }
        this.lastDataUpdate = now

        // 1. 处理心率数据（固定字段）
        if (data.heartRate !== undefined && data.heartRate !== null) {
          this.heartRate = Number(data.heartRate)
          this.heartStatus = this.evaluateStatus(this.heartRate, 'heart')
          // console.log('✅ 心率:', this.heartRate)
        }
        // 优先使用波形数据，如果不存在则使用单个速率值
        if (data.heartRateWave && Array.isArray(data.heartRateWave)) {
          this.heartWaveform.unshift(...data.heartRateWave)
          if (this.heartWaveform.length > 100) {
            this.heartWaveform.pop()
          }
        } else if (data.heartRate !== undefined) {
          this.heartWaveform.unshift(Number(data.heartRate))
          if (this.heartWaveform.length > 30) {
            this.heartWaveform.pop()
          }
        }

        // 2. 处理呼吸数据（固定字段）
        // DataManager 已经将 breathRate 统一映射为 respiration
        if (data.respiration !== undefined && data.respiration !== null) {
          this.breathRate = Number(data.respiration)
          this.breathStatus = this.evaluateStatus(this.breathRate, 'breath')
          // console.log('✅ 呼吸:', this.breathRate)
        }
        // 优先使用波形数据，如果不存在则使用单个速率值
        if (data.respirationWave && Array.isArray(data.respirationWave)) {
          this.breathWaveform.unshift(...data.respirationWave)
          if (this.breathWaveform.length > 100) {
            this.breathWaveform.pop()
          }
        } else if (data.respiration !== undefined) {
          this.breathWaveform.unshift(Number(data.respiration))
          if (this.breathWaveform.length > 30) {
            this.breathWaveform.pop()
          }
        }

        // 3. 处理体动数据（固定字段）
        if (data.bodyMovement !== undefined && data.bodyMovement !== null) {
          this.motionValue = Number(data.bodyMovement)
          this.motionWaveform.unshift(this.motionValue)
          if (this.motionWaveform.length > 30) {
            this.motionWaveform.pop()
          }
          // console.log('✅ 体动:', this.motionValue)
        }

        // 4. 更新时间戳（固定字段）
        if (data.timestamp) { 
          this.lastUpdateTime = data.timestamp 
        }

        this.lastError = null
        this.initialDataLoaded = true

        // --- 强制UI更新 ---
        this.$nextTick(() => {
          this.$forceUpdate()
        })
      } catch (error) {
        console.error('处理数据失败:', error)
        this.handleError(error)
      }
    },
    calculateAverage(data) {
      if (!data || data.length === 0) return 0
      return Math.round(data.reduce((a, b) => a + b, 0) / data.length)
    },
    normalizeData(data, type = 'resp') {
      if (!data || !Array.isArray(data) || data.length === 0) {
        return []
      }

      // 找到数据范围
      const min = Math.min(...data)
      const max = Math.max(...data)
      const range = max - min

      // 如果范围太小，返回一条平线
      if (range < 0.1) {
        return new Array(data.length).fill(50)
      }

      // 归一化到0-100的范围
      const normalized = data.map(val => {
        const norm = ((val - min) / range) * 100
        return Math.round(norm)
      })

      return normalized
    },
    evaluateStatus(value, type) {
      const numValue = Number(value)
      
      // 数值无效或为0时返回normal(避免误报)
      if (isNaN(numValue) || numValue === 0) {
        return 'normal'
      }
      
      // 呼吸频率评估 (正常范围: 12-20次/分钟)
      if (type === 'breath') {
        if (numValue < 12) return 'slow'  // 呼吸过慢
        if (numValue > 20) return 'fast'  // 呼吸过快
        return 'normal'
      }
      
      // 心率评估 (正常范围: 60-100次/分钟)
      if (type === 'heart') {
        if (numValue < 60) return 'slow'  // 心率过慢(心动过缓)
        if (numValue > 100) return 'fast' // 心率过快(心动过速)
        return 'normal'
      }
      
      // 其他类型默认返回normal
      return 'normal'
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return '未知'

      try {
        // 处理ISO格式的时间字符串
        if (typeof timestamp === 'string') {
          return new Date(timestamp).toLocaleString()
        }

        // 处理数字类型的时间戳
        if (typeof timestamp === 'number') {
          // 检查是毫秒还是秒级时间戳
          const date = timestamp > 10000000000
            ? new Date(timestamp) // 毫秒
            : new Date(timestamp * 1000) // 秒
          return date.toLocaleString()
        }

        // 处理日期对象
        if (timestamp instanceof Date) {
          return timestamp.toLocaleString()
        }

        return String(timestamp)
      } catch (e) {
        console.error('时间格式化错误:', e)
        return String(timestamp)
      }
    },
    // 获取监测状态标签类型
    getMonitoringStatusType(status) {
      const typeMap = {
        '未监测': 'info',
        '监测中': 'success',
        '已停止': 'warning'
      }
      return typeMap[status] || 'info'
    },
    // 获取传感器状态标签类型
    getSensorStatusType(status) {
      const typeMap = {
        '未连接': 'info',
        '已连接': 'success',
        '连接异常': 'danger'
      }
      return typeMap[status] || 'info'
    },
    // 获取数据状态标签类型
    getDataStatusType(status) {
      const typeMap = {
        '无数据': 'info',
        '接收中': 'success',
        '数据中断': 'danger'
      }
      return typeMap[status] || 'info'
    },
    // 断开WebSocket连接
    disconnectWS() {
      try {
        // 停止数据监听
        if (this.dataManager) {
          // 移除事件监听
          this.dataManager.off('dataUpdate', this.handleData)
          this.dataManager.off('connectionChange', this.handleConnectionChange)

          // 停止数据管理器
          this.dataManager.stop()
        }

        // 更新连接状态
        this.connectionStatus = 'disconnected'
        this.portStatus = '关闭'
      } catch (error) {
        console.error('断开WebSocket连接失败:', error)
      }
    }
  }
}
</script>
