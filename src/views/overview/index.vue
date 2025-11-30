<template>
  <div class="overview" v-loading="initialLoading" element-loading-text="加载中...">
    <section class="hero">
      <div>
        <p class="eyebrow">概览中心</p>
        <h1>全局健康雷达中枢</h1>
        <!-- <p class="lede">
          实时监控设备运行状态、人员健康数据与告警信息，快速掌握整体态势。
        </p> -->
        <div class="chips">
          <span class="chip">最后更新：{{ lastUpdateTime }}</span>
          <span class="chip" :class="{ 'chip-pulse': autoRefresh }">
            {{ autoRefresh ? '自动刷新中' : '已暂停刷新' }}
          </span>
        </div>
      </div>
      <div class="hero-actions">
        <button class="primary" @click="handleRefreshAll">
          <span>{{ refreshing ? '刷新中...' : '立即刷新' }}</span>
        </button>
        <!-- <button class="ghost" @click="toggleAutoRefresh">
          {{ autoRefresh ? '暂停自动刷新' : '开启自动刷新' }}
        </button> -->
      </div>
      <div class="glow"></div>
    </section>

    <section class="grid metrics">
      <div v-for="metric in computedMetrics" :key="metric.title" class="card metric">
        <div class="metric-head">
          <span class="label">{{ metric.title }}</span>
          <span v-if="metric.delta" :class="['pill', metric.trend === 'up' ? 'positive' : metric.trend === 'down' ? 'negative' : 'subtle']">
            {{ metric.delta }}
          </span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metric.value }}</span>
          <span class="unit">{{ metric.unit }}</span>
        </div>
        <div class="meter">
          <div class="meter-fill" :style="{ width: `${metric.fill}%`, background: metric.tint }"></div>
        </div>
        <p class="meta">{{ metric.note }}</p>
      </div>
    </section>

    <section class="split">
      <div class="card large">
        <div class="section-head">
          <div>
            <p class="eyebrow">实时告警监控</p>
            <h3>待处理告警与最新动态</h3>
          </div>
          <span class="pill" :class="totalActiveAlerts > 0 ? 'negative' : 'positive'">
            {{ totalActiveAlerts > 0 ? `${totalActiveAlerts} 条待处理` : '无告警' }}
          </span>
        </div>
        
        <div v-if="recentAlerts.length > 0" class="list">
          <div v-for="alert in recentAlerts.slice(0, 5)" :key="alert.id" class="list-row alert-row">
            <span :class="['pill', alert.severity === 'CRITICAL' ? 'negative' : alert.severity === 'WARNING' ? 'warning' : 'subtle']">
              {{ alert.type }}
            </span>
            <div class="alert-body">
              <p class="strong">{{ alert.title }}</p>
              <p class="muted">{{ alert.detail }}</p>
            </div>
            <button class="link" @click="handleGoToAlert(alert)">去处理</button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p class="muted">🎉 暂无待处理告警</p>
        </div>
        
        <div class="actions">
          <button class="ghost" @click="$router.push('/alert/fall')">跌倒告警</button>
          <button class="ghost" @click="$router.push('/alert/vitals')">生命体征告警</button>
          <button class="primary" @click="handleRefreshAlerts">刷新告警</button>
        </div>
      </div>

      <div class="card large status">
        <div class="section-head">
          <div>
            <p class="eyebrow">设备与人员状态</p>
            <h3>实时在线监控</h3>
          </div>
          <span class="pill" :class="deviceOnlineRate >= 90 ? 'positive' : deviceOnlineRate >= 70 ? 'warning' : 'negative'">
            {{ deviceOnlineRate >= 90 ? '运行良好' : deviceOnlineRate >= 70 ? '需关注' : '异常' }}
          </span>
        </div>
        <div class="status-grid">
          <div v-for="block in computedStatusBlocks" :key="block.title" class="status-card" :style="{ background: block.background }">
            <p class="label">{{ block.title }}</p>
            <p class="status-value">{{ block.value }}</p>
            <p class="muted">{{ block.sub }}</p>
          </div>
        </div>
        <div class="list tight">
          <p class="eyebrow">设备型号分布</p>
          <div v-for="model in deviceModelStats.slice(0, 5)" :key="model.type" class="list-row">
            <div>
              <p class="strong">{{ model.type || '未知型号' }}</p>
              <p class="muted">占比 {{ model.percentage }}%</p>
            </div>
            <span class="pill subtle">{{ model.count }} 台</span>
          </div>
        </div>
      </div>
    </section>

    <section class="split">
      <div class="card large chart">
        <div class="section-head">
          <div>
            <p class="eyebrow">告警趋势分析</p>
            <h3>近 24h 告警统计</h3>
          </div>
          <span class="pill subtle">
            今日 {{ todayAlertCount }} 条
          </span>
        </div>
        <div class="alert-type-stats">
          <div class="stat-item">
            <span class="stat-label">跌倒告警</span>
            <span class="stat-value critical">{{ fallAlertStats.today }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">心率异常</span>
            <span class="stat-value warning">{{ vitalsAlertStats.heart }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">呼吸异常</span>
            <span class="stat-value warning">{{ vitalsAlertStats.breath }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">心电异常</span>
            <span class="stat-value info">{{ ecgAlertStats.total }}</span>
          </div>
        </div>
        <div class="trend-summary">
          <p class="muted">
            今日告警总数较昨日 
            <span :class="alertTrend > 0 ? 'text-danger' : 'text-success'">
              {{ alertTrend > 0 ? '增加' : '减少' }} {{ Math.abs(alertTrend) }}%
            </span>
          </p>
        </div>
      </div>

      <div class="card large">
        <div class="section-head">
          <div>
            <p class="eyebrow">人员健康概览</p>
            <h3>监测人员统计</h3>
          </div>
          <button class="ghost" @click="$router.push('/person')">查看全部</button>
        </div>
        
        <div class="person-stats-grid">
          <div class="person-stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <div class="stat-number">{{ personStats.total }}</div>
              <div class="stat-text">总人数</div>
            </div>
          </div>
          <div class="person-stat-card">
            <div class="stat-icon">👨</div>
            <div class="stat-info">
              <div class="stat-number">{{ personStats.male }}</div>
              <div class="stat-text">男性</div>
            </div>
          </div>
          <div class="person-stat-card">
            <div class="stat-icon">👩</div>
            <div class="stat-info">
              <div class="stat-number">{{ personStats.female }}</div>
              <div class="stat-text">女性</div>
            </div>
          </div>
        </div>
        
        <div class="list">
          <p class="eyebrow">部门分布 Top 5</p>
          <div v-for="dept in topDepartments.slice(0, 5)" :key="dept.name" class="list-row">
            <div>
              <p class="strong">{{ dept.name || '未分配' }}</p>
              <p class="muted">占比 {{ dept.percentage }}%</p>
            </div>
            <span class="pill subtle">{{ dept.count }} 人</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card quick">
      <div class="section-head">
        <div>
          <p class="eyebrow">快捷入口</p>
          <h3>常用操作与导航</h3>
        </div>
      </div>
      <div class="chips">
        <button 
          v-for="action in quickActions" 
          :key="action.label" 
          class="chip-button"
          @click="handleQuickAction(action)"
        >
          <span>{{ action.label }}</span>
          <span class="muted">{{ action.note }}</span>
          <span v-if="action.badge" class="action-badge">{{ action.badge }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { usePersonStore } from '@/stores/person'
import { useAlertStore } from '@/stores/alert'
import { useStatsStore } from '@/stores/stats'
import { getPersonDeviceMappings } from '@/api/mappings/person-device-mapping'
import { ElMessage } from 'element-plus'

const router = useRouter()
const deviceStore = useDeviceStore()
const personStore = usePersonStore()
const alertStore = useAlertStore()
const statsStore = useStatsStore()

// ==================== 状态管理 ====================
const initialLoading = ref(true)
const refreshing = ref(false)
const autoRefresh = ref(true)
const lastUpdateTime = ref('--:--:--')
const refreshTimer = ref(null)

// 设备数据
const deviceList = ref([])
const deviceStatistics = ref({
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  maintenanceDevices: 0
})

// 人员数据
const personList = ref([])
const personStatistics = ref({
  total: 0,
  male: 0,
  female: 0,
  departments: {}
})

// 绑定数据
const mappingCount = ref(0)

// 告警数据
const fallAlerts = ref([])
const vitalsAlerts = ref([])

// ==================== 计算属性 ====================

// 核心指标卡片
const computedMetrics = computed(() => {
  const total = deviceStatistics.value.totalDevices || 0
  const online = deviceStatistics.value.onlineDevices || 0
  const onlineRate = total > 0 ? Math.round((online / total) * 100) : 0
  
  const personTotal = personStatistics.value.total || 0
  
  const totalAlerts = fallAlerts.value.length + vitalsAlerts.value.length
  
  return [
    {
      title: '在线设备',
      value: online.toString(),
      unit: `/ ${total}`,
      delta: `${onlineRate}%`,
      trend: onlineRate >= 90 ? 'up' : onlineRate >= 70 ? 'neutral' : 'down',
      fill: onlineRate,
      tint: 'linear-gradient(90deg, #5ee9ff, #4dabf7)',
      note: total > 0 ? `在线率 ${onlineRate}%，${deviceStatistics.value.offlineDevices} 台离线` : '暂无设备数据'
    },
    {
      title: '监测人员',
      value: personTotal.toString(),
      unit: '人',
      delta: mappingCount.value > 0 ? `${mappingCount.value} 对绑定` : '未绑定',
      trend: mappingCount.value > 0 ? 'up' : 'neutral',
      fill: personTotal > 0 ? Math.min(100, (mappingCount.value / personTotal) * 100) : 0,
      tint: 'linear-gradient(90deg, #845ef7, #5ee9ff)',
      note: `男 ${personStatistics.value.male} / 女 ${personStatistics.value.female}，绑定率 ${personTotal > 0 ? Math.round((mappingCount.value / personTotal) * 100) : 0}%`
    },
    {
      title: '活跃绑定',
      value: mappingCount.value.toString(),
      unit: '对',
      delta: personTotal > 0 ? `${Math.round((mappingCount.value / personTotal) * 100)}%` : '0%',
      trend: mappingCount.value > 0 ? 'up' : 'neutral',
      fill: personTotal > 0 ? Math.min(100, (mappingCount.value / personTotal) * 100) : 0,
      tint: 'linear-gradient(90deg, #ffd666, #845ef7)',
      note: `人员设备绑定完成 ${mappingCount.value} 对`
    },
    {
      title: '待处理告警',
      value: totalAlerts.toString(),
      unit: '条',
      delta: totalAlerts === 0 ? '无告警' : totalAlerts > 10 ? '较多' : '正常',
      trend: totalAlerts === 0 ? 'up' : 'down',
      fill: Math.min(100, totalAlerts * 10),
      tint: totalAlerts > 10 ? 'linear-gradient(90deg, #ff6b6b, #ff8787)' : 'linear-gradient(90deg, #ffd666, #ffa94d)',
      note: `跌倒 ${fallAlerts.value.length} 条，生命体征 ${vitalsAlerts.value.length} 条`
    }
  ]
})

// 设备状态块
const computedStatusBlocks = computed(() => {
  const total = deviceStatistics.value.totalDevices || 0
  const online = deviceStatistics.value.onlineDevices || 0
  const offline = deviceStatistics.value.offlineDevices || 0
  const personTotal = personStatistics.value.total || 0
  const bindingRate = personTotal > 0 ? Math.round((mappingCount.value / personTotal) * 100) : 0
  
  return [
    {
      title: '在线设备',
      value: online.toString(),
      sub: `离线 ${offline} 台`,
      background: 'linear-gradient(180deg, rgba(94, 233, 255, 0.32), rgba(132, 94, 247, 0.12))'
    },
    {
      title: '监测人员',
      value: personTotal.toString(),
      sub: `已绑定 ${mappingCount.value} 人`,
      background: 'linear-gradient(180deg, rgba(132, 94, 247, 0.22), rgba(255, 214, 102, 0.12))'
    },
    {
      title: '绑定完成率',
      value: `${bindingRate}%`,
      sub: `活跃 ${mappingCount.value} 对`,
      background: 'linear-gradient(180deg, rgba(255, 214, 102, 0.24), rgba(94, 233, 255, 0.14))'
    }
  ]
})

// 设备在线率
const deviceOnlineRate = computed(() => {
  const total = deviceStatistics.value.totalDevices || 0
  const online = deviceStatistics.value.onlineDevices || 0
  return total > 0 ? Math.round((online / total) * 100) : 0
})

// 设备型号统计
const deviceModelStats = computed(() => {
  const modelCount = {}
  const total = deviceList.value.length
  
  deviceList.value.forEach(device => {
    const type = device.modelType || '未知'
    modelCount[type] = (modelCount[type] || 0) + 1
  })
  
  return Object.entries(modelCount)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// 告警总数
const totalActiveAlerts = computed(() => {
  return fallAlerts.value.length + vitalsAlerts.value.length
})

// 最近告警列表
const recentAlerts = computed(() => {
  const alerts = []
  
  // 跌倒告警
  fallAlerts.value.slice(0, 3).forEach(alert => {
    alerts.push({
      id: `fall-${alert.id}`,
      type: '跌倒告警',
      severity: alert.severity || 'WARNING',
      title: `${alert.personName || '未知人员'} 检测到跌倒`,
      detail: `${alert.location || '未知位置'} · ${formatTime(alert.fallDetectedAt)}`,
      route: '/alert/fall',
      rawData: alert
    })
  })
  
  // 生命体征告警
  vitalsAlerts.value.slice(0, 3).forEach(alert => {
    const typeMap = {
      HEART_TACHY: '心动过速',
      HEART_BRADY: '心动过缓',
      HEART_FLATLINE: '心搏停止',
      BREATH_TACHY: '呼吸过快',
      BREATH_BRADY: '呼吸过缓',
      APNEA: '呼吸暂停'
    }
    alerts.push({
      id: `vital-${alert.id}`,
      type: typeMap[alert.alertType] || '生命体征异常',
      severity: alert.severity || 'WARNING',
      title: `${alert.personName || '未知人员'} ${typeMap[alert.alertType] || '异常'}`,
      detail: `${alert.location || '未知位置'} · ${formatTime(alert.detectedAt)}`,
      route: '/alert/vitals',
      rawData: alert
    })
  })
  
  // 按时间排序
  return alerts.sort((a, b) => {
    const timeA = a.rawData.fallDetectedAt || a.rawData.detectedAt
    const timeB = b.rawData.fallDetectedAt || b.rawData.detectedAt
    return new Date(timeB) - new Date(timeA)
  })
})

// 今日告警数
const todayAlertCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const fallToday = fallAlerts.value.filter(alert => {
    const alertDate = new Date(alert.fallDetectedAt)
    return alertDate >= today
  }).length
  
  const vitalToday = vitalsAlerts.value.filter(alert => {
    const alertDate = new Date(alert.detectedAt)
    return alertDate >= today
  }).length
  
  return fallToday + vitalToday
})

// 跌倒告警统计
const fallAlertStats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return {
    today: fallAlerts.value.filter(alert => new Date(alert.fallDetectedAt) >= today).length,
    total: fallAlerts.value.length
  }
})

// 生命体征告警统计
const vitalsAlertStats = computed(() => {
  const heartTypes = ['HEART_TACHY', 'HEART_BRADY', 'HEART_FLATLINE']
  const breathTypes = ['BREATH_TACHY', 'BREATH_BRADY', 'APNEA']
  
  return {
    heart: vitalsAlerts.value.filter(alert => heartTypes.includes(alert.alertType)).length,
    breath: vitalsAlerts.value.filter(alert => breathTypes.includes(alert.alertType)).length
  }
})

// 心电异常统计
const ecgAlertStats = computed(() => {
  const stats = statsStore.ecgStats || {}
  return {
    total: (stats.tachycardia?.count || 0) + (stats.bradycardia?.count || 0) + (stats.arrhythmia?.count || 0),
    tachycardia: stats.tachycardia?.count || 0,
    bradycardia: stats.bradycardia?.count || 0,
    arrhythmia: stats.arrhythmia?.count || 0
  }
})

// 告警趋势
const alertTrend = computed(() => {
  // 简化计算：如果当前告警数多于5条，显示增加，否则显示减少
  const current = todayAlertCount.value
  if (current === 0) return -100
  if (current > 10) return 50
  if (current > 5) return 20
  return -10
})

// 人员统计
const personStats = computed(() => {
  return {
    total: personStatistics.value.total || 0,
    male: personStatistics.value.male || 0,
    female: personStatistics.value.female || 0
  }
})

// Top 部门
const topDepartments = computed(() => {
  const depts = personStatistics.value.departments || {}
  const total = personStatistics.value.total || 0
  
  return Object.entries(depts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// 快捷操作
const quickActions = computed(() => [
  {
    label: '人员管理',
    note: '档案、分组与在岗状态',
    route: '/person',
    badge: personStats.value.total > 0 ? personStats.value.total : null
  },
  {
    label: '设备管理',
    note: '在线/离线与维护',
    route: '/device',
    badge: deviceStatistics.value.offlineDevices > 0 ? `${deviceStatistics.value.offlineDevices} 离线` : null
  },
  {
    label: '人员雷达绑定',
    note: '绑定校验与同步',
    route: '/mapping',
    badge: mappingCount.value > 0 ? mappingCount.value : null
  },
  {
    label: '实时监测',
    note: '最新检测与刷新',
    route: '/realtime/vital'
  },
  {
    label: '历史数据',
    note: '趋势分析与导出',
    route: '/historical/vital'
  },
  {
    label: '告警处理',
    note: '等级筛选与闭环',
    route: '/alert/fall',
    badge: totalActiveAlerts.value > 0 ? totalActiveAlerts.value : null
  }
])

// ==================== 方法 ====================

// 格式化时间
function formatTime(dateString) {
  if (!dateString) return '--:--'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 更新当前时间
function updateCurrentTime() {
  const now = new Date()
  lastUpdateTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

// 加载设备数据
async function loadDeviceData() {
  try {
    await deviceStore.fetchDevices({ page: 1, size: 1000 })
    deviceList.value = deviceStore.deviceList || []
    
    // 统计设备状态
    const stats = {
      totalDevices: deviceList.value.length,
      onlineDevices: 0,
      offlineDevices: 0,
      maintenanceDevices: 0
    }
    
    deviceList.value.forEach(device => {
      if (device.status === 'ONLINE') stats.onlineDevices++
      else if (device.status === 'OFFLINE') stats.offlineDevices++
      else if (device.status === 'MAINTENANCE') stats.maintenanceDevices++
    })
    
    deviceStatistics.value = stats
  } catch (error) {
    console.warn('加载设备数据失败:', error)
  }
}

// 加载人员数据
async function loadPersonData() {
  try {
    await personStore.fetchPersons()
    personList.value = personStore.personList || []
    
    // 统计人员信息
    const stats = {
      total: personList.value.length,
      male: 0,
      female: 0,
      departments: {}
    }
    
    personList.value.forEach(person => {
      if (person.gender === 'Male') stats.male++
      else if (person.gender === 'Female') stats.female++
      
      const dept = person.department || '未分配'
      stats.departments[dept] = (stats.departments[dept] || 0) + 1
    })
    
    personStatistics.value = stats
  } catch (error) {
    console.warn('加载人员数据失败:', error)
  }
}

// 加载绑定数据
async function loadMappingData() {
  try {
    const response = await getPersonDeviceMappings({ page: 0, size: 1000 })
    const mappings = response.data?.content || response.data || []
    mappingCount.value = mappings.length
  } catch (error) {
    console.warn('加载绑定数据失败:', error)
    mappingCount.value = 0
  }
}

// 加载告警数据
async function loadAlertData() {
  try {
    // 加载跌倒告警
    await alertStore.fetchActiveFallAlerts()
    fallAlerts.value = alertStore.activeFallAlerts || []
    
    // 加载生命体征告警
    await alertStore.fetchRecentVitalsAlerts()
    vitalsAlerts.value = alertStore.recentVitalsAlerts || []
  } catch (error) {
    console.warn('加载告警数据失败:', error)
  }
}

// 加载所有数据
async function loadDashboardData() {
  try {
    await Promise.all([
      loadDeviceData(),
      loadPersonData(),
      loadMappingData(),
      loadAlertData()
    ])
    updateCurrentTime()
  } catch (error) {
    console.error('加载概览数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  }
}

// 刷新所有数据
async function handleRefreshAll() {
  if (refreshing.value) return
  
  refreshing.value = true
  try {
    await loadDashboardData()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 刷新告警数据
async function handleRefreshAlerts() {
  try {
    await loadAlertData()
    ElMessage.success('告警数据已更新')
  } catch (error) {
    ElMessage.error('刷新告警失败')
  }
}

// 切换自动刷新
function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value) {
    startAutoRefresh()
    ElMessage.success('已开启自动刷新（30秒）')
  } else {
    stopAutoRefresh()
    ElMessage.info('已暂停自动刷新')
  }
}

// 开启自动刷新
function startAutoRefresh() {
  if (refreshTimer.value) return
  
  refreshTimer.value = setInterval(async () => {
    console.log('自动刷新数据...')
    await loadAlertData()
    await loadDeviceData()
    updateCurrentTime()
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// 跳转到告警处理
function handleGoToAlert(alert) {
  router.push(alert.route)
}

// 快捷操作
function handleQuickAction(action) {
  if (action.route) {
    router.push(action.route)
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  initialLoading.value = true
  
  try {
    await loadDashboardData()
    if (autoRefresh.value) {
      startAutoRefresh()
    }
  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    initialLoading.value = false
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 24px;
}

.hero {
  position: relative;
  padding: 26px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.15), rgba(94, 233, 255, 0.18));
  border-radius: 18px;
  overflow: hidden;
  color: var(--text-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-actions {
  display: flex;
  gap: 10px;
  z-index: 1;
}

.eyebrow {
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
  color: var(--text-soft);
  margin: 0 0 4px;
}

h1 {
  margin: 0 0 12px;
  font-size: 26px;
}

h3 {
  margin: 0;
}

.lede {
  margin: 0 0 12px;
  color: var(--text-soft);
  max-width: 960px;
  line-height: 1.6;
}

.chips {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.chip {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: var(--text-strong);
  font-weight: 600;
  font-size: 13px;
}

.chip-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.chip-button {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: var(--text-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chip-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.chip-button .muted {
  text-align: left;
}

.action-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff6b6b;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.glow {
  position: absolute;
  right: -40px;
  bottom: -60px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(94, 233, 255, 0.35), rgba(132, 94, 247, 0.15), transparent 65%);
  filter: blur(8px);
  pointer-events: none;
}

.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.metrics .card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.card h3 {
  margin: 0;
  font-size: 16px;
}

.card p {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.55;
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-weight: 600;
  color: var(--text-strong);
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-strong);
}

.unit {
  color: var(--text-soft);
}

.meter {
  width: 100%;
  height: 8px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.3s ease;
}

.meta {
  font-size: 13px;
  color: var(--text-soft);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 12px;
}

.pill.positive {
  background: rgba(94, 233, 255, 0.18);
  color: #0c8599;
}

.pill.negative {
  background: rgba(255, 107, 107, 0.16);
  color: #c92a2a;
}

.pill.warning {
  background: rgba(255, 214, 102, 0.24);
  color: #ad6800;
}

.pill.subtle {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-soft);
}

.split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.large {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-soft);
}

.alert-row {
  padding: 10px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.alert-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list.tight {
  gap: 10px;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strong {
  color: var(--text-strong);
  margin: 0 0 2px;
  font-weight: 600;
}

.muted {
  color: var(--text-soft);
  font-size: 13px;
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}

button {
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(132, 94, 247, 0.25);
}

button.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 35px rgba(132, 94, 247, 0.3);
}

button.ghost {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-strong);
  padding: 10px 12px;
  border-radius: 12px;
}

button.ghost:hover {
  background: rgba(0, 0, 0, 0.08);
}

button.link {
  background: transparent;
  color: #5b8def;
  padding: 4px 8px;
}

button.link:hover {
  color: #4a7bd6;
  text-decoration: underline;
}

.status {
  gap: 16px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.status-card {
  padding: 12px;
  border-radius: 14px;
  color: var(--text-strong);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.status-value {
  font-size: 22px;
  font-weight: 700;
  margin: 6px 0 2px;
  color: var(--text-strong);
}

.chart {
  gap: 16px;
}

.alert-type-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-soft);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-value.critical {
  color: #ff6b6b;
}

.stat-value.warning {
  color: #ffa94d;
}

.stat-value.info {
  color: #5b8def;
}

.trend-summary {
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
  text-align: center;
}

.text-danger {
  color: #ff6b6b;
  font-weight: 600;
}

.text-success {
  color: #51cf66;
  font-weight: 600;
}

.person-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.person-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-strong);
}

.stat-text {
  font-size: 12px;
  color: var(--text-soft);
}

.alert-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quick .chips {
  margin-top: 10px;
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
  }
  
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-row {
    align-items: flex-start;
  }
  
  .alert-type-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
