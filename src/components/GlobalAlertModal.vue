<template>
  <Teleport to="body">
    <Transition name="alert-fade">
      <div v-if="currentAlert" class="global-alert-overlay" @click="handleOverlayClick">
        <!-- 跌倒警报 -->
        <div
          v-if="currentAlert.type === 'fall'"
          class="alert-modal fall-alert"
          :class="{ 'critical': currentAlert.data.severity === 'CRITICAL' }"
          @click.stop
        >
          <div class="alert-header">
            <div class="alert-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="alert-title-area">
              <h2 class="alert-title">{{ currentAlert.data.severityLabel || '高' }}级跌倒警报</h2>
              <p class="alert-subtitle">检测到人员跌倒，请立即处理</p>
            </div>
            <button class="close-btn" @click="handleDismiss" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div class="alert-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">人员</span>
                <span class="info-value">{{ currentAlert.data.personName || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">位置</span>
                <span class="info-value">{{ currentAlert.data.location || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备</span>
                <span class="info-value">{{ currentAlert.data.deviceId || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">时间</span>
                <span class="info-value">{{ formatTime(currentAlert.data.fallDetectedAt) }}</span>
              </div>
            </div>
            
            <div class="status-badge" :class="currentAlert.data.alertStatus?.toLowerCase()">
              {{ currentAlert.data.alertStatusLabel || '新警报' }}
            </div>
          </div>
          
          <div class="alert-actions">
            <button class="action-btn secondary" @click="handleMarkFalseAlarm">
              标记误报
            </button>
            <button class="action-btn primary" @click="handleGoToProcess">
              立即处理
            </button>
          </div>
        </div>
        
        <!-- 生命体征异常警报 -->
        <div
          v-else-if="currentAlert.type === 'vitals'"
          class="alert-modal vitals-alert"
          :class="{ 'critical': currentAlert.data.severity === 'CRITICAL' }"
          @click.stop
        >
          <div class="alert-header">
            <div class="alert-icon vitals-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7563 5.72718 21.351 5.12075 20.84 4.61V4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="alert-title-area">
              <h2 class="alert-title">生命体征异常</h2>
              <p class="alert-subtitle">{{ getAlertTypeText(currentAlert.data.alertType) }}</p>
            </div>
            <button class="close-btn" @click="handleDismiss" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div class="alert-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">人员</span>
                <span class="info-value">{{ currentAlert.data.personName || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">位置</span>
                <span class="info-value">{{ currentAlert.data.location || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备</span>
                <span class="info-value">{{ currentAlert.data.deviceId || '未知' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">检测时间</span>
                <span class="info-value">{{ formatTime(currentAlert.data.detectedAt) }}</span>
              </div>
            </div>
            
            <div class="severity-badge" :class="currentAlert.data.severity?.toLowerCase()">
              {{ currentAlert.data.severity === 'CRITICAL' ? '危急' : '高' }}
            </div>
          </div>
          
          <div class="alert-actions">
            <button class="action-btn secondary" @click="handleDismiss">
              知道了
            </button>
            <button class="action-btn primary" @click="handleGoToVitalsPage">
              查看详情
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertStore } from '@/stores/alert'
import { useUserStore } from '@/stores/user'
import { VITAL_ALERT_TYPE_MAP } from '@/api/alerts/vitals-alert'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const alertStore = useAlertStore()
const userStore = useUserStore()

// 当前警报
const currentAlert = computed(() => alertStore.currentAlert)

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '未知'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
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

// 获取异常类型文本
function getAlertTypeText(alertType) {
  return VITAL_ALERT_TYPE_MAP[alertType] || '未知异常'
}

// 关闭当前警报
function handleDismiss() {
  alertStore.dismissCurrentAlert()
}

// 点击遮罩层关闭（可选，根据需求决定是否启用）
function handleOverlayClick() {
  // 不自动关闭，要求用户明确操作
  // handleDismiss()
}

// 跌倒警报：去处理
async function handleGoToProcess() {
  if (!currentAlert.value || currentAlert.value.type !== 'fall') return
  
  const alertData = currentAlert.value.data
  const handlerBy = userStore.userInfo?.username || 'admin'
  
  try {
    // 标记为待处理
    await alertStore.markFallAlertPending(alertData.id, handlerBy, '正在前往查看')
    
    ElMessage.success('已标记为处理中')
    
    // 关闭当前警报
    handleDismiss()
    
    // 跳转到跌倒警报处理页面
    router.push('/alert/fall')
  } catch (error) {
    ElMessage.error('操作失败: ' + (error.message || '未知错误'))
  }
}

// 跌倒警报：标记误报
async function handleMarkFalseAlarm() {
  if (!currentAlert.value || currentAlert.value.type !== 'fall') return
  
  try {
    await ElMessageBox.prompt('请输入误报原因（可选）', '标记为误报', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如: 系鞋带动作误报'
    })
    .then(async ({ value }) => {
      const alertData = currentAlert.value.data
      const handlerBy = userStore.userInfo?.username || 'admin'
      const notes = value || '标记为误报'
      
      await alertStore.markFallAlertFalseAlarm(alertData.id, handlerBy, notes)
      
      ElMessage.success('已标记为误报')
      handleDismiss()
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  }
}

// 生命体征异常：查看详情
function handleGoToVitalsPage() {
  handleDismiss()
  router.push('/alert/vitals')
}
</script>

<style scoped>
.global-alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.alert-modal {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  max-width: 560px;
  width: 100%;
  overflow: hidden;
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 12px rgba(239, 68, 68, 0);
  }
}

.vitals-alert {
  animation: vitalsAlertPulse 2s ease-in-out infinite;
}

@keyframes vitalsAlertPulse {
  0%, 100% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(249, 115, 22, 0.7);
  }
  50% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 12px rgba(249, 115, 22, 0);
  }
}

/* 危急级别加强动画 */
.alert-modal.critical {
  animation: criticalPulse 1s ease-in-out infinite;
}

@keyframes criticalPulse {
  0%, 100% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(220, 38, 38, 0.9);
  }
  50% {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3), 0 0 0 16px rgba(220, 38, 38, 0);
  }
}

.alert-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 32px 32px 24px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.08));
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
}

.vitals-alert .alert-header {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.08));
  border-bottom: 1px solid rgba(249, 115, 22, 0.15);
}

.alert-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
}

.alert-icon svg {
  width: 32px;
  height: 32px;
}

.vitals-icon {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.15));
  color: #ea580c;
}

