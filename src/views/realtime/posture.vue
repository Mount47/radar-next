<template>
  <div class="posture-monitor-page">
    <!-- 设备和人员选择器 -->
    <DevicePersonSelector
      v-model="currentDevice.deviceId"
      v-model:personId="currentPerson.id"
      deviceTypeFilter="posture"
      @device-change="handleDeviceSwitch"
      @person-change="handlePersonSwitch"
    />

    <!-- 顶部控制栏 -->
    <div class="monitor-header">
      <div class="header-info">
        <h1 class="page-title">人体位姿实时监测</h1>
        <div class="status-badges">
          <el-tag :type="getMonitoringStatusType(monitoringStatus)" size="large">
            {{ monitoringStatus }}
          </el-tag>
          <el-tag v-if="postureStatus" :type="getPostureTagType(postureStatus)" size="large">
            {{ getPostureText(postureStatus) }}
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
          <el-button @click="showHistory" icon="Clock">历史数据</el-button>
          <el-button @click="resetCamera" icon="Refresh">重置视角</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="monitor-content">
      <!-- 左侧：3D可视化 -->
      <div class="main-panel">
        <!-- 3D点云图 -->
        <div class="visualization-card">
          <div class="card-header">
            <h3>3D实时监测</h3>
            <div class="view-controls">
              <el-radio-group v-model="viewMode" size="small">
                <el-radio-button v-for="mode in viewModes" :key="mode.value" :label="mode.value">
                  {{ mode.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="visualization-container" ref="threeContainer"></div>
        </div>

        <!-- 位姿状态卡片 -->
        <div class="posture-status-card">
          <div class="status-header">
            <h3>人体位姿状态</h3>
            <el-tag :type="getMonitoringStatusType(monitoringStatus)" size="large">
              {{ monitoringStatus }}
            </el-tag>
          </div>
          
          <!-- 当前状态展示区 -->
          <div class="current-posture-section">
            <div class="posture-icon-container">
              <div class="posture-icon-large">
                <div v-if="postureStatus === 'sitting'" class="icon-sitting">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="20" r="10"/>
                    <rect x="45" y="30" width="10" height="25" rx="5"/>
                    <rect x="35" y="35" width="15" height="8" rx="4" transform="rotate(-45 42.5 39)"/>
                    <rect x="50" y="35" width="15" height="8" rx="4" transform="rotate(45 57.5 39)"/>
                    <rect x="40" y="55" width="20" height="10" rx="5"/>
                    <rect x="38" y="65" width="8" height="20" rx="4"/>
                    <rect x="54" y="65" width="8" height="20" rx="4"/>
                  </svg>
                </div>
                <div v-else-if="postureStatus === 'standing'" class="icon-standing">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="15" r="10"/>
                    <rect x="45" y="25" width="10" height="35" rx="5"/>
                    <rect x="35" y="30" width="15" height="8" rx="4" transform="rotate(-20 42.5 34)"/>
                    <rect x="50" y="30" width="15" height="8" rx="4" transform="rotate(20 57.5 34)"/>
                    <rect x="43" y="60" width="7" height="30" rx="3.5"/>
                    <rect x="50" y="60" width="7" height="30" rx="3.5"/>
                  </svg>
                </div>
                <div v-else-if="postureStatus === 'walking'" class="icon-walking">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="15" r="10"/>
                    <rect x="45" y="25" width="10" height="30" rx="5" transform="rotate(5 50 40)"/>
                    <rect x="33" y="28" width="15" height="8" rx="4" transform="rotate(-30 40.5 32)"/>
                    <rect x="52" y="32" width="15" height="8" rx="4" transform="rotate(40 59.5 36)"/>
                    <rect x="40" y="55" width="8" height="28" rx="4" transform="rotate(20 44 69)"/>
                    <rect x="48" y="55" width="8" height="28" rx="4" transform="rotate(-15 52 69)"/>
                  </svg>
                </div>
                <div v-else-if="postureStatus === 'raising_hand'" class="icon-raising-hand">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="15" r="10"/>
                    <rect x="45" y="25" width="10" height="35" rx="5"/>
                    <rect x="35" y="30" width="15" height="8" rx="4" transform="rotate(-70 42.5 34)"/>
                    <rect x="50" y="30" width="15" height="8" rx="4" transform="rotate(20 57.5 34)"/>
                    <rect x="43" y="60" width="7" height="30" rx="3.5"/>
                    <rect x="50" y="60" width="7" height="30" rx="3.5"/>
                  </svg>
                </div>
                <div v-else-if="postureStatus === 'fall'" class="icon-fall">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="30" cy="50" r="10"/>
                    <rect x="40" y="45" width="35" height="10" rx="5"/>
                    <rect x="40" y="40" width="8" height="15" rx="4" transform="rotate(-45 44 47.5)"/>
                    <rect x="67" y="40" width="8" height="15" rx="4" transform="rotate(45 71 47.5)"/>
                    <rect x="55" y="55" width="10" height="20" rx="5" transform="rotate(30 60 65)"/>
                    <rect x="65" y="55" width="10" height="20" rx="5" transform="rotate(-10 70 65)"/>
                  </svg>
                </div>
                <div v-else class="icon-unknown">
                  <el-icon><QuestionFilled /></el-icon>
                </div>
              </div>
            </div>
            
            <div class="posture-details">
              <div class="current-state-label">
                <span class="label-text">当前状态</span>
              </div>
              <div class="current-state-value">
                <span :class="['state-text', 'state-' + postureStatus]">
                  {{ getPostureText(postureStatus) }}
                </span>
              </div>
              <div class="state-duration">
                <el-icon class="duration-icon"><Timer /></el-icon>
                <span class="duration-text">持续时长: {{ formatDuration(currentStateDuration) }}</span>
              </div>
            </div>
          </div>

          <!-- 状态历史时间轴 -->
          <div class="posture-timeline-section">
            <div class="timeline-header">
              <span class="timeline-title">状态历史时间轴</span>
              <span class="timeline-subtitle">（最近{{ postureHistoryTimeWindow / 60000 }}分钟）</span>
            </div>
            
            <div class="timeline-container" v-if="postureHistory.length > 0">
              <div class="timeline-track">
                <div 
                  v-for="(item, index) in displayPostureHistory" 
                  :key="index"
                  class="timeline-item"
                  :class="'timeline-' + item.status"
                  :style="{ width: item.widthPercent + '%' }"
                  :title="`${getPostureText(item.status)} - ${formatDuration(item.duration)}`"
                >
                  <div class="timeline-content">
                    <span class="timeline-emoji">{{ getPostureEmoji(item.status) }}</span>
                    <span class="timeline-duration">{{ formatShortDuration(item.duration) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="timeline-legend">
                <div 
                  v-for="(item, index) in displayPostureHistory" 
                  :key="'legend-' + index"
                  class="legend-item"
                >
                  <span class="legend-emoji">{{ getPostureEmoji(item.status) }}</span>
                  <span class="legend-text">{{ getPostureText(item.status) }}</span>
                  <el-icon class="legend-arrow" v-if="index < displayPostureHistory.length - 1"><Right /></el-icon>
                </div>
              </div>
            </div>
            
            <div class="timeline-empty" v-else>
              <el-icon class="empty-icon"><Clock /></el-icon>
              <span class="empty-text">暂无历史记录，开始监测后将显示状态变化</span>
            </div>
          </div>

          <!-- 全部状态卡片 -->
          <div class="all-states-section">
            <div class="states-grid">
              <div 
                v-for="state in allPostureStates" 
                :key="state.value"
                class="state-card"
                :class="{ 
                  'state-active': postureStatus === state.value,
                  ['state-card-' + state.value]: true
                }"
              >
                <div class="state-card-icon">{{ state.emoji }}</div>
                <div class="state-card-name">{{ state.name }}</div>
                <div class="state-card-count" v-if="getStateCount(state.value) > 0">
                  今日 {{ getStateCount(state.value) }} 次
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 异常告警 -->
        <div class="alert-panel" v-if="activeFallAlerts.length > 0">
          <div class="alert-header">
            <h3>
              <el-icon><Warning /></el-icon>
              跌倒告警详情
            </h3>
            <el-button type="danger" size="small" @click="viewAllAlerts">
              查看全部 ({{ activeFallAlerts.length }})
            </el-button>
          </div>
          <div class="alert-list">
            <div 
              v-for="alert in activeFallAlerts.slice(0, 3)" 
              :key="alert.id"
              class="alert-item fall-alert"
            >
              <div class="alert-content">
                <div class="alert-user">
                  <el-avatar :size="32" class="alert-avatar">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <div class="alert-user-info">
                    <span class="user-name">{{ alert.personName || currentPerson.name }}</span>
                    <span class="alert-time">{{ formatAlertTime(alert.createdAt) }}</span>
                  </div>
                </div>
                <div class="alert-details">
                  <span class="device-info">设备: {{ alert.deviceId || currentDevice.deviceId }}</span>
                  <span class="alert-location">位置: {{ alert.location || currentDevice.location }}</span>
                </div>
              </div>
              <div class="alert-actions">
                <el-button type="warning" size="small" @click="handleMarkPending(alert)">
                  待处理
                </el-button>
                <el-button type="success" size="small" @click="handleMarkResolved(alert)">
                  已解决
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近异常警告 (替代原来的通知横幅) -->
        <div class="recent-alerts-card">
          <div class="card-header-small">
            <el-icon class="header-icon" color="#ef4444"><WarningFilled /></el-icon>
            <span>最近异常警告</span>
          </div>
          
          <div class="recent-alert-list" v-if="activeFallAlerts.length > 0">
            <div 
              v-for="alert in activeFallAlerts.slice(0, 10)" 
              :key="alert.id" 
              class="mini-alert-item clickable"
              @click="goToAlertDetail(alert)"
            >
              <span class="alert-time">{{ formatTime(alert.createdAt) }}</span>
              <span class="alert-desc">
                {{ alert.personName || '未知人员' }} - {{ alert.location || '未知位置' }} 发生跌倒
              </span>
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
            <el-avatar :size="80" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="user-info">
              <h3 class="user-name-title">{{ currentPerson.name || '未知用户' }}</h3>
              <p class="user-meta">工号: {{ currentPerson.id || '-' }}</p>
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <span class="info-label">用户ID</span>
              <span class="info-value">{{ currentPerson.id || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ currentPerson.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">性别</span>
              <span class="info-value">{{ currentPerson.gender || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">身份</span>
              <span class="info-value">{{ currentPerson.identity || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatTime(currentPerson.createdAt) }}</span>
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
              <el-icon :size="60" color="#a78bfa">
                <Coordinate />
              </el-icon>
            </div>
          </div>

          <div class="info-list">
            <div class="info-item">
              <el-icon class="item-icon" color="#a78bfa"><Cpu /></el-icon>
              <div class="item-content">
                <span class="info-label">设备ID</span>
                <span class="info-value">{{ currentDevice.deviceId || '-' }}</span>
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
                <span class="info-value">{{ currentDevice.modelType || 'TI6843-POSTURE' }}</span>
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
                <span class="info-value">{{ formatTime(lastUpdateTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
} from '@/api/sensors/ti6843-posture'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
} from '@/api/alerts/fall-alert'
import DevicePersonSelector from '@/components/DevicePersonSelector.vue'
import { 
  VideoPlay, VideoPause, Clock, Refresh, ArrowDown, View, Grid, LocationFilled, Location,
  Warning, User, InfoFilled, Close, More, Cpu, Monitor, Setting, 
  CircleCheck, Coordinate, QuestionFilled, WarningFilled, ArrowRight, CircleCheckFilled,
  Timer, Right
} from '@element-plus/icons-vue'

export default {
  name: 'PostureMonitor',
  components: {
    DevicePersonSelector,
    VideoPlay, VideoPause, Clock, Refresh, ArrowDown, View, Grid, LocationFilled, Location,
    Warning, User, InfoFilled, Close, More, Cpu, Monitor, Setting, 
    CircleCheck, Coordinate, QuestionFilled, WarningFilled, ArrowRight, CircleCheckFilled,
    Timer, Right
  },
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

      // 3D Visualization
      viewMode: 'all', // 'all', 'pointcloud', 'keypoints', 'trajectory'
      viewModes: [
        { label: '全部显示', value: 'all' },
        { label: '点云', value: 'pointcloud' },
        { label: '关键点', value: 'keypoints' },
        { label: '运动轨迹', value: 'trajectory' }
      ],
      trajectoryPoints: [], // Array of { position: Vector3, timestamp: number }
      trajectoryDuration: 5000, // 5 seconds
      
      // 位姿状态和数据
      postureStatus: 'standing', // 默认为站立状态
      postureStatusMapping: {
        'normal': 'standing',
        'sitting': 'sitting',
        'lying': 'lying',
        'walking': 'walking',
        'fall': 'fall',
        'fallen': 'fall', // 添加fallen状态映射
        'raising_hand': 'raising_hand'
      },
      currentPostureData: null, // 当前位姿数据
      
      // 状态持续时长跟踪
      currentStateDuration: 0, // 当前状态持续时长（毫秒）
      currentStateStartTime: null, // 当前状态开始时间
      durationTimer: null, // 持续时长计时器
      
      // 状态历史记录
      postureHistory: [], // 状态历史数组 [{status, startTime, endTime, duration}]
      postureHistoryTimeWindow: 600000, // 历史记录时间窗口：10分钟
      maxHistoryRecords: 50, // 最大历史记录数
      
      // 今日状态统计
      todayStateCount: {
        walking: 0,
        sitting: 0,
        standing: 0,
        raising_hand: 0,
        fall: 0
      },
      
      // 所有状态定义
      allPostureStates: [
        { value: 'walking', name: '行走', emoji: '🚶' },
        { value: 'sitting', name: '坐着', emoji: '🪑' },
        { value: 'standing', name: '站立', emoji: '🧍' },
        { value: 'raising_hand', name: '举手', emoji: '🙋' },
        { value: 'fall', name: '跌倒', emoji: '🤾' }
      ],
      
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
      
      isDestroyed: false // 标记组件是否已销毁
    }
  },
  computed: {
    // 显示的历史记录（过滤时间窗口内的）
    displayPostureHistory() {
      const now = Date.now()
      const windowStart = now - this.postureHistoryTimeWindow
      
      // 过滤时间窗口内的记录
      const recentHistory = this.postureHistory.filter(item => {
        return item.endTime >= windowStart
      })
      
      // 计算总时长用于百分比
      const totalDuration = recentHistory.reduce((sum, item) => sum + item.duration, 0)
      
      // 添加宽度百分比
      return recentHistory.map(item => ({
        ...item,
        widthPercent: totalDuration > 0 ? (item.duration / totalDuration * 100) : 0
      }))
    }
  },
  mounted() {
    this.initThree()

    this.initializeComponent()
  },
  beforeDestroy() {
    this.isDestroyed = true
    this.cleanup()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleWindowResize)
    if (this.renderer) {
      this.renderer.dispose()
    }
    this.disconnectWebSocket()
    this.stopMonitoringStatusCheck()
    this.stopHeartbeat()
    this.clearDataTimeoutCheck()
    if (this.durationTimer) {
      clearInterval(this.durationTimer)
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
  },

  methods: {
    // ==================== 3D Visualization ====================
    initThree() {
      const container = this.$refs.threeContainer
      if (!container) return

      // Scene
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x000000)
      this.scene.fog = new THREE.Fog(0x000000, 10, 50)

      // Camera
      this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
      this.camera.position.set(0, 2, 5)
      this.camera.lookAt(0, 0, 0)

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      this.renderer.setPixelRatio(window.devicePixelRatio)
      container.appendChild(this.renderer.domElement)

      // Controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05

      // Helpers
      const gridHelper = new THREE.GridHelper(10, 10)
      this.scene.add(gridHelper)
      const axesHelper = new THREE.AxesHelper(1)
      this.scene.add(axesHelper)

      // Groups
      this.pointCloudGroup = new THREE.Group()
      this.scene.add(this.pointCloudGroup)

      this.keypointGroup = new THREE.Group()
      this.scene.add(this.keypointGroup)

      this.trajectoryGroup = new THREE.Group()
      this.scene.add(this.trajectoryGroup)

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      this.scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 10)
      this.scene.add(directionalLight)

      // Animation Loop
      this.animate()

      // Resize Listener
      window.addEventListener('resize', this.handleWindowResize)
    },

    animate() {
      if (!this.renderer) return
      requestAnimationFrame(this.animate)
      this.controls.update()
      this.renderThree()
    },

    renderThree() {
      // Visibility Control
      const mode = this.viewMode
      this.pointCloudGroup.visible = mode === 'all' || mode === 'pointcloud'
      this.keypointGroup.visible = mode === 'all' || mode === 'keypoints'
      this.trajectoryGroup.visible = mode === 'all' || mode === 'trajectory'

      this.renderer.render(this.scene, this.camera)
    },

    handleWindowResize() {
      const container = this.$refs.threeContainer
      if (!container || !this.camera || !this.renderer) return
      
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
    },

    updateThreeData(data) {
      if (!data) return

      // Update Point Cloud
      this.pointCloudGroup.clear()
      if (data.pointclouds && Array.isArray(data.pointclouds)) {
        const points = []
        const processPoints = (arr) => {
            if (arr.length > 0 && typeof arr[0] === 'number') {
                if (arr.length >= 3) points.push(new THREE.Vector3(arr[0], arr[1], arr[2]))
            } else if (Array.isArray(arr)) {
                arr.forEach(sub => processPoints(sub))
            }
        }
        processPoints(data.pointclouds)

        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            const material = new THREE.PointsMaterial({ color: 0x0088ff, size: 0.1 })
            const cloud = new THREE.Points(geometry, material)
            this.pointCloudGroup.add(cloud)
        }
      }

      // Update Keypoints
      this.keypointGroup.clear()
      let centerPoint = null
      if (data.keypoints && Array.isArray(data.keypoints)) {
        const points = []
        const processKeypoints = (arr) => {
             if (arr.length > 0 && typeof arr[0] === 'number') {
                if (arr.length >= 3) points.push(new THREE.Vector3(arr[0], arr[1], arr[2]))
            } else if (Array.isArray(arr)) {
                arr.forEach(sub => processKeypoints(sub))
            }
        }
        processKeypoints(data.keypoints)

        if (points.length > 0) {
            centerPoint = points[0] // Use first point for trajectory
            
            points.forEach(p => {
                const geometry = new THREE.SphereGeometry(0.1, 16, 16)
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
                const sphere = new THREE.Mesh(geometry, material)
                sphere.position.copy(p)
                this.keypointGroup.add(sphere)
            })
        }
      }

      // Update Trajectory
      this.updateTrajectory(centerPoint)
    },

    updateTrajectory(newPoint) {
        const now = Date.now()
        
        // Add new point
        if (newPoint) {
            this.trajectoryPoints.push({ position: newPoint.clone(), timestamp: now })
        }

        // Remove old points
        this.trajectoryPoints = this.trajectoryPoints.filter(p => now - p.timestamp <= this.trajectoryDuration)

        // Render
        this.trajectoryGroup.clear()
        if (this.trajectoryPoints.length > 1) {
            const points = this.trajectoryPoints.map(p => p.position)
            const curve = new THREE.CatmullRomCurve3(points)
            const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.05, 8, false)
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
            const mesh = new THREE.Mesh(geometry, material)
            this.trajectoryGroup.add(mesh)
        }
    },
    
    resetCamera() {
        if (this.controls) {
            this.controls.reset()
        }
    },


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
        
        // 启动状态持续时长计时器
        this.startDurationTimer()
        
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
      
      // 设置销毁标志
      this.isDestroyed = true
      
      // 首先停止Three.js动画循环
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
        this.animationFrame = null
      }
      
      // 停止动画定时器
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
      
      if (this.durationTimer) {
        clearInterval(this.durationTimer)
        this.durationTimer = null
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
      
      console.log('✅ 组件资源清理完成')
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
        'walking': '行走',
        'raising_hand': '举手',
        'fall': '跌倒'
      }
      return textMap[status] || '未知'
    },
    
    getPostureEmoji(status) {
      const emojiMap = {
        'standing': '🧍',
        'sitting': '🪑',
        'lying': '🛌',
        'walking': '🚶',
        'raising_hand': '🙋',
        'fall': '🤾'
      }
      return emojiMap[status] || '❓'
    },
    
    // 格式化持续时长（完整格式）
    formatDuration(ms) {
      if (!ms || ms < 0) return '00:00:00'
      
      const seconds = Math.floor(ms / 1000)
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    },
    
    // 格式化短时长（用于时间轴）
    formatShortDuration(ms) {
      if (!ms || ms < 0) return '0秒'
      
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}小时`
      } else if (minutes > 0) {
        return `${minutes}分`
      } else {
        return `${seconds}秒`
      }
    },
    
    // 获取某个状态今日出现次数
    getStateCount(state) {
      return this.todayStateCount[state] || 0
    },
    
    getMonitoringStatusType(status) {
      const typeMap = {
        '监测中': 'success',
        '未监测': 'info',
        '已停止': 'warning'
      }
      return typeMap[status] || 'info'
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

    // ==================== 状态持续时长和历史管理 ====================
    
    // 启动持续时长计时器
    startDurationTimer() {
      // 初始化当前状态开始时间
      if (!this.currentStateStartTime) {
        this.currentStateStartTime = Date.now()
      }
      
      // 每秒更新一次持续时长
      this.durationTimer = setInterval(() => {
        if (this.currentStateStartTime) {
          this.currentStateDuration = Date.now() - this.currentStateStartTime
        }
      }, 1000)
    },
    
    // 结束当前状态（状态切换时调用）
    endCurrentState() {
      if (!this.currentStateStartTime) return
      
      const now = Date.now()
      const duration = now - this.currentStateStartTime
      
      // 只记录持续时间超过1秒的状态
      if (duration > 1000) {
        // 添加到历史记录
        this.postureHistory.push({
          status: this.postureStatus,
          startTime: this.currentStateStartTime,
          endTime: now,
          duration: duration
        })
        
        // 更新今日统计
        if (this.todayStateCount[this.postureStatus] !== undefined) {
          this.todayStateCount[this.postureStatus]++
        }
        
        // 限制历史记录数量
        if (this.postureHistory.length > this.maxHistoryRecords) {
          this.postureHistory.shift()
        }
        
        console.log(`📊 状态结束: ${this.getPostureText(this.postureStatus)}, 持续: ${this.formatShortDuration(duration)}`)
      }
    },
    
    // 开始新状态
    startNewState(newStatus) {
      this.currentStateStartTime = Date.now()
      this.currentStateDuration = 0
      
      console.log(`🎬 新状态开始: ${this.getPostureText(newStatus)}`)
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

    // 跳转到异常告警页面
    goToAlertPage() {
      this.$router.push('/alert/fall')
    },

    // 跳转到具体异常详情
    goToAlertDetail(alert) {
      this.$router.push({
        path: '/alert/fall',
        query: { highlightId: alert.id }
      })
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
      
      // 同步设备信息（从 WebSocket 数据中更新）
      if (data.deviceId && data.deviceId !== this.currentDevice.deviceId) {
        console.log(`🔄 从 WebSocket 数据更新设备ID: ${this.currentDevice.deviceId} -> ${data.deviceId}`)
        this.currentDevice.deviceId = data.deviceId
        // 重新订阅正确的设备
        this.subscribeToDevice()
      }
      
      // 同步人员信息（从 WebSocket 数据中更新）
      if (data.personId !== undefined) {
        if (data.personId && data.personId.trim() !== '') {
          // 更新或设置人员ID
          if (this.currentPerson.id !== data.personId) {
            console.log(`👤 更新人员ID: ${this.currentPerson.id || '无'} -> ${data.personId}`)
            this.currentPerson.id = data.personId
            // 如果没有名字，暂时用ID代替
            if (!this.currentPerson.name || this.currentPerson.name === '未知用户' || this.currentPerson.name === '未绑定人员') {
              this.currentPerson.name = data.personId
            }
            // 动态更新页面标题
            this.updatePageTitle()
          }
        } else {
          // personId为空，表示设备未绑定人员
          if (this.currentPerson.id) {
            console.log(`👤 设备未绑定人员，清除人员信息`)
          }
          this.currentPerson.id = ''
          this.currentPerson.name = '未绑定人员'
          this.updatePageTitle()
        }
      }
      
      // 格式化数据
      const formattedData = formatPostureDataForDisplay(data)
      
      // 更新当前数据
      this.currentPostureData = formattedData
      this.lastUpdateTime = new Date().toISOString()
      
      // 更新3D视图
      this.updateThreeData(data)
      
      // 更新位姿状态（检测跌倒）
      if (data.postureStatus || data.postureState) {
        const postureValue = data.postureStatus || data.postureState
        const mappedStatus = this.postureStatusMapping[postureValue] || 'standing'
        
        // 检测状态是否发生变化
        if (mappedStatus !== this.postureStatus) {
          console.log('🔄 状态变化:', this.postureStatus, '->', mappedStatus)
          
          // 记录旧状态的结束
          this.endCurrentState()
          
          // 开始新状态
          this.startNewState(mappedStatus)
        }
        
        this.postureStatus = mappedStatus
        
        // 日志输出位姿状态
        console.log('📍 位姿状态更新:', {
          original: postureValue,
          mapped: mappedStatus,
          isFallen: mappedStatus === 'fall'
        })
      }
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
        
      } catch (error) {
        console.error('❌ 获取位姿数据失败:', error)
        if (!this.ws || this.wsConnectionStatus !== 'connected') {
          // this.$message.error(`获取位姿数据失败: ${error.message}`)
        }
      } finally {
        this.loading = false
      }
    },

    // fetchTrajectoryData 已删除 - 位姿数据从 ti6843-posture API 获取，不需要单独的轨迹 API

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
      console.log('🚨 收到跌倒警报数据 (已禁用弹窗):', alert)
      // 用户要求移除跌倒提示框，因此不再将警报添加到活跃列表
      // const existingIndex = this.activeFallAlerts.findIndex(a => a.id === alert.id)
      // if (existingIndex === -1) {
      //   this.activeFallAlerts.unshift(alert)
      // }
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
    },

    // ==================== 设备和人员切换处理 ====================
    handleDeviceSwitch({ deviceId, device, personId }) {
      console.log('🔄 切换到设备:', deviceId, '人员:', personId)
      
      // 停止当前监测
      if (this.isMonitoring) {
        this.disconnectWebSocket()
      }
      
      // 更新设备信息
      this.currentDevice = {
        deviceId: deviceId,
        name: device?.name || deviceId,
        location: device?.location || '未知位置',
        modelType: 'TI6843_POSTURE',
        type: 'posture_sensor',
        status: device?.status || 'offline',
        createdAt: null,
        updatedAt: null
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
      
      // 清除当前数据
      this.postureStatus = 'unknown'
      
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
      
      // 重新建立连接
      if (this.isMonitoring) {
        this.connectWebSocket()
      }
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
.posture-monitor-page {
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
  height: 100%;
}

/* 图表卡片 */
.chart-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.8);
  /* flex: 1; Removed to let recent alerts expand instead */
  display: flex;
  flex-direction: column;
  overflow: visible; /* 确保内容不被裁剪 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.view-controls {
  display: flex;
  gap: 8px;
}

/* 位姿状态卡片 */
.posture-status-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

/* 当前状态展示区 */
.current-posture-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 12px;
}

.posture-icon-container {
  flex-shrink: 0;
}

.posture-icon-large {
  width: 120px;
  height: 120px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(147, 197, 253, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(167, 139, 250, 0.2);
}

.posture-icon-large svg {
  width: 70px;
  height: 70px;
  color: #a78bfa;
}

.icon-fall svg {
  color: #ef4444;
}

.icon-raising-hand svg {
  color: #f59e0b;
}

.icon-unknown {
  font-size: 50px;
  color: #9ca3af;
}

.posture-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-state-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.current-state-value {
  display: flex;
  align-items: baseline;
}

.state-text {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.state-text.state-sitting {
  color: #3b82f6;
}

.state-text.state-standing {
  color: #10b981;
}

.state-text.state-walking {
  color: #f59e0b;
}

.state-text.state-raising_hand {
  color: #f59e0b;
}

.state-text.state-fall {
  color: #ef4444;
}

.state-duration {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.duration-icon {
  font-size: 16px;
  color: #a78bfa;
}

.duration-text {
  font-weight: 500;
}

/* 状态历史时间轴 */
.posture-timeline-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
}

.timeline-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-track {
  display: flex;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.timeline-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.timeline-item:hover {
  filter: brightness(1.1);
  z-index: 1;
  transform: scaleY(1.05);
}

.timeline-item.timeline-walking {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.timeline-item.timeline-sitting {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
}

.timeline-item.timeline-standing {
  background: linear-gradient(135deg, #34d399, #10b981);
}

.timeline-item.timeline-raising_hand {
  background: linear-gradient(135deg, #fb923c, #f97316);
}

.timeline-item.timeline-fall {
  background: linear-gradient(135deg, #f87171, #ef4444);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: white;
  font-weight: 600;
}

.timeline-emoji {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.timeline-duration {
  font-size: 11px;
  opacity: 0.95;
  white-space: nowrap;
}

.timeline-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.legend-emoji {
  font-size: 16px;
}

.legend-text {
  color: #4b5563;
  font-weight: 500;
}

.legend-arrow {
  color: #9ca3af;
  font-size: 12px;
  margin: 0 4px;
}

.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.empty-icon {
  font-size: 32px;
  color: #d1d5db;
}

.empty-text {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

/* 全部状态卡片区 */
.all-states-section {
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.states-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 12px;
  background: #f9fafb;
  border: 2px solid transparent;
  transition: all 0.3s;
  cursor: pointer;
}

.state-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.state-card.state-active {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(147, 197, 253, 0.15));
  border-color: #a78bfa;
  box-shadow: 0 4px 12px rgba(167, 139, 250, 0.25);
}

.state-card-walking.state-active {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
}

.state-card-sitting.state-active {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(59, 130, 246, 0.15));
}

.state-card-standing.state-active {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(16, 185, 129, 0.15));
}

.state-card-raising_hand.state-active {
  border-color: #f97316;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(249, 115, 22, 0.15));
}

.state-card-fall.state-active {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(239, 68, 68, 0.15));
}

.state-card-icon {
  font-size: 28px;
}

.state-card-name {
  font-size: 13px;
  color: #4b5563;
  font-weight: 600;
}

.state-card-count {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
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
  /* margin-top: auto; Removed to align with vital page */
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
  padding: 16px;
  background: #fef2f2;
  border-radius: 10px;
  border: 1px solid #fecaca;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-avatar {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
}

.alert-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.alert-time {
  font-size: 12px;
  color: #9ca3af;
}

.alert-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 42px;
}

.device-info,
.alert-location {
  font-size: 13px;
  color: #6b7280;
}

.alert-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(147, 197, 253, 0.1));
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

  .current-posture-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .states-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .visualization-container {
    height: 300px;
  }

  .states-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .timeline-legend {
    font-size: 11px;
  }
  
  .legend-emoji {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .states-grid {
    grid-template-columns: 1fr;
  }
  
  .posture-icon-large {
    width: 100px;
    height: 100px;
  }
  
  .posture-icon-large svg {
    width: 60px;
    height: 60px;
  }
  
  .state-text {
    font-size: 24px;
  }
}

/* Dropdown active state */
.el-dropdown-menu__item.is-active {
  background-color: #f0f9ff;
  color: #0ea5e9;
}

/* 3D Visualization Styles */
.visualization-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 500px; /* Fixed height for 3D view */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.visualization-container {
  flex: 1;
  background: #000000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
</style>
