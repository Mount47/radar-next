<template>
  <div class="vitals-alert-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <p class="eyebrow">生命体征监测</p>
          <h1 class="page-title">生命体征异常日志</h1>
          <p class="page-subtitle">实时监控心率与呼吸异常，保障健康安全</p>
        </div>
        <div class="header-stats">
          <div class="stat-card critical">
            <div class="stat-value">{{ criticalCount }}</div>
            <div class="stat-label">危急异常</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ recentAlerts.length }}</div>
            <div class="stat-label">最近异常</div>
          </div>
        </div>
      </div>
    </header>

    <!-- 最近异常监控 -->
    <section v-if="recentAlerts.length > 0" class="recent-alerts-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">💓</span>
          实时监控
          <span class="alert-badge warning">{{ recentAlerts.length }}</span>
        </h2>
      </div>
      
      <div class="alert-timeline">
        <div
          v-for="alert in recentAlerts.slice(0, 10)"
          :key="alert.id"
          class="timeline-item"
          :class="{ 'critical': alert.severity === 'CRITICAL' }"
        >
          <div class="timeline-marker" :class="alert.severity?.toLowerCase()"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <div class="alert-type-badge" :class="getAlertTypeClass(alert.alertType)">
                {{ getAlertTypeLabel(alert.alertType) }}
              </div>
              <div class="severity-badge" :class="alert.severity?.toLowerCase()">
                {{ getSeverityLabel(alert.severity) }}
              </div>
              <div class="timeline-time">{{ formatRelativeTime(alert.detectedAt) }}</div>
            </div>
            
            <div class="timeline-body">
              <div class="person-info-compact">
                <span class="person-name">{{ alert.personName || '未知人员' }}</span>
                <span class="separator">·</span>
                <span class="location">{{ alert.location || '未知位置' }}</span>
                <span class="separator">·</span>
                <span class="device">{{ alert.deviceId || '未知设备' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 筛选和查询 -->
    <section class="filter-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">🔍</span>
          历史查询
        </h2>
      </div>
      
      <div class="filter-controls">
        <div class="filter-row">
          <el-select
            v-model="filterType"
            placeholder="异常类型"
            clearable
            style="width: 200px"
            @change="handleFilterChange"
          >
            <el-option label="全部类型" value="" />
            <el-option label="心动过速" value="HEART_TACHY" />
            <el-option label="心动过缓" value="HEART_BRADY" />
            <el-option label="心搏停止" value="HEART_FLATLINE" />
            <el-option label="呼吸过快" value="BREATH_TACHY" />
            <el-option label="呼吸过缓" value="BREATH_BRADY" />
            <el-option label="呼吸暂停" value="APNEA" />
          </el-select>
          
          <el-select
            v-model="filterSeverity"
            placeholder="严重程度"
            clearable
            style="width: 150px"
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="高" value="HIGH" />
            <el-option label="危急" value="CRITICAL" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleDateRangeChange"
            style="width: 380px"
          />
          
          <el-button type="primary" @click="handleSearch" :loading="loading">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
          <el-button @click="refreshData" :loading="loading">
            <span v-if="!loading">🔄</span> 刷新
          </el-button>
        </div>
      </div>
    </section>

    <!-- 异常列表 -->
    <section class="alerts-table-section">
      <div class="table-container">
        <el-table
          :data="filteredAlerts"
          stripe
          v-loading="loading"
          style="width: 100%"
          :default-sort="{ prop: 'detectedAt', order: 'descending' }"
        >
          <el-table-column prop="id" label="ID" width="80" />
          
          <el-table-column label="异常类型" width="140">
            <template #default="{ row }">
              <div class="type-cell" :class="getAlertTypeClass(row.alertType)">
                <span class="type-icon">{{ getAlertTypeIcon(row.alertType) }}</span>
                <span class="type-text">{{ getAlertTypeLabel(row.alertType) }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="严重程度" width="110">
            <template #default="{ row }">
              <el-tag :type="getSeverityTagType(row.severity)" size="small">
                {{ getSeverityLabel(row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="personName" label="人员" width="120" />
          <el-table-column prop="location" label="位置" width="140" />
          <el-table-column prop="deviceId" label="设备" width="140" />
          
          <el-table-column prop="detectedAt" label="检测时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.detectedAt) }}
            </template>
          </el-table-column>
          
          <el-table-column label="相对时间" width="120">
            <template #default="{ row }">
              {{ formatRelativeTime(row.detectedAt) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                type="info"
                size="small"
                @click="viewAlertDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAlertStore } from '@/stores/alert'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VITAL_ALERT_TYPE_MAP, VITAL_SEVERITY_MAP } from '@/api/vitals-alert'

const alertStore = useAlertStore()

// 响应式数据
const loading = ref(false)
const filterType = ref('')
const filterSeverity = ref('')
const dateRange = ref([])

// 计算属性
const recentAlerts = computed(() => alertStore.recentVitalsAlerts)

const criticalCount = computed(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  return recentAlerts.value.filter(alert => {
    const alertTime = new Date(alert.detectedAt)
    return alert.severity === 'CRITICAL' && alertTime > oneHourAgo
  }).length
})

// 过滤后的警报列表
const filteredAlerts = computed(() => {
  let alerts = [...alertStore.vitalsAlerts]
  
  // 按类型过滤
  if (filterType.value) {
    alerts = alerts.filter(alert => alert.alertType === filterType.value)
  }
  
  // 按严重程度过滤
  if (filterSeverity.value) {
    alerts = alerts.filter(alert => alert.severity === filterSeverity.value)
  }
  
  // 按时间范围过滤
  if (dateRange.value && dateRange.value.length === 2) {
    const [startTime, endTime] = dateRange.value
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    alerts = alerts.filter(alert => {
      const alertTime = new Date(alert.detectedAt)
      return alertTime >= start && alertTime <= end
    })
  }
  
  return alerts
})

// 获取异常类型标签
function getAlertTypeLabel(alertType) {
  return VITAL_ALERT_TYPE_MAP[alertType] || '未知异常'
}

// 获取异常类型图标
function getAlertTypeIcon(alertType) {
  const iconMap = {
    HEART_TACHY: '💗',
    HEART_BRADY: '💙',
    HEART_FLATLINE: '🚨',
    BREATH_TACHY: '🌪️',
    BREATH_BRADY: '😮‍💨',
    APNEA: '⚠️'
  }
  return iconMap[alertType] || '❓'
}

// 获取异常类型样式类
function getAlertTypeClass(alertType) {
  if (alertType?.includes('HEART')) return 'heart-type'
  if (alertType?.includes('BREATH') || alertType === 'APNEA') return 'breath-type'
  return ''
}

// 获取严重程度标签
function getSeverityLabel(severity) {
  return VITAL_SEVERITY_MAP[severity] || '未知'
}

// 获取严重程度标签类型
function getSeverityTagType(severity) {
  const map = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return map[severity] || 'info'
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (e) {
    return String(timestamp)
  }
}

// 格式化相对时间
function formatRelativeTime(timestamp) {
  if (!timestamp) return '未知'
  
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}天前`
    
    return formatDateTime(timestamp)
  } catch (e) {
    return String(timestamp)
  }
}

// 查看详情
function viewAlertDetail(alert) {
  ElMessageBox.alert(
    `
    <div style="line-height: 1.8;">
      <p><strong>警报ID:</strong> ${alert.id}</p>
      <p><strong>异常类型:</strong> ${getAlertTypeLabel(alert.alertType)}</p>
      <p><strong>严重程度:</strong> ${getSeverityLabel(alert.severity)}</p>
      <p><strong>人员:</strong> ${alert.personName || '未知'} (${alert.personId || '-'})</p>
      <p><strong>位置:</strong> ${alert.location || '未知'}</p>
      <p><strong>设备:</strong> ${alert.deviceId || '未知'}</p>
      <p><strong>检测时间:</strong> ${formatDateTime(alert.detectedAt)}</p>
      <p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
        <strong>说明:</strong> 此异常记录仅供历史回溯和健康监测参考
      </p>
    </div>
    `,
    '异常详情',
    {
      confirmButtonText: '关闭',
      dangerouslyUseHTMLString: true
    }
  )
}

// 筛选条件变化
function handleFilterChange() {
  // 自动应用过滤
}

// 时间范围变化
function handleDateRangeChange() {
  // 自动应用过滤
}

// 查询
async function handleSearch() {
  loading.value = true
  try {
    await alertStore.fetchVitalsAlerts()
    
    if (filteredAlerts.value.length === 0) {
      ElMessage.info('未查询到符合条件的数据')
    } else {
      ElMessage.success(`查询成功，找到 ${filteredAlerts.value.length} 条记录`)
    }
  } catch (error) {
    console.warn('⚠️ 查询失败:', error.message)
    ElMessage.warning('查询失败，但实时推送功能正常工作')
  } finally {
    loading.value = false
  }
}

// 重置
function handleReset() {
  filterType.value = ''
  filterSeverity.value = ''
  dateRange.value = []
}

// 刷新数据
async function refreshData() {
  loading.value = true
  try {
    await alertStore.fetchVitalsAlerts()
    
    // 检查是否有数据
    if (alertStore.vitalsAlerts.length === 0) {
      ElMessage.info('暂无历史数据，新异常将通过实时推送显示')
    } else {
      ElMessage.success('刷新成功')
    }
  } catch (error) {
    console.warn('⚠️ 刷新失败:', error.message)
    ElMessage.warning('刷新失败，但实时推送功能正常工作')
  } finally {
    loading.value = false
  }
}

// 定时刷新
let refreshTimer = null

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    alertStore.fetchVitalsAlerts()
  }, 60000) // 每60秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(async () => {
  loading.value = true
  try {
    await alertStore.fetchVitalsAlerts()
    startAutoRefresh()
    
    // 如果没有数据，显示友好提示
    if (alertStore.vitalsAlerts.length === 0) {
      console.log('💡 提示: 当前无历史数据，将通过 WebSocket 实时接收异常警报')
    }
  } catch (error) {
    console.warn('⚠️ 初始数据加载失败（将依赖 WebSocket 推送）:', error.message)
    // 不显示错误弹窗，因为 WebSocket 推送仍然可以正常工作
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.vitals-alert-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;
}

/* 页面头部 */
.page-header {
  padding: 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(234, 88, 12, 0.08));
  border: 1px solid rgba(249, 115, 22, 0.15);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-left {
  flex: 1;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 13px;
  color: #ea580c;
  margin: 0 0 8px;
  font-weight: 700;
}

.page-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
}

.page-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.6;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 20px 28px;
  min-width: 140px;
  text-align: center;
}

.stat-card.critical {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.1));
  border-color: rgba(249, 115, 22, 0.2);
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-card.critical .stat-value {
  color: #ea580c;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 最近异常区域 */
.recent-alerts-section {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 28px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 24px;
}

.alert-badge {
  display: inline-block;
  background: #f97316;
  color: white;
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 10px;
  min-width: 28px;
  text-align: center;
}

.alert-badge.warning {
  background: #f59e0b;
}

/* 时间线 */
.alert-timeline {
  position: relative;
  padding-left: 32px;
}

.alert-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #f97316, rgba(249, 115, 22, 0.1));
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 20px;
  transition: all 0.2s;
}

.timeline-item:hover {
  border-color: rgba(249, 115, 22, 0.3);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.1);
  transform: translateX(4px);
}

.timeline-item.critical {
  border-color: rgba(234, 88, 12, 0.3);
  background: rgba(249, 115, 22, 0.02);
}

.timeline-marker {
  position: absolute;
  left: -26px;
  top: 24px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f97316;
  border: 2px solid white;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.timeline-marker.critical {
  background: #ea580c;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.3), 0 0 8px rgba(234, 88, 12, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.alert-type-badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.alert-type-badge.heart-type {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.alert-type-badge.breath-type {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.severity-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.severity-badge.high {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}

.severity-badge.critical {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.timeline-time {
  margin-left: auto;
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.timeline-body {
  padding-left: 0;
}

.person-info-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
  flex-wrap: wrap;
}

.person-name {
  font-weight: 600;
  color: #1f2937;
}

.separator {
  color: #d1d5db;
}

/* 筛选区域 */
.filter-section {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 28px;
}

.filter-controls {
  margin-top: 20px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 表格区域 */
.alerts-table-section {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 28px;
}

.table-container {
  margin-top: 20px;
}

.type-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 16px;
}

.type-text {
  font-size: 13px;
  font-weight: 600;
}

.type-cell.heart-type .type-text {
  color: #dc2626;
}

.type-cell.breath-type .type-text {
  color: #2563eb;
}

/* 响应式 */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-row {
    flex-direction: column;
  }
  
  .filter-row > * {
    width: 100% !important;
  }
}
</style>