.alert-title-area {
  flex: 1;
  min-width: 0;
}

.alert-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}

.alert-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.close-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1f2937;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.alert-content {
  padding: 32px;
  position: relative;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 16px;
  color: #1f2937;
  font-weight: 600;
  word-break: break-word;
}

.status-badge,
.severity-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.new {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.status-badge.pending {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}

.severity-badge.critical,
.severity-badge.high {
  background: rgba(249, 115, 22, 0.15);
  color: #ea580c;
}

.alert-actions {
  display: flex;
  gap: 12px;
  padding: 0 32px 32px;
}

.action-btn {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
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
  box-shadow: 0 12px 24px rgba(239, 68, 68, 0.3);
}

.action-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: #4b5563;
}

.action-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.vitals-alert .action-btn.primary {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.vitals-alert .action-btn.primary:hover {
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.3);
}

/* 过渡动画 */
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.3s ease;
}

.alert-fade-enter-active .alert-modal,
.alert-fade-leave-active .alert-modal {
  transition: all 0.3s ease;
}

.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
}

.alert-fade-enter-from .alert-modal {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.alert-fade-leave-to .alert-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .alert-modal {
    max-width: 100%;
    border-radius: 20px;
  }
  
  .alert-header {
    padding: 24px 24px 20px;
  }
  
  .alert-content {
    padding: 24px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .alert-actions {
    flex-direction: column;
    padding: 0 24px 24px;
  }
}
</style>

