<template>
  <div class="vital-monitor-page">
    <!-- 设备和人员选择器 -->
    <DevicePersonSelector
      v-model="currentDevice.id"
      v-model:personId="currentPerson.id"
      deviceTypeFilter="vital"
      @device-change="handleDeviceSwitch"
      @person-change="handlePersonSwitch"
    />

    <!-- 顶部控制栏 -->
    <div class="monitor-header">
      <div class="header-info">
        <h1 class="page-title">呼吸心跳实时监测</h1>
        <div class="status-badges">
          <el-tag :type="getMonitoringStatusType(monitoringStatus)" size="large">
            {{ monitoringStatus }}
          </el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-button-group>
          <el-button 
            :type="isMonitoring ? 'danger' : 'primary'" 
            @click="toggleMonitoring"
            :icon="isMonitoring ? 'VideoPause' : 'VideoPlay'"
          >
            {{ isMonitoring ? '停止监测' : '开始监测' }}
          </el-button>
          <el-button @click="refreshDeviceStatus" icon="Refresh">刷新状态</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="monitor-content">
      <!-- 左侧：波形图和数据 -->
      <div class="main-panel">
        <!-- 实时波形图表 -->
        <div class="chart-card">
          <div class="card-header">
            <h3>实时数据波形</h3>
            <span class="last-update">最后更新: {{ formatTimestamp(lastUpdateTime) }}</span>
          </div>
          <div ref="waveformChart" class="waveform-container"></div>
        </div>

        <!-- 监测状态卡片组 -->
        <div class="metrics-grid">
          <div class="metric-card status-card">
            <div class="metric-header">
              <el-icon class="metric-icon" :size="32" color="#a5b4fc">
                <Monitor />
              </el-icon>
              <span class="metric-title">监测状态</span>
            </div>
            <div class="metric-value-large">
              {{ monitoringStatus === '监测中' ? '有人' : '无人' }}
            </div>
            <div class="metric-footer">
              <el-tag :type="getSensorStatusType(sensorConnectionStatus)" size="small">
                {{ sensorConnectionStatus }}
              </el-tag>
            </div>
          </div>

          <div class="metric-card exception-card">
            <div class="metric-header">
              <el-icon class="metric-icon" :size="32" color="#f87171">
                <Warning />
              </el-icon>
              <span class="metric-title">异常警告</span>
            </div>
            <div class="metric-value-large">
              {{ exceptionCount }}
            </div>
            <div class="metric-footer">
              <span class="metric-label">需要处理的异常</span>
            </div>
          </div>

          <div class="metric-card breath-card">
            <div class="metric-header">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a78bfa'%3E%3Cpath d='M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M12 4L20 12L12 20L4 12L12 4Z'/%3E%3C/svg%3E" 
                   class="metric-icon-img" alt="lungs" />
              <span class="metric-title">呼吸频率</span>
            </div>
            <div class="metric-value-large">
              {{ breathRate }} <span class="unit">次/分</span>
            </div>
            <div class="metric-footer">
              <span :class="['status-indicator', breathStatus]">
                {{ breathStatus === 'slow' ? '过慢' : breathStatus === 'fast' ? '过快' : '正常' }}
              </span>
              <span class="metric-change">{{ breathChangeText }}</span>
            </div>
          </div>

          <div class="metric-card heart-card">
            <div class="metric-header">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f87171'%3E%3Cpath d='M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z'/%3E%3C/svg%3E" 
                   class="metric-icon-img" alt="heart" />
              <span class="metric-title">心率</span>
            </div>
            <div class="metric-value-large">
              {{ heartRate }} <span class="unit">bpm</span>
            </div>
            <div class="metric-footer">
              <span :class="['status-indicator', heartStatus]">
                {{ heartStatus === 'slow' ? '过慢' : (heartStatus === 'fast' ? '过快' : '正常') }}
              </span>
              <span class="metric-change">+3% 较上分钟</span>
            </div>
          </div>
        </div>

        <!-- 异常告警详情 -->
        <div class="alert-panel" v-if="hasActiveExceptions">
          <div class="alert-header">
            <h3>
              <el-icon><Warning /></el-icon>
              异常告警详情
            </h3>
            <el-button type="danger" size="small" text @click="dismissAllAlerts">
              全部处理
            </el-button>
          </div>
          <div class="alert-list">
            <div 
              v-for="exception in activeExceptions" 
              :key="exception.id"
              class="alert-item"
            >
              <div class="alert-content">
                <div class="alert-user">
                  <el-avatar :size="32" class="alert-avatar">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <span class="user-name">{{ currentPerson.name }}</span>
                </div>
                <div class="alert-details">
                  <span class="device-info">{{ currentDevice.name }}</span>
                  <span class="device-info">{{ currentDevice.name }}</span>
                  <span class="alert-reason">{{ exception.explanation }}</span>
                </div>
              </div>
              <el-button 
                type="danger" 
                circle 
                size="small"
                @click="dismissException(exception.id)"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 最近异常警告 (替代原来的通知横幅) -->
        <div class="recent-alerts-card">
          <div class="card-header-small">
            <el-icon class="header-icon" color="#ef4444"><WarningFilled /></el-icon>
            <span>最近异常警告</span>
          </div>
          
          <div class="recent-alert-list" v-if="activeExceptions.length > 0">
            <div 
              v-for="exception in activeExceptions.slice(0, 10)" 
              :key="exception.id" 
              class="mini-alert-item clickable"
              @click="goToAlertPage"
            >
              <span class="alert-time">{{ formatTimestamp(exception.timestamp) }}</span>
              <span class="alert-desc">{{ exception.explanation }}</span>
              <el-icon class="item-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
          <div class="empty-alert" v-else>
            <el-icon color="#10b981"><CircleCheckFilled /></el-icon>
            <span>当前系统运行正常，无异常警告</span>
          </div>
        </div>
      </div>

      <!-- 右侧：用户和设备信息 -->
      <div class="side-panel">
        <!-- 用户信息卡片 -->
        <div class="info-card user-card">
          <div class="card-title">
            <span>用户信息</span>
            <el-dropdown trigger="click" size="small">
              <el-button text circle size="small">
                <el-icon><More /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>查看详情</el-dropdown-item>
                  <el-dropdown-item>编辑信息</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          
          <div class="user-profile">
            <el-avatar :size="80" class="user-avatar" :style="{ opacity: currentPerson.id ? 1 : 0.5 }">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="user-info">
              <h3 class="user-name-title">
                {{ currentPerson.id ? (currentPerson.name || currentPerson.id) : '未绑定人员' }}
              </h3>
              <p class="user-meta">
                {{ currentPerson.id ? `工号: ${currentPerson.id}` : '设备当前未绑定任何人员' }}
              </p>
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <span class="info-label">绑定状态</span>
              <el-tag :type="currentPerson.id ? 'success' : 'info'" size="small">
                {{ currentPerson.id ? '已绑定' : '未绑定' }}
              </el-tag>
            </div>
            <div class="info-item" v-if="currentPerson.id">
              <span class="info-label">用户ID</span>
              <span class="info-value">{{ currentPerson.id }}</span>
            </div>
            <div class="info-item" v-if="currentPerson.id">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ currentPerson.name || currentPerson.id }}</span>
            </div>
            <div class="info-item" v-if="!currentPerson.id">
              <span class="info-label" style="color: #999;">未绑定人员</span>
              <span class="info-value" style="color: #999;">该设备当前没有绑定人员信息</span>
            </div>
            <div class="info-item" v-if="currentPerson.id && currentPerson.gender">
              <span class="info-label">性别</span>
              <span class="info-value">{{ currentPerson.gender }}</span>
            </div>
            <div class="info-item" v-if="currentPerson.id && currentPerson.identity">
              <span class="info-label">身份</span>
              <span class="info-value">{{ currentPerson.identity }}</span>
            </div>
            <div class="info-item" v-if="currentPerson.id && currentPerson.createdAt">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(currentPerson.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 设备信息卡片 -->
        <div class="info-card device-card">
          <div class="card-title">
            <span>设备信息</span>
            <el-dropdown trigger="click" size="small">
              <el-button text circle size="small">
                <el-icon><More /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>查看详情</el-dropdown-item>
                  <el-dropdown-item>设备配置</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="device-icon-container">
            <div class="device-icon">
              <el-icon :size="60" color="#60a5fa">
                <Odometer />
              </el-icon>
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <el-icon class="item-icon" color="#a78bfa"><Cpu /></el-icon>
              <div class="item-content">
                <span class="info-label">设备ID</span>
                <span class="info-value">{{ currentDevice.id || '-' }}</span>
              </div>
            </div>
            <div class="info-item">
              <el-icon class="item-icon" color="#60a5fa"><Monitor /></el-icon>
              <div class="item-content">
                <span class="info-label">设备名称</span>
                <span class="info-value">{{ currentDevice.name || '-' }}</span>
              </div>
            </div>
            <div class="info-item">
              <el-icon class="item-icon" color="#a78bfa"><Setting /></el-icon>
              <div class="item-content">
                <span class="info-label">设备类型</span>
                <span class="info-value">{{ deviceType }}</span>
              </div>
            </div>
            <div class="info-item">
              <el-icon class="item-icon" color="#34d399"><CircleCheck /></el-icon>
              <div class="item-content">
                <span class="info-label">连接状态</span>
                <el-tag 
                  :type="getDeviceStatusType(currentDevice.status)" 
                  size="small"
                >
                  {{ getDeviceStatusText(currentDevice.status) }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <el-icon class="item-icon" color="#f59e0b"><Clock /></el-icon>
              <div class="item-content">
                <span class="info-label">最后更新</span>
                <span class="info-value">{{ formatTimestamp(lastUpdateTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useDeviceStore } from '@/stores/device'
import { showGlobalError } from '@/utils/error-handler'
import dataManager from '@/utils/DataManager'
import { getPersonRealtimeData, createPersonDeviceMapping, getActivePersonDeviceMappings } from '@/api/sensors/r60abd1'
import { getTI6843DeviceRealtimeData, createTI6843VitalWebSocket } from '@/api/sensors/ti6843-vital'
import { getDevicePortConfig, getDeviceType } from '@/utils/deviceConfig'
import * as echarts from 'echarts'
import DevicePersonSelector from '@/components/DevicePersonSelector.vue'
import { 
  Monitor, Warning, User, Close, InfoFilled, More, Cpu, Setting, 
  CircleCheck, Clock, Odometer, VideoPlay, VideoPause, WarningFilled, ArrowRight, CircleCheckFilled, Refresh
} from '@element-plus/icons-vue'

export default {
  name: 'VitalMonitor',
  components: {
    DevicePersonSelector,
    Monitor, Warning, User, Close, InfoFilled, More, Cpu, Setting, 
    CircleCheck, Clock, Odometer, VideoPlay, VideoPause, WarningFilled, ArrowRight, CircleCheckFilled, Refresh
  },
  data() {
    return {
      // dataManager: dataManager, // 移除：避免 Vue 代理 DataManager 单例
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
      noDataTimeout: null, // 无数据检测定时器
      // ECharts实例
      waveformChartInstance: null,
      // 异常告警
      activeExceptions: [],
      exceptionCount: 0
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
    },

    // 是否有活跃异常
    hasActiveExceptions() {
      return this.activeExceptions.length > 0
    },

    // 呼吸变化文本
    breathChangeText() {
      if (this.breathWaveform.length < 2) return '-'
      const current = this.breathRate
      const previous = this.breathWaveform[1] || current
      const change = current - previous
      if (Math.abs(change) < 1) return '稳定'
      return change > 0 ? `+${change.toFixed(0)}` : `${change.toFixed(0)}`
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
            } else {
              dataManager.unsubscribeFromDevice(oldId, this.handleData)
            }
          }

          this.currentDevice.id = newId
          this.updateDevicePortConfig(newId)

          // 建立新设备连接
          dataManager.subscribeToDevice(newId, this.handleData)
          this.restartDataManager()
        }
      },
      immediate: true
    }
  },
  mounted() {
    // 从URL参数或Vuex状态中获取设备和人员信息
    // 🔧 修复：移除默认值'R60ABD1'，让DataManager根据实际设备类型连接正确的WebSocket
    const deviceId = this.$route.query.deviceId || this.currentDeviceId
    const deviceName = this.$route.query.deviceName || '呼吸心跳设备'
    const deviceLocation = this.$route.query.deviceLocation || '房间1'

    // 获取人员信息
    const personId = this.$route.query.personId || ''
    const personName = this.$route.query.personName || '未知用户'
    const mappingName = this.$route.query.mappingName || '默认映射'

    // 初始化ECharts
    this.$nextTick(() => {
      this.initWaveformChart()
      window.addEventListener('resize', this.handleChartResize)
    })

    // 添加日志
    console.log('==================================================')
    console.log('🚀 Vital页面 - 初始化')
    console.log('📋 设备信息:')
    console.log('  - 设备ID:', deviceId || '❌ 未设置（必需）')
    console.log('  - 设备名称:', deviceName)
    console.log('  - 设备位置:', deviceLocation)
    console.log('  - 设备类型:', deviceId ? getDeviceType(deviceId) : '未知')
    console.log('👤 人员信息:')
    console.log('  - 人员ID:', personId || '未设置')
    console.log('  - 人员姓名:', personName)
    console.log('  - 映射名称:', mappingName)
    console.log('==================================================')
    
    // 检查设备ID是否存在
    if (!deviceId) {
      console.error('❌ 致命错误：设备ID未设置！无法建立WebSocket连接')
      console.error('💡 请确保URL包含deviceId参数，例如：?deviceId=TI6843_VITAL_001')
      showGlobalError('设备ID未设置，无法启动监测')
      return
    }

    if (this.$route.query.deviceId && this.$route.query.deviceId !== this.currentDeviceId) {
      this.setCurrentDevice(this.$route.query.deviceId)
    }

    // 设置设备信息（确保deviceId存在）
    if (!deviceId) {
      console.error('❌ 无法设置设备信息：设备ID缺失')
      return
    }
    
    this.currentDevice = {
      id: deviceId,
      name: deviceName,
      location: deviceLocation,
      status: 'offline' // 初始状态为离线
    }
    
    console.log('✅ 设备信息已设置:', this.currentDevice)

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
    if (personId && personId !== '未设置') {
      document.title = `${personName} - 呼吸心跳监测 - 雷达监测系统`
    } else {
      document.title = `呼吸心跳监测 - 雷达监测系统`
    }

    // 更新时间显示
    this.updateCurrentTime()

    // 根据设备类型选择数据源
    const detectedDeviceType = getDeviceType(deviceId)
    console.log('🔍 检测到设备类型:', detectedDeviceType)

    // 统一使用 DataManager 连接
    console.log(`📡 ${detectedDeviceType}设备 - 使用DataManager连接`)
    
    // 直接使用 import 的 dataManager 实例，避免 Vue 代理导致的问题
    // 监听全局数据更新，以处理设备ID不完全匹配的情况
    dataManager.on('dataUpdate', this.handleData)
    
    console.log(`📝 为设备 ${deviceId} 订阅数据`)
    dataManager.subscribeToDevice(deviceId, this.handleData)
    
    dataManager.on('connectionChange', this.handleConnectionChange)
    
    console.log(`📝 当前订阅列表:`, Array.from(dataManager.deviceSubscriptions.keys()))
    
    this.restartDataManager()
  },
  beforeDestroy() {
    console.log('Vital页面 - 销毁')

    // 停止DataManager
    dataManager.stop()
    
    // 移除设备特定的订阅
    if (this.currentDevice && this.currentDevice.id) {
      dataManager.unsubscribeFromDevice(this.currentDevice.id, this.handleData)
    }
    
    // 移除全局事件监听器
    dataManager.off('dataUpdate', this.handleData)
    dataManager.off('connectionChange', this.handleConnectionChange)

    // 停止监测状态检测
    this.stopMonitoringStatusCheck()
    // 清除计时器和动画帧
    if (this.updateTimer) clearTimeout(this.updateTimer)
    if (this.renderRequestId) cancelAnimationFrame(this.renderRequestId)

    // 销毁ECharts实例
    if (this.waveformChartInstance) {
      this.waveformChartInstance.dispose()
      this.waveformChartInstance = null
    }
    window.removeEventListener('resize', this.handleChartResize)
  },
  methods: {
    ...mapActions(useDeviceStore, ['setCurrentDevice']),
    updateCurrentTime() {
      this.currentTime = new Date().toLocaleString()
    },
    // 动态更新页面标题
    updatePageTitle() {
      if (this.currentPerson.id && this.currentPerson.name) {
        document.title = `${this.currentPerson.name} - 呼吸心跳监测 - 雷达监测系统`
      } else if (this.currentPerson.id) {
        document.title = `${this.currentPerson.id} - 呼吸心跳监测 - 雷达监测系统`
      } else {
        document.title = `呼吸心跳监测 - 雷达监测系统`
      }
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
      // ... existing code ...
    },
    
    // 跳转到异常告警页面
    goToAlertPage() {
      this.$router.push('/alert/vitals')
    },

    // 切换监测状态
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
    async refreshDeviceStatus() {
      console.log('🔄 开始刷新设备状态...')
      
      try {
        // 显示加载提示
        const loadingInstance = this.$loading({
          lock: true,
          text: '正在刷新设备状态...',
          background: 'rgba(0, 0, 0, 0.7)'
        })

        // 触发DevicePersonSelector组件重新获取设备列表
        // 通过发射事件来通知子组件刷新
        this.$root.$emit('refresh-device-list')
        
        // 等待一小段时间让数据更新
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        loadingInstance.close()
        this.$message.success('设备状态已刷新')
        console.log('✅ 设备状态刷新完成')
      } catch (error) {
        console.error('❌ 刷新设备状态失败:', error)
        this.$message.error('刷新失败，请稍后再试')
      }
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
        // 调试日志：确认 handleData 被调用
        console.log('==========================================')
        console.log('✅ Vital页面 - handleData被调用')
        console.log('设备ID:', data?.deviceId)
        console.log('心率:', data?.heartRate)
        console.log('呼吸:', data?.respiration, data?.breathRate)
        console.log('完整数据:', data)
        console.log('==========================================')

        if (!data || typeof data !== 'object') {
          console.warn('Vital页面 - 数据格式无效:', data)
          return
        }
        
        // 检查数据是否来自当前设备
        const dataDeviceId = data.deviceId
        const currentDeviceId = this.currentDevice.id
        
        console.log('🔍 设备ID匹配检查:')
        console.log('   数据设备ID:', dataDeviceId)
        console.log('   当前设备ID:', currentDeviceId)
        console.log('   当前人员ID:', this.currentPerson.id)
        
        // 宽松匹配设备ID：支持 R60ABD1, TI6843_VITAL 等多种设备
        let isMatch = false
        
        // 特殊情况：如果当前设备ID看起来像人员ID（如RD002），而数据有设备ID
        // 则认为这是第一次接收数据，应该接受并更新订阅
        const currentIdLooksLikePersonId = currentDeviceId && !currentDeviceId.includes('R60ABD1') && 
                                           !currentDeviceId.includes('TI6843') && 
                                           !currentDeviceId.includes('COM')
        
        if (currentIdLooksLikePersonId && dataDeviceId) {
          console.log('⚠️ 检测到当前订阅的可能是人员ID，接受数据并更新订阅')
          isMatch = true
        } else if (dataDeviceId === currentDeviceId) {
          // 完全匹配
          console.log('✅ 设备ID完全匹配')
          isMatch = true
        } else if (dataDeviceId && currentDeviceId) {
          // 前缀匹配：处理 R60ABD1 vs R60ABD1_COM3, TI6843_VITAL vs TI6843_VITAL_001 的情况
          if (dataDeviceId.startsWith(currentDeviceId + '_') || 
              currentDeviceId.startsWith(dataDeviceId + '_')) {
            console.log('✅ 设备ID前缀匹配')
            isMatch = true
          }
          // 特殊处理：TI6843_VITAL 匹配 TI6843 (如果当前设备类型是VITAL)
          else if (currentDeviceId.toUpperCase().includes('TI6843') && 
                   dataDeviceId.toUpperCase().includes('TI6843') &&
                   currentDeviceId.toUpperCase().includes('VITAL') && 
                   dataDeviceId.toUpperCase().includes('VITAL')) {
            console.log('✅ TI6843_VITAL设备匹配')
            isMatch = true
          }
          // 特殊处理：R60ABD1 通用匹配
          else if (currentDeviceId.toUpperCase().includes('R60ABD1') && 
                   dataDeviceId.toUpperCase().includes('R60ABD1')) {
            console.log('✅ R60ABD1设备通用匹配')
            isMatch = true
          }
        }

        if (dataDeviceId && currentDeviceId && !isMatch) {
          console.log(`🚫 Vital页面 - 跳过非当前设备数据`)
          console.log(`   数据来自: ${dataDeviceId}`)
          console.log(`   当前设备: ${currentDeviceId}`)
          return
        }
        
        if (isMatch) {
          console.log('✅ 设备匹配成功，继续处理数据')
        }

        // 如果检测到更具体的设备ID，更新当前设备ID
        if (isMatch && dataDeviceId && dataDeviceId !== currentDeviceId) {
          console.log(`🔄 更新设备ID: ${currentDeviceId} -> ${dataDeviceId}`)
          
          // 取消旧的订阅
          dataManager.unsubscribeFromDevice(currentDeviceId, this.handleData)
          
          // 订阅新的设备ID
          dataManager.subscribeToDevice(dataDeviceId, this.handleData)
          
          // 更新设备信息
          this.currentDevice.id = dataDeviceId
          this.updateDevicePortConfig(dataDeviceId)
          
          console.log(`✅ 已重新订阅设备: ${dataDeviceId}`)
        }

        // 更新人员信息（根据WebSocket数据）
        if (data.personId !== undefined) {
          // 如果personId存在且不为空
          if (data.personId && data.personId.trim() !== '') {
            // 更新或设置人员ID
            if (this.currentPerson.id !== data.personId) {
              console.log(`👤 更新人员ID: ${this.currentPerson.id || '无'} -> ${data.personId}`)
              this.currentPerson.id = data.personId
              // 如果没有名字，暂时用ID代替
              if (!this.currentPerson.name || this.currentPerson.name === '未知用户' || this.currentPerson.name === '未绑定人员') {
                this.currentPerson.name = data.personId
              }
            }
          } else {
            // personId为空，表示设备未绑定人员
            if (this.currentPerson.id) {
              console.log(`👤 设备未绑定人员，清除人员信息`)
            }
            this.currentPerson.id = ''
            this.currentPerson.name = ''
          }
          
          // 动态更新页面标题
          this.updatePageTitle()
        }
        
        // 记录数据接收时间
        this.lastDataReceiveTime = Date.now()
        this.dataReceiveStatus = '接收中'
        
        // 只要收到数据，就意味着传感器连接正常
        this.sensorConnectionStatus = '已连接'
        this.updateOverallStatus()

        // --- 数据处理节流 ---
        const now = Date.now()
        if (now - this.lastDataUpdate < 50) { 
          console.log('⏱️ 数据处理节流，跳过本次更新')
          return 
        }
        this.lastDataUpdate = now
        console.log('⏱️ 开始处理数据...')

        // 1. 处理心率数据（固定字段）
        if (data.heartRate !== undefined && data.heartRate !== null) {
          const newHeartRate = Number(data.heartRate)
          console.log('💓 更新心率:', this.heartRate, '->', newHeartRate)
          this.heartRate = newHeartRate
          this.heartStatus = this.evaluateStatus(this.heartRate, 'heart')
        }
        // 优先使用波形数据，如果不存在则使用单个速率值
        // 从右往左显示：新数据添加到数组开头，旧数据从末尾删除
        if (data.heartRateWave && Array.isArray(data.heartRateWave)) {
          this.heartWaveform.unshift(...data.heartRateWave.reverse())
          if (this.heartWaveform.length > 100) {
            this.heartWaveform.splice(100)
          }
          console.log('📊 更新心率波形（右→左），长度:', this.heartWaveform.length)
        } else if (data.heartRate !== undefined) {
          this.heartWaveform.unshift(Number(data.heartRate))
          if (this.heartWaveform.length > 30) {
            this.heartWaveform.pop()
          }
          console.log('📊 添加心率数据点（右→左），长度:', this.heartWaveform.length)
        }

        // 2. 处理呼吸数据（固定字段）
        // DataManager 已经将 breathRate 统一映射为 respiration
        // 同时支持 respiration 和 breathRate 字段
        const respirationValue = data.respiration || data.breathRate
        if (respirationValue !== undefined && respirationValue !== null) {
          const newBreathRate = Number(respirationValue)
          console.log('🫁 更新呼吸:', this.breathRate, '->', newBreathRate)
          this.breathRate = newBreathRate
          this.breathStatus = this.evaluateStatus(this.breathRate, 'breath')
        }
        // 优先使用波形数据，如果不存在则使用单个速率值
        // 从右往左显示：新数据添加到数组开头，旧数据从末尾删除
        const breathValue = data.respiration || data.breathRate
        if (data.respirationWave && Array.isArray(data.respirationWave)) {
          this.breathWaveform.unshift(...data.respirationWave.reverse())
          if (this.breathWaveform.length > 100) {
            this.breathWaveform.splice(100)
          }
          console.log('📊 更新呼吸波形（右→左），长度:', this.breathWaveform.length)
        } else if (breathValue !== undefined) {
          this.breathWaveform.unshift(Number(breathValue))
          if (this.breathWaveform.length > 30) {
            this.breathWaveform.pop()
          }
          console.log('📊 添加呼吸数据点（右→左），长度:', this.breathWaveform.length)
        }

        // 3. 处理体动数据（固定字段）
        if (data.bodyMovement !== undefined && data.bodyMovement !== null) {
          this.motionValue = Number(data.bodyMovement)
          this.motionWaveform.push(this.motionValue)
          if (this.motionWaveform.length > 30) {
            this.motionWaveform.shift()
          }
          // console.log('✅ 体动:', this.motionValue)
        }

        // 4. 更新时间戳（固定字段）
        if (data.timestamp) { 
          this.lastUpdateTime = data.timestamp 
        }

        this.lastError = null
        this.initialDataLoaded = true

        console.log('📊 当前数据状态:')
        console.log('   心率:', this.heartRate, '状态:', this.heartStatus)
        console.log('   呼吸:', this.breathRate, '状态:', this.breathStatus)
        console.log('   体动:', this.motionValue)

        // 更新图表
        this.updateWaveformChart()
        console.log('✅ 图表已更新')

        // 检查异常
        this.checkForExceptions()

        // --- 强制UI更新 ---
        this.$nextTick(() => {
          this.$forceUpdate()
          console.log('✅ UI已强制更新')
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
        // 移除事件监听
        dataManager.off('dataUpdate', this.handleData)
        dataManager.off('connectionChange', this.handleConnectionChange)

        // 停止数据管理器
        dataManager.stop()

        // 更新连接状态
        this.connectionStatus = 'disconnected'
        this.portStatus = '关闭'
      } catch (error) {
        console.error('断开WebSocket连接失败:', error)
      }
    },

    // ====================  ECharts图表相关 ====================
    initWaveformChart() {
      if (!this.$refs.waveformChart) return
      
      this.waveformChartInstance = echarts.init(this.$refs.waveformChart)
      
      const option = {
        backgroundColor: 'transparent',
        title: {
          text: '实时生命体征波形',
          left: 'center',
          textStyle: {
            color: '#374151',
            fontSize: 16,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        legend: {
          data: ['心率', '呼吸频率'],
          top: 35,
          textStyle: {
            color: '#6b7280'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: 80,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: Array.from({ length: 30 }, (_, i) => i),
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          },
          axisLabel: {
            show: false  // 隐藏X轴标签，避免负数显示的逻辑混乱
          },
          axisTick: {
            show: false
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '心率(bpm)',
            position: 'left',
            min: 0,
            max: 120,
            interval: 20,
            axisLine: {
              show: true,
              lineStyle: {
                color: '#f87171'
              }
            },
            axisLabel: {
              color: '#9ca3af'
            },
            splitLine: {
              lineStyle: {
                color: '#f3f4f6'
              }
            }
          },
          {
            type: 'value',
            name: '呼吸(次/分)',
            position: 'right',
            min: 0,
            max: 30,
            interval: 5,
            axisLine: {
              show: true,
              lineStyle: {
                color: '#a78bfa'
              }
            },
            axisLabel: {
              color: '#9ca3af'
            },
            splitLine: {
              show: false
            }
          }
        ],
        series: [
          {
            name: '心率',
            type: 'line',
            smooth: true,
            symbol: 'none',
            sampling: 'lttb',
            itemStyle: {
              color: '#f87171'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(248, 113, 113, 0.3)' },
                { offset: 1, color: 'rgba(248, 113, 113, 0.05)' }
              ])
            },
            data: new Array(30).fill(0),
            yAxisIndex: 0
          },
          {
            name: '呼吸频率',
            type: 'line',
            smooth: true,
            symbol: 'none',
            sampling: 'lttb',
            itemStyle: {
              color: '#a78bfa'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(167, 139, 250, 0.3)' },
                { offset: 1, color: 'rgba(167, 139, 250, 0.05)' }
              ])
            },
            data: new Array(30).fill(0),
            yAxisIndex: 1
          }
        ]
      }
      
      this.waveformChartInstance.setOption(option)
    },

    updateWaveformChart() {
      if (!this.waveformChartInstance) {
        console.warn('⚠️ ECharts实例不存在，无法更新图表')
        return
      }

      // 确保数据是数组且不为空
      let heartData = Array.isArray(this.heartWaveform) ? [...this.heartWaveform] : []
      let breathData = Array.isArray(this.breathWaveform) ? [...this.breathWaveform] : []

      console.log('📊 原始波形数据:')
      console.log('   心率波形长度:', heartData.length, '数据:', heartData.slice(0, 5))
      console.log('   呼吸波形长度:', breathData.length, '数据:', breathData.slice(0, 5))

      // 如果数据为空或全部为0，使用当前速率值
      if (heartData.length === 0 || heartData.every(v => v === 0)) {
        if (this.heartRate > 0) {
          heartData = Array(30).fill(this.heartRate)
          console.log('⚠️ 心率波形为空，使用当前速率值填充:', this.heartRate)
        }
      }

      if (breathData.length === 0 || breathData.every(v => v === 0)) {
        if (this.breathRate > 0) {
          breathData = Array(30).fill(this.breathRate)
          console.log('⚠️ 呼吸波形为空，使用当前速率值填充:', this.breathRate)
        }
      }

      // 确保数据长度为30，取前30个点（最新的数据在开头）
      if (heartData.length > 30) {
        heartData = heartData.slice(0, 30)
      }
      if (breathData.length > 30) {
        breathData = breathData.slice(0, 30)
      }

      // 填充不足的数据（在末尾填充0）
      while (heartData.length < 30) heartData.push(0)
      while (breathData.length < 30) breathData.push(0)

      // 从右往左显示：最新数据在左边（数组开头）

      console.log('📊 更新ECharts图表数据（右→左）:')
      console.log('   处理后心率:', heartData.slice(0, 5))
      console.log('   处理后呼吸:', breathData.slice(0, 5))

      try {
        this.waveformChartInstance.setOption({
          series: [
            { data: heartData },
            { data: breathData }
          ]
        }, false, true) // notMerge=false, lazyUpdate=true
        console.log('✅ ECharts图表更新完成')
      } catch (error) {
        console.error('❌ ECharts更新失败:', error)
      }
    },

    handleChartResize() {
      if (this.waveformChartInstance) {
        this.waveformChartInstance.resize()
      }
    },

    // ==================== UI辅助方法 ====================
    getDeviceStatusType(status) {
      const typeMap = {
        'online': 'success',
        'offline': 'danger',
        'maintenance': 'warning'
      }
      return typeMap[status] || 'info'
    },

    getDeviceStatusText(status) {
      const textMap = {
        'online': '在线',
        'offline': '离线',
        'maintenance': '维护中'
      }
      return textMap[status] || '未知'
    },

    formatDate(date) {
      if (!date) return '-'
      try {
        return new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      } catch (e) {
        return '-'
      }
    },

    // ==================== 异常告警管理 ====================
    checkForExceptions() {
      const newExceptions = []

      // 检查心率异常
      if (this.heartRate > 100) {
        newExceptions.push({
          id: 'high_heart_rate',
          type: 'heart',
          explanation: `心率过高: ${this.heartRate} bpm (正常范围: 60-100)`
        })
      } else if (this.heartRate < 60 && this.heartRate > 0) {
        newExceptions.push({
          id: 'low_heart_rate',
          type: 'heart',
          explanation: `心率过低: ${this.heartRate} bpm (正常范围: 60-100)`
        })
      }

      // 检查呼吸异常
      if (this.breathRate > 20) {
        newExceptions.push({
          id: 'high_breath_rate',
          type: 'breath',
          explanation: `呼吸频率过高: ${this.breathRate} 次/分 (正常范围: 12-20)`
        })
      } else if (this.breathRate < 12 && this.breathRate > 0) {
        newExceptions.push({
          id: 'low_breath_rate',
          type: 'breath',
          explanation: `呼吸频率过低: ${this.breathRate} 次/分 (正常范围: 12-20)`
        })
      }

      this.activeExceptions = newExceptions
      this.exceptionCount = newExceptions.length
    },

    dismissException(id) {
      this.activeExceptions = this.activeExceptions.filter(e => e.id !== id)
      this.exceptionCount = this.activeExceptions.length
    },

    dismissAllAlerts() {
      this.activeExceptions = []
      this.exceptionCount = 0
    },

    // ==================== 设备和人员切换处理 ====================
    handleDeviceSwitch({ deviceId, device, personId }) {
      console.log('🔄 切换到设备:', deviceId, '人员:', personId)
      
      // 停止当前订阅
      if (this.currentDevice.id && this.currentDevice.id !== deviceId) {
        dataManager.unsubscribeFromDevice(this.currentDevice.id, this.handleData)
      }
      
      // 更新设备信息
      this.currentDevice = {
        id: deviceId,
        name: device?.name || deviceId,
        location: device?.location || '未知位置',
        status: device?.status || 'offline'
      }
      
      // 更新人员信息
      if (personId) {
        this.currentPerson = {
          id: personId,
          name: device?.personName || '未知用户'
        }
      } else {
        this.currentPerson = {
          id: '',
          name: '未绑定人员'
        }
      }
      
      // 更新端口配置
      this.updateDevicePortConfig(deviceId)
      
      // 订阅新设备数据
      dataManager.subscribeToDevice(deviceId, this.handleData)
      
      // 尝试获取缓存数据
      const cachedData = dataManager.getDeviceData(deviceId)
      if (cachedData) {
        console.log('📦 使用缓存数据初始化页面')
        this.handleData(cachedData)
      } else {
        console.log('⏳ 等待设备数据...')
        // 重置数据显示
        this.breathRate = 0
        this.heartRate = 0
        this.motionValue = 0
        this.breathWaveform = []
        this.heartWaveform = []
        this.motionWaveform = []
      }
      
      // 更新页面标题
      this.updatePageTitle()
      
      // 更新URL参数（不刷新页面）
      this.$router.replace({
        query: {
          ...this.$route.query,
          deviceId: deviceId,
          deviceName: this.currentDevice.name,
          deviceLocation: this.currentDevice.location,
          personId: personId || undefined,
          personName: this.currentPerson.name || undefined
        }
      })
    },

    handlePersonSwitch({ personId, person, deviceId }) {
      console.log('🔄 切换到人员:', personId, '设备:', deviceId)
      
      // 人员切换会自动触发设备切换，由handleDeviceSwitch处理
      if (person) {
        this.currentPerson = {
          id: personId,
          name: person.name || personId
        }
        this.updatePageTitle()
      }
    }
  }
}
</script>

