<template>
  <div class="ecg-monitor-page">
    <!-- 设备和人员选择器 -->
    <DevicePersonSelector
      v-model="deviceId"
      v-model:personId="personId"
      @device-change="handleDeviceChange"
      @person-change="handlePersonChange"
    />

    <!-- 顶部控制栏 -->
    <div class="monitor-header">
      <div class="header-info">
        <h1 class="page-title">ECG 实时监测</h1>
        <div class="status-badges">
          <el-tag :type="isConnected ? 'success' : 'danger'" size="large">
            {{ isConnected ? 'WebSocket 已连接' : 'WebSocket 未连接' }}
          </el-tag>
          <el-tag v-if="isConnected" type="info" class="ml-2">延迟: {{ latency }}ms</el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="timeWindow" size="default" @change="handleTimeWindowChange">
          <el-radio-button :label="5">5秒</el-radio-button>
          <el-radio-button :label="10">10秒</el-radio-button>
          <el-radio-button :label="30">30秒</el-radio-button>
        </el-radio-group>
        <el-button 
          :type="isPaused ? 'primary' : 'danger'" 
          @click="togglePause"
          :icon="isPaused ? 'VideoPlay' : 'VideoPause'"
          class="ml-2"
        >
          {{ isPaused ? '继续' : '暂停' }}
        </el-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="monitor-content">
      <!-- 左侧：波形图 -->
      <div class="main-panel">
        <div class="chart-card">
          <div class="card-header">
            <h3>实时心电图 (Lead I)</h3>
            <span class="last-update">最后更新: {{ formatTime(currentMetrics.timestamp) }}</span>
          </div>
          <div ref="chartRef" class="waveform-container"></div>
        </div>
      </div>

      <!-- 右侧：实时指标 -->
      <div class="metrics-grid">
        <div class="metric-card heart-card">
          <div class="metric-header">
            <el-icon class="metric-icon" :size="32" color="#f87171">
              <Monitor />
            </el-icon>
            <span class="metric-title">心率</span>
          </div>
          <div class="metric-value-large" :class="getHeartRateClass(currentMetrics.heartRate)">
            {{ currentMetrics.heartRate || '--' }} <span class="unit">bpm</span>
          </div>
          <div class="metric-footer">
            <span class="status-indicator" :class="getHeartRateStatusClass(currentMetrics.heartRate)">
              {{ getHeartRateStatusText(currentMetrics.heartRate) }}
            </span>
          </div>
        </div>

        <div class="metric-card signal-card">
          <div class="metric-header">
            <el-icon class="metric-icon" :size="32" color="#a5b4fc">
              <Connection />
            </el-icon>
            <span class="metric-title">信号质量</span>
          </div>
          <div class="metric-value-large">
            {{ currentMetrics.signalQuality || 0 }} <span class="unit">%</span>
          </div>
          <div class="metric-footer">
            <el-progress 
              :percentage="currentMetrics.signalQuality || 0" 
              :color="signalQualityColor"
              :show-text="false"
              :stroke-width="6"
            />
            <div class="mt-1 text-sm">{{ currentMetrics.signalQualityStatus || '未知' }}</div>
          </div>
        </div>

        <div class="metric-card info-card">
          <div class="metric-header">
            <el-icon class="metric-icon" :size="32" color="#34d399">
              <DataLine />
            </el-icon>
            <span class="metric-title">采样率</span>
          </div>
          <div class="metric-value-large">
            {{ currentMetrics.samplingRate || '--' }} <span class="unit">Hz</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import DevicePersonSelector from '@/components/DevicePersonSelector.vue'
import { Monitor, Connection, DataLine, VideoPlay, VideoPause } from '@element-plus/icons-vue'

// 状态变量
const deviceId = ref('')
const personId = ref('')
const isConnected = ref(false)
const latency = ref(0)
const isPaused = ref(false)
const timeWindow = ref(10) // 秒
const chartRef = ref(null)
let chartInstance = null
let ws = null
let heartbeatInterval = null

