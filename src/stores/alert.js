import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getActiveFallAlerts,
  getAllFallAlerts,
  getFallAlertStatistics,
  markFallAlertAsPending,
  markFallAlertAsResolved,
  markFallAlertAsFalseAlarm
} from '@/api/alerts/fall-alert'
import {
  getVitalsAlerts
} from '@/api/alerts/vitals-alert'

export const useAlertStore = defineStore('alert', () => {
  // ==================== 跌倒警报状态 ====================
  const fallAlerts = ref([])
  const activeFallAlerts = ref([])
  const fallAlertStatistics = ref({
    activeCount: 0,
    todayCount: 0,
    todayActiveCount: 0
  })
  
  // ==================== 生命体征异常状态 ====================
  const vitalsAlerts = ref([])
  const recentVitalsAlerts = ref([]) // 最近的异常（用于实时监控）
  
  // ==================== 全局警报队列 ====================
  // 用于全局弹窗显示
  const globalAlertQueue = ref([])
  
  // ==================== 计算属性 ====================
  
  // 未读跌倒警报数量
  const unreadFallAlertCount = computed(() => {
    return activeFallAlerts.value.filter(alert => alert.alertStatus === 'NEW').length
  })
  
  // 总未处理警报数（跌倒）
  const totalActiveFallAlertCount = computed(() => {
    return activeFallAlerts.value.length
  })
  
  // CRITICAL 级别的生命体征异常数量（最近1小时）
  const criticalVitalsAlertCount = computed(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return recentVitalsAlerts.value.filter(alert => {
      const alertTime = new Date(alert.detectedAt)
      return alert.severity === 'CRITICAL' && alertTime > oneHourAgo
    }).length
  })
  
  // ==================== 跌倒警报操作 ====================
  
  // 获取活跃跌倒警报
  async function fetchActiveFallAlerts() {
    try {
      const response = await getActiveFallAlerts()
      activeFallAlerts.value = response.data || []
      return activeFallAlerts.value
    } catch (error) {
      console.warn('⚠️ 获取活跃跌倒警报失败（可能后端接口未实现）:', error.message)
      // 不抛出错误，允许 WebSocket 继续工作
      activeFallAlerts.value = []
      return []
    }
  }
  
  // 获取所有跌倒警报（历史记录）
  async function fetchAllFallAlerts() {
    try {
      const response = await getAllFallAlerts()
      fallAlerts.value = response.data || []
      return fallAlerts.value
    } catch (error) {
      console.warn('⚠️ 获取所有跌倒警报失败（可能后端接口未实现）:', error.message)
      // 不抛出错误，允许 WebSocket 继续工作
      fallAlerts.value = []
      return []
    }
  }
  
  // 获取跌倒警报统计
  async function fetchFallAlertStatistics() {
    try {
      const response = await getFallAlertStatistics()
      fallAlertStatistics.value = response.data || {
        activeCount: 0,
        todayCount: 0,
        todayActiveCount: 0
      }
      return fallAlertStatistics.value
    } catch (error) {
      console.warn('⚠️ 获取跌倒警报统计失败（可能后端接口未实现）:', error.message)
      // 不抛出错误，设置默认值
      fallAlertStatistics.value = {
        activeCount: 0,
        todayCount: 0,
        todayActiveCount: 0
      }
      return fallAlertStatistics.value
    }
  }
  
  // 标记跌倒警报为待解决
  async function markFallAlertPending(alertId, handlerBy, notes = '') {
    try {
      await markFallAlertAsPending(alertId, { handlerBy, notes })
      // 更新本地状态
      updateLocalFallAlertStatus(alertId, 'PENDING')
      await fetchActiveFallAlerts()
      await fetchFallAlertStatistics()
    } catch (error) {
      console.error('标记跌倒警报为待解决失败:', error)
      throw error
    }
  }
  
  // 标记跌倒警报为已解决
  async function markFallAlertResolved(alertId, handlerBy, notes = '') {
    try {
      await markFallAlertAsResolved(alertId, { handlerBy, notes })
      updateLocalFallAlertStatus(alertId, 'RESOLVED')
      await fetchActiveFallAlerts()
      await fetchFallAlertStatistics()
    } catch (error) {
      console.error('标记跌倒警报为已解决失败:', error)
      throw error
    }
  }
  
  // 标记跌倒警报为误报
  async function markFallAlertFalseAlarm(alertId, handlerBy, notes = '') {
    try {
      await markFallAlertAsFalseAlarm(alertId, { handlerBy, notes })
      updateLocalFallAlertStatus(alertId, 'FALSE_ALARM')
      await fetchActiveFallAlerts()
      await fetchFallAlertStatistics()
    } catch (error) {
      console.error('标记跌倒警报为误报失败:', error)
      throw error
    }
  }
  
  // 更新本地跌倒警报状态
  function updateLocalFallAlertStatus(alertId, newStatus) {
    // 更新活跃列表
    const activeIndex = activeFallAlerts.value.findIndex(alert => alert.id === alertId)
    if (activeIndex !== -1) {
      activeFallAlerts.value[activeIndex].alertStatus = newStatus
      activeFallAlerts.value[activeIndex].isActive = (newStatus === 'NEW' || newStatus === 'PENDING')
      
      // 如果已解决或误报，从活跃列表移除
      if (newStatus === 'RESOLVED' || newStatus === 'FALSE_ALARM') {
        activeFallAlerts.value.splice(activeIndex, 1)
      }
    }
    
    // 更新总列表
    const allIndex = fallAlerts.value.findIndex(alert => alert.id === alertId)
    if (allIndex !== -1) {
      fallAlerts.value[allIndex].alertStatus = newStatus
      fallAlerts.value[allIndex].isActive = (newStatus === 'NEW' || newStatus === 'PENDING')
    }
    
    // 从全局警报队列移除
    removeFromGlobalQueue(alertId)
  }
  
  // ==================== 生命体征异常操作 ====================
  
  // 获取所有生命体征异常
  async function fetchVitalsAlerts(params = {}) {
    try {
      const response = await getVitalsAlerts(params)
      vitalsAlerts.value = response.data || []
      return vitalsAlerts.value
    } catch (error) {
      console.warn('⚠️ 获取生命体征异常失败（可能后端接口未实现）:', error.message)
      // 不抛出错误，允许 WebSocket 继续工作
      vitalsAlerts.value = []
      return []
    }
  }
  
  // 获取最近的生命体征异常（用于概览页面）
  async function fetchRecentVitalsAlerts() {
    try {
      const response = await getVitalsAlerts({ limit: 50 })
      const alerts = response.data || []
      recentVitalsAlerts.value = alerts
      return alerts
    } catch (error) {
      console.warn('⚠️ 获取最近生命体征异常失败（可能后端接口未实现）:', error.message)
      recentVitalsAlerts.value = []
      return []
    }
  }
  
  // ==================== WebSocket 实时推送处理 ====================
  
  // 处理跌倒警报推送
  function handleFallAlertPush(alertData) {
    console.log('📨 收到跌倒警报推送:', alertData)
    
    // 检查是否已存在
    const existingIndex = activeFallAlerts.value.findIndex(alert => alert.id === alertData.id)
    
    if (existingIndex !== -1) {
      // 更新现有警报
      activeFallAlerts.value[existingIndex] = alertData
    } else {
      // 添加新警报
      activeFallAlerts.value.unshift(alertData)
    }
    
    // 如果是活跃警报，添加到全局队列
    if (alertData.isActive && alertData.alertStatus === 'NEW') {
      addToGlobalQueue({
        type: 'fall',
        data: alertData
      })
    }
    
    // 更新统计
    fetchFallAlertStatistics()
  }
  
  // 处理生命体征异常推送
  function handleVitalsAlertPush(alertData) {
    console.log('📨 收到生命体征异常推送:', alertData)
    
    // 添加到最近异常列表
    recentVitalsAlerts.value.unshift(alertData)
    
    // 保持最近列表不超过50条
    if (recentVitalsAlerts.value.length > 50) {
      recentVitalsAlerts.value = recentVitalsAlerts.value.slice(0, 50)
    }
    
    // 如果是 CRITICAL 级别，添加到全局队列
    if (alertData.severity === 'CRITICAL') {
      addToGlobalQueue({
        type: 'vitals',
        data: alertData
      })
    }
  }
  
  // ==================== 全局警报队列管理 ====================
  
  // 添加到全局警报队列
  function addToGlobalQueue(alert) {
    // 检查是否已存在（避免重复）
    const exists = globalAlertQueue.value.some(item => {
      if (item.type === alert.type) {
        return item.data.id === alert.data.id
      }
      return false
    })
    
    if (!exists) {
      globalAlertQueue.value.push({
        ...alert,
        timestamp: Date.now()
      })
    }
  }
  
  // 从全局队列移除
  function removeFromGlobalQueue(alertId) {
    globalAlertQueue.value = globalAlertQueue.value.filter(item => item.data.id !== alertId)
  }
  
  // 移除队列中的第一个警报
  function dismissCurrentAlert() {
    if (globalAlertQueue.value.length > 0) {
      globalAlertQueue.value.shift()
    }
  }
  
  // 清空全局队列
  function clearGlobalQueue() {
    globalAlertQueue.value = []
  }
  
  // 获取当前应该显示的警报
  const currentAlert = computed(() => {
    return globalAlertQueue.value.length > 0 ? globalAlertQueue.value[0] : null
  })
  
  // ==================== 初始化 ====================
  
  async function initialize() {
    console.log('🚀 初始化警报系统...')
    
    try {
      // 使用 Promise.allSettled 代替 Promise.all，这样即使某些 API 失败也不会影响其他
      const results = await Promise.allSettled([
        fetchActiveFallAlerts(),
        fetchFallAlertStatistics(),
        fetchVitalsAlerts({ limit: 50 }) // 获取最近50条
      ])
      
      // 记录哪些 API 成功，哪些失败
      results.forEach((result, index) => {
        const apiNames = ['活跃跌倒警报', '跌倒警报统计', '生命体征异常']
        if (result.status === 'fulfilled') {
          console.log(`✅ ${apiNames[index]} API 加载成功`)
        } else {
          console.warn(`⚠️ ${apiNames[index]} API 加载失败（将依赖 WebSocket 推送）:`, result.reason?.message)
        }
      })
      
      // 将最近的生命体征异常加入监控列表
      recentVitalsAlerts.value = vitalsAlerts.value.slice(0, 50)
      
      console.log('✅ 警报系统初始化完成（WebSocket 推送功能已就绪）')
    } catch (error) {
      console.error('❌ 警报 Store 初始化出现意外错误:', error)
    }
  }
  
  return {
    // 状态
    fallAlerts,
    activeFallAlerts,
    fallAlertStatistics,
    vitalsAlerts,
    recentVitalsAlerts,
    globalAlertQueue,
    currentAlert,
    
    // 计算属性
    unreadFallAlertCount,
    totalActiveFallAlertCount,
    criticalVitalsAlertCount,
    
    // 跌倒警报操作
    fetchActiveFallAlerts,
    fetchAllFallAlerts,
    fetchFallAlertStatistics,
    markFallAlertPending,
    markFallAlertResolved,
    markFallAlertFalseAlarm,
    updateLocalFallAlertStatus,
    
    // 生命体征异常操作
    fetchVitalsAlerts,
    fetchRecentVitalsAlerts,
    
    // WebSocket 推送处理
    handleFallAlertPush,
    handleVitalsAlertPush,
    
    // 全局队列管理
    addToGlobalQueue,
    removeFromGlobalQueue,
    dismissCurrentAlert,
    clearGlobalQueue,
    
    // 初始化
    initialize
  }
})