<style scoped>
.vital-monitor-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fb 0%, #e8eef5 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部控制栏 */
.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.status-badges {
  display: flex;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区域 */
.monitor-content {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
}

/* 主面板 */
.main-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%; /* 填满父容器高度 */
}

/* 图表卡片 */
.chart-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.8);
  /* flex: 1; Removed */
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.last-update {
  font-size: 14px;
  color: #9ca3af;
}

.waveform-container {
  width: 100%;
  /* flex: 1; Removed */
  height: 350px; /* Fixed height */
}

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.metric-icon-img {
  width: 32px;
  height: 32px;
}

.metric-title {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.metric-value-large {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.unit {
  font-size: 14px;
  font-weight: 400;
  color: #9ca3af;
  margin-left: 4px;
}

.metric-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.metric-label {
  color: #9ca3af;
}

.metric-change {
  color: #059669;
  font-weight: 600;
}

.status-indicator {
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
}

.status-indicator.normal {
  background: #d1fae5;
  color: #059669;
}

.status-indicator.slow {
  background: #dbeafe;
  color: #2563eb;
}

.status-indicator.fast {
  background: #fee2e2;
  color: #dc2626;
}

/* 异常告警面板 */
.recent-alerts-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  /* cursor: pointer; */
  transition: all 0.3s ease;
  /* margin-top: auto; Removed for consistency */
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.recent-alerts-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  border-color: #fca5a5;
}

.card-header-small {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 15px;
}

.header-icon {
  font-size: 18px;
}

.arrow-icon {
  margin-left: auto;
  color: #9ca3af;
  font-size: 14px;
}

.recent-alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

.mini-alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fef2f2;
  border-radius: 6px;
  font-size: 13px;
  color: #7f1d1d;
}