// 数据缓存
const ecgDataQueue = ref([])
const maxDataPoints = computed(() => timeWindow.value * 250) // 假设250Hz采样率

// 当前指标
const currentMetrics = ref({
  heartRate: 0,
  signalQuality: 0,
  signalQualityStatus: '',
  samplingRate: 0,
  timestamp: null
})

// WebSocket URL
const WS_URL = 'ws://localhost:8080/ws/ecg'

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChartOption()
    window.addEventListener('resize', resizeChart)
  }
}

const resizeChart = () => {
  chartInstance?.resize()
}

const updateChartOption = () => {
  if (!chartInstance) return

  const now = new Date().getTime()
  const startTime = now - timeWindow.value * 1000

  const option = {
    grid: {
      top: 30,
      right: 20,
      bottom: 30,
      left: 50,
      show: true, // 显示网格背景
      borderColor: '#eee'
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      min: startTime,
      max: now,
      splitLine: {
        show: true,
        lineStyle: {
          color: '#eee'
        }
      },
      axisLabel: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: -1.5, // 固定最小值
      max: 1.5,  // 固定最大值
      splitLine: {
        show: true,
        lineStyle: {
          color: '#eee'
        }
      },
      name: 'mV',
      nameTextStyle: {
        color: '#666'
      },
      axisLabel: {
        color: '#666'
      }
    },
    series: [{
      name: 'ECG',
      type: 'line',
      showSymbol: false,
      hoverAnimation: false,
      data: [], // 初始化为空
      lineStyle: {
        width: 2,
        color: '#ef4444' // 红色心电线
      },
      animation: false // 禁用动画以提高性能
    }]
  }
  chartInstance.setOption(option)
}

// WebSocket 连接管理
const connectWebSocket = () => {
  if (ws) {
    ws.close()
  }

  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('ECG WebSocket Connected')
    isConnected.value = true
    subscribeToData()
    startHeartbeat()
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      handleWebSocketMessage(message)
    } catch (e) {
      console.error('Failed to parse WebSocket message', e)
    }
  }

  ws.onclose = () => {
    console.log('ECG WebSocket Closed')
    isConnected.value = false
    stopHeartbeat()
    // 尝试重连
    setTimeout(connectWebSocket, 5000)
  }

  ws.onerror = (error) => {
    console.error('ECG WebSocket Error', error)
    isConnected.value = false
  }
}

const subscribeToData = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  if (deviceId.value) {
    ws.send(JSON.stringify({
      action: 'subscribe',
      type: 'device',
      id: deviceId.value
    }))
  } else if (personId.value) {
    ws.send(JSON.stringify({
      action: 'subscribe',
      type: 'person',
      id: personId.value
    }))
  }
}

const handleWebSocketMessage = (message) => {
  if (message.type === 'pong') {
    return
  }

  if (message.type === 'ecg_realtime_data' || message.type === 'ecg_device_data' || message.type === 'ecg_person_data') {
    if (isPaused.value) return

    const data = message.data
    
    currentMetrics.value = {
      heartRate: data.heartRate,
      signalQuality: data.signalQuality,
      signalQualityStatus: data.signalQualityStatus,
      samplingRate: data.samplingRate,
      timestamp: data.timestamp
    }

    const timestamp = new Date(data.timestamp).getTime()
    const value = data.ecgValue

    ecgDataQueue.value.push({ timestamp, value })

    // 保持窗口大小
    const windowStartTime = Date.now() - (timeWindow.value * 1000)
    if (ecgDataQueue.value.length > 0 && ecgDataQueue.value[0].timestamp < windowStartTime) {
       const index = ecgDataQueue.value.findIndex(item => item.timestamp >= windowStartTime)
       if (index > 0) {
         ecgDataQueue.value.splice(0, index)
       }
    }
    
    if (ecgDataQueue.value.length > maxDataPoints.value * 1.5) {
      ecgDataQueue.value.splice(0, ecgDataQueue.value.length - maxDataPoints.value)
    }

    requestAnimationFrame(() => {
        if (chartInstance) {
            const now = Date.now()
            chartInstance.setOption({
                xAxis: {
                    min: now - timeWindow.value * 1000,
                    max: now
                },
                series: [{
                    data: ecgDataQueue.value.map(item => [item.timestamp, item.value])
                }]
            })
        }
    })
  }
}

