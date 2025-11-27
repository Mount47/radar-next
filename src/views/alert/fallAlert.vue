<template>
  <div class="fall-alert-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <p class="eyebrow">跌倒警报</p>
          <h1 class="page-title">跌倒警报处理中心</h1>
          <p class="page-subtitle">实时监控与快速响应，确保人员安全</p>
        </div>
        <div class="header-stats">
          <div class="stat-card urgent">
            <div class="stat-value">{{ statistics.activeCount || 0 }}</div>
            <div class="stat-label">活跃警报</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ statistics.todayCount || 0 }}</div>
            <div class="stat-label">今日警报</div>
          </div>
        </div>
      </div>
    </header>

    <!-- 活跃警报区域 -->
    <section v-if="activeAlerts.length > 0" class="active-alerts-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon urgent">🚨</span>
          活跃警报
          <span class="alert-badge">{{ activeAlerts.length }}</span>
        </h2>
      </div>
      
      <div class="alert-cards-grid">
        <div
          v-for="alert in activeAlerts"
          :key="alert.id"
          class="alert-card"
          :class="[
            alert.alertStatus?.toLowerCase(),
            { 'critical': alert.severity === 'CRITICAL' }
          ]"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="severity-indicator" :class="alert.severity?.toLowerCase()">
              {{ getSeverityLabel(alert.severity) }}
            </div>
            <div class="status-indicator" :class="alert.alertStatus?.toLowerCase()">
              {{ getStatusLabel(alert.alertStatus) }}
            </div>
          </div>
          
          <!-- 卡片内容 -->
          <div class="card-body">
            <div class="person-info">
              <div class="person-avatar">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="person-details">
                <div class="person-name">{{ alert.personName || '未知人员' }}</div>
                <div class="person-id">ID: {{ alert.personId || '-' }}</div>
              </div>
            </div>
            
            <div class="alert-details">
              <div class="detail-item">
                <span class="detail-icon">📍</span>
                <span class="detail-label">位置</span>
                <span class="detail-value">{{ alert.location || '未知' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">📱</span>
                <span class="detail-label">设备</span>
                <span class="detail-value">{{ alert.deviceId || '未知' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">⏰</span>
                <span class="detail-label">检测时间</span>
                <span class="detail-value">{{ formatAlertTime(alert.fallDetectedAt) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 卡片操作 -->
          <div class="card-actions">
            <button
              v-if="alert.alertStatus === 'NEW'"
              class="action-btn primary"
              @click="handleMarkAsPending(alert)"
            >
              立即处理
            </button>
            <button
              v-if="alert.alertStatus === 'PENDING'"
              class="action-btn success"
              @click="handleMarkAsResolved(alert)"
            >
              标记已解决
            </button>
            <button
              class="action-btn secondary"
              @click="handleMarkAsFalseAlarm(alert)"
            >
              误报
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <section v-else class="empty-state">
      <div class="empty-icon">✅</div>
      <h3 class="empty-title">当前无活跃警报</h3>
      <p class="empty-text">所有警报已处理完毕，系统运行正常</p>
    </section>

    <!-- 历史记录区域 -->
    <section class="history-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">📋</span>
          历史记录
        </h2>
        <div class="section-actions">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleDateRangeChange"
          />
          <el-button @click="refreshAllAlerts" :loading="loading">
            <span v-if="!loading">🔄</span> 刷新
          </el-button>
        </div>
      </div>
      
      <div class="history-table-container">
        <el-table
          :data="filteredAlerts"
          stripe
          v-loading="loading"
          style="width: 100%"
          :default-sort="{ prop: 'fallDetectedAt', order: 'descending' }"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="personName" label="人员" width="120" />
          <el-table-column prop="location" label="位置" width="140" />
          <el-table-column prop="deviceId" label="设备" width="140" />
          <el-table-column label="严重程度" width="100">
            <template #default="{ row }">
              <el-tag :type="getSeverityTagType(row.severity)" size="small">
                {{ getSeverityLabel(row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.alertStatus)" size="small">
                {{ getStatusLabel(row.alertStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="fallDetectedAt" label="检测时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.fallDetectedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="持续时间" width="100">
            <template #default="{ row }">
              {{ calculateDuration(row.fallDetectedAt, row.resolvedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.alertStatus === 'NEW'"
                type="primary"
                size="small"
                @click="handleMarkAsPending(row)"
              >
                处理
              </el-button>
              <el-button
                v-if="row.alertStatus === 'PENDING'"
                type="success"
                size="small"
                @click="handleMarkAsResolved(row)"
              >
                已解决
              </el-button>
              <el-button
                v-if="row.alertStatus === 'NEW' || row.alertStatus === 'PENDING'"
                type="warning"
                size="small"
                @click="handleMarkAsFalseAlarm(row)"
              >
                误报
              </el-button>
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
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ALERT_STATUS_MAP, SEVERITY_MAP } from '@/api/fall-alert'

const alertStore = useAlertStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const dateRange = ref([])
const allAlerts = ref([])

// 计算属性
const statistics = computed(() => alertStore.fallAlertStatistics)
const activeAlerts = computed(() => alertStore.activeFallAlerts)

// 过滤后的警报（根据时间范围）
const filteredAlerts = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    return allAlerts.value
  }
  
  const [startTime, endTime] = dateRange.value
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  return allAlerts.value.filter(alert => {
    const alertTime = new Date(alert.fallDetectedAt)
    return alertTime >= start && alertTime <= end
  })
})

// 获取严重程度标签
function getSeverityLabel(severity) {
  return SEVERITY_MAP[severity] || '未知'
}

// 获取状态标签
function getStatusLabel(status) {
  return ALERT_STATUS_MAP[status] || '未知'
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

// 获取状态标签类型
function getStatusTagType(status) {
  const map = {
    NEW: 'danger',
    PENDING: 'warning',
    RESOLVED: 'success',
    FALSE_ALARM: 'info'
  }
  return map[status] || 'info'
}

// 格式化警报时间（相对时间）
function formatAlertTime(timestamp) {
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
    return `${diffDays}天前`
  } catch (e) {
    return String(timestamp)
  }
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

// 计算持续时间
function calculateDuration(startTime, endTime) {
  if (!startTime) return '-'
  
  try {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const durationMs = end - start
    const minutes = Math.floor(durationMs / 60000)
    
    if (minutes < 60) return `${minutes}分钟`
    
    const hours = Math.floor(minutes / 60)
    const remainMinutes = minutes % 60
    return `${hours}小时${remainMinutes}分钟`
  } catch (e) {
    return '-'
  }
}

// 标记为待处理
async function handleMarkAsPending(alert) {
  const handlerBy = userStore.userInfo?.username || 'admin'
  
  try {
    await ElMessageBox.prompt('请输入处理备注（可选）', '开始处理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如: 正在前往查看'
    })
    .then(async ({ value }) => {
      const notes = value || '开始处理'
      loading.value = true
      
      await alertStore.markFallAlertPending(alert.id, handlerBy, notes)
      
      ElMessage.success('已标记为处理中')
      await refreshData()
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 标记为已解决
async function handleMarkAsResolved(alert) {
  const handlerBy = userStore.userInfo?.username || 'admin'
  
  try {
    await ElMessageBox.prompt('请输入处理结果', '确认已解决', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如: 老人滑倒，已扶起并确认无大碍',
      inputType: 'textarea'
    })
    .then(async ({ value }) => {
      if (!value || value.trim() === '') {
        ElMessage.warning('请输入处理结果')
        return
      }
      
      loading.value = true
      await alertStore.markFallAlertResolved(alert.id, handlerBy, value)
      
      ElMessage.success('已标记为已解决')
      await refreshData()
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 标记为误报
async function handleMarkAsFalseAlarm(alert) {
  const handlerBy = userStore.userInfo?.username || 'admin'
  
  try {
    await ElMessageBox.prompt('请输入误报原因', '标记为误报', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如: 系鞋带动作误报'
    })
    .then(async ({ value }) => {
      const notes = value || '标记为误报'
      loading.value = true
      
      await alertStore.markFallAlertFalseAlarm(alert.id, handlerBy, notes)
      
      ElMessage.success('已标记为误报')
      await refreshData()
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 查看详情
function viewAlertDetail(alert) {
  ElMessageBox.alert(
    `
    <div style="line-height: 1.8;">
      <p><strong>警报ID:</strong> ${alert.id}</p>
      <p><strong>人员:</strong> ${alert.personName || '未知'} (${alert.personId || '-'})</p>
      <p><strong>位置:</strong> ${alert.location || '未知'}</p>
      <p><strong>设备:</strong> ${alert.deviceId || '未知'}</p>
      <p><strong>严重程度:</strong> ${getSeverityLabel(alert.severity)}</p>
      <p><strong>状态:</strong> ${getStatusLabel(alert.alertStatus)}</p>
      <p><strong>检测时间:</strong> ${formatDateTime(alert.fallDetectedAt)}</p>
      ${alert.resolvedAt ? `<p><strong>解决时间:</strong> ${formatDateTime(alert.resolvedAt)}</p>` : ''}
      ${alert.handlerBy ? `<p><strong>处理人:</strong> ${alert.handlerBy}</p>` : ''}
      ${alert.notes ? `<p><strong>备注:</strong> ${alert.notes}</p>` : ''}
    </div>
    `,
    '警报详情',
    {
      confirmButtonText: '关闭',
      dangerouslyUseHTMLString: true
    }
  )
}

// 时间范围变化
function handleDateRangeChange() {
  // 过滤逻辑在 computed 中处理
}

// 刷新所有警报
async function refreshAllAlerts() {
  loading.value = true
  try {
    await refreshData()
    
    // 检查是否有数据
    if (activeAlerts.value.length === 0 && allAlerts.value.length === 0) {
      ElMessage.info('暂无历史数据，新警报将通过实时推送显示')
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

// 刷新数据
async function refreshData() {
  await Promise.all([
    alertStore.fetchActiveFallAlerts(),
    alertStore.fetchAllFallAlerts(),
    alertStore.fetchFallAlertStatistics()
  ])
  allAlerts.value = alertStore.fallAlerts
}

// 定时刷新
let refreshTimer = null

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    refreshData()
  }, 30000) // 每30秒刷新一次
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
    await refreshData()
    startAutoRefresh()
    
    // 如果没有数据，显示友好提示
    if (activeAlerts.value.length === 0 && allAlerts.value.length === 0) {
      console.log('💡 提示: 当前无历史数据，将通过 WebSocket 实时接收警报')
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
.fall-alert-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;
}

/* 页面头部 */
.page-header {
  padding: 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.15);
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
  color: #dc2626;
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

.stat-card.urgent {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  border-color: rgba(239, 68, 68, 0.2);
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-card.urgent .stat-value {
  color: #dc2626;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 活跃警报区域 */
.active-alerts-section {
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

.title-icon.urgent {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.alert-badge {
  display: inline-block;
  background: #dc2626;
  color: white;
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 10px;
  min-width: 28px;
  text-align: center;
}

.section-actions {
  display: flex;
  gap: 12px;
}

/* 警报卡片网格 */
.alert-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.alert-card {
  background: white;
  border: 2px solid rgba(239, 68, 68, 0.2);
  border-radius: 18px;
  padding: 24px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.alert-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.alert-card.critical {
  border-color: rgba(220, 38, 38, 0.4);
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.15);
}

.alert-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(239, 68, 68, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.severity-indicator,
.status-indicator {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.severity-indicator.high,
.severity-indicator.critical {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.severity-indicator.medium {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}

.status-indicator.new {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.status-indicator.pending {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}

.card-body {
  margin-bottom: 20px;
}

.person-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.person-avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  flex-shrink: 0;
}

.person-avatar svg {
  width: 28px;
  height: 28px;
}

.person-details {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.person-id {
  font-size: 13px;
  color: #9ca3af;
}

.alert-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: grid;
  grid-template-columns: 24px 60px 1fr;
  gap: 8px;
  align-items: center;
}

.detail-icon {
  font-size: 16px;
}

.detail-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  height: 42px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
}

.action-btn.success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.action-btn.success:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
}

.action-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: #6b7280;
}

.action-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 空状态 */
.empty-state {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 80px 40px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.empty-text {
  margin: 0;
  font-size: 15px;
  color: #9ca3af;
}

/* 历史记录区域 */
.history-section {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 28px;
}

.history-table-container {
  margin-top: 20px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .alert-cards-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