.mini-alert-item.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.mini-alert-item.clickable:hover {
  background-color: #fee2e2;
}

.item-arrow {
  margin-left: auto;
  font-size: 12px;
  color: #9ca3af;
}

.alert-time {
  color: #991b1b;
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
}

.alert-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-alert {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #ecfdf5;
  border-radius: 6px;
  color: #059669;
  font-size: 13px;
  flex: 1;
}

.alert-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #fecaca;
  border-left: 4px solid #ef4444;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.alert-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-size: 16px;
  font-weight: 600;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: #fef2f2;
  border-radius: 10px;
  border: 1px solid #fecaca;
}

.alert-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-avatar {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
}

.user-name {
  font-weight: 600;
  color: #374151;
}

.alert-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-info {
  font-size: 13px;
  color: #6b7280;
}

.alert-reason {
  font-size: 14px;
  color: #dc2626;
  font-weight: 500;
}

/* 通知横幅 - 已移除，样式保留以防万一 */
.notification-banner-removed {
  display: none;
}

/* 侧边面板 */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-weight: 600;
  color: #374151;
  font-size: 16px;
}

/* 用户信息 */
.user-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.user-avatar {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
  font-size: 32px;
}

.user-info {
  text-align: center;
}

.user-name-title {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #111827;
}

.user-meta {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

/* 设备图标 */
.device-icon-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.device-icon {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(147, 197, 253, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
  border-bottom: none;
}

.item-icon {
  margin-right: 12px;
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

/* 响应式布局 */
@media (max-width: 1280px) {
  .monitor-content {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .waveform-container {
    height: 250px;
  }
}
</style>