const startHeartbeat = () => {
  stopHeartbeat()
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'ping' }))
    }
  }, 30000)
}

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

const handleDeviceChange = (newId) => {
  ecgDataQueue.value = []
  subscribeToData()
}

const handlePersonChange = (newId) => {
  if (!deviceId.value) {
    ecgDataQueue.value = []
    subscribeToData()
  }
}

const handleTimeWindowChange = () => {
  // 窗口变化时，立即更新图表X轴范围
  if (chartInstance) {
      const now = Date.now()
      chartInstance.setOption({
          xAxis: {
              min: now - timeWindow.value * 1000,
              max: now
          }
      })
  }
}

const togglePause = () => {
  isPaused.value = !isPaused.value
}

const formatTime = (isoString) => {
  if (!isoString) return '--'
  const date = new Date(isoString)
  return date.toLocaleTimeString()
}

const getHeartRateClass = (hr) => {
  if (!hr) return ''
  if (hr < 60 || hr > 100) return 'text-danger'
  return 'text-success'
}

const getHeartRateStatusClass = (hr) => {
  if (!hr) return 'status-normal'
  if (hr < 60) return 'status-slow'
  if (hr > 100) return 'status-fast'
  return 'status-normal'
}

const getHeartRateStatusText = (hr) => {
  if (!hr) return '等待数据'
  if (hr < 60) return '心动过缓'
  if (hr > 100) return '心动过速'
  return '正常'
}

const signalQualityColor = (percentage) => {
  if (percentage < 60) return '#F56C6C'
  if (percentage < 80) return '#E6A23C'
  return '#67C23A'
}

onMounted(() => {
  initChart()
  connectWebSocket()
  
  // 如果没有数据，也要定时更新X轴，保持时间窗口滚动
  setInterval(() => {
    if (chartInstance && !isPaused.value && ecgDataQueue.value.length === 0) {
       const now = Date.now()
       chartInstance.setOption({
          xAxis: {
              min: now - timeWindow.value * 1000,
              max: now
          }
       })
    }
  }, 1000)
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
  stopHeartbeat()
  window.removeEventListener('resize', resizeChart)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped lang="scss">
.ecg-monitor-page {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .header-info {
    display: flex;
    align-items: center;
    gap: 16px;

    .page-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }
  }
}

.monitor-content {
  display: flex;
  gap: 24px;
  height: calc(100vh - 250px);
  min-height: 500px;
}

.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }

    .last-update {
      font-size: 12px;
      color: #9ca3af;
    }
  }

  .waveform-container {
    flex: 1;
    width: 100%;
    min-height: 0;
  }
}

.metrics-grid {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;

  .metric-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .metric-title {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
  }

  .metric-value-large {
    font-size: 36px;
    font-weight: 700;
    color: #111827;
    line-height: 1;
    margin-bottom: 8px;

    .unit {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 400;
    }
  }

  .metric-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
}

.status-indicator {
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;

  &.status-normal {
    background-color: #d1fae5;
    color: #059669;
  }

  &.status-slow {
    background-color: #fef3c7;
    color: #d97706;
  }

  &.status-fast {
    background-color: #fee2e2;
    color: #dc2626;
  }
}

.text-danger {
  color: #ef4444 !important;
}

.text-success {
  color: #10b981 !important;
}

.ml-2 {
  margin-left: 8px;
}

.mt-1 {
  margin-top: 4px;
}

.text-sm {
  font-size: 12px;
  color: #6b7280;
}
</style>
