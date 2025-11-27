<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import GlobalHeader from './components/GlobalHeader.vue'
import GlobalAlertModal from './components/GlobalAlertModal.vue'
import { useAlertStore } from './stores/alert'

const alertStore = useAlertStore()

// WebSocket 连接实例
let fallAlertWs = null
let vitalsAlertWs = null

// 初始化 WebSocket 连接
function initWebSockets() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const serverIp = import.meta.env.VITE_APP_SERVER_IP || 'localhost'
  const serverPort = import.meta.env.VITE_APP_SERVER_PORT || '8080'
  
  // 跌倒警报 WebSocket
  const fallAlertUrl = `${protocol}//${serverIp}:${serverPort}/ws/fall-alert`
  console.log('🔗 连接跌倒警报 WebSocket:', fallAlertUrl)
  
  fallAlertWs = new WebSocket(fallAlertUrl)
  let fallHeartbeat = null
  
  fallAlertWs.onopen = () => {
    console.log('✅ 跌倒警报 WebSocket 连接成功')
    
    // 心跳
    fallHeartbeat = setInterval(() => {
      if (fallAlertWs && fallAlertWs.readyState === WebSocket.OPEN) {
        fallAlertWs.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }
  
  fallAlertWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'welcome':
          console.log('✅ 跌倒警报服务器欢迎消息')
          break
        
        case 'fall_alert':
          console.log('🚨 收到跌倒警报推送:', message.data)
          alertStore.handleFallAlertPush(message.data)
          break
        
        case 'alert_status_update':
          console.log('🔄 跌倒警报状态更新:', message.data)
          alertStore.handleFallAlertPush(message.data)
          break
        
        case 'pong':
          // 心跳响应
          break
        
        default:
          console.warn('未知消息类型:', message.type)
      }
    } catch (error) {
      console.error('❌ 解析跌倒警报消息失败:', error)
    }
  }
  
  fallAlertWs.onerror = (error) => {
    console.error('❌ 跌倒警报 WebSocket 错误:', error)
  }
  
  fallAlertWs.onclose = () => {
    console.log('🔌 跌倒警报 WebSocket 连接关闭')
    if (fallHeartbeat) {
      clearInterval(fallHeartbeat)
    }
    
    // 尝试重连（5秒后）
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 尝试重新连接跌倒警报 WebSocket...')
        initWebSockets()
      }
    }, 5000)
  }
  
  // 生命体征异常 WebSocket
  const vitalsAlertUrl = `${protocol}//${serverIp}:${serverPort}/ws/vitals-alert`
  console.log('🔗 连接生命体征异常 WebSocket:', vitalsAlertUrl)
  
  vitalsAlertWs = new WebSocket(vitalsAlertUrl)
  let vitalsHeartbeat = null
  
  vitalsAlertWs.onopen = () => {
    console.log('✅ 生命体征异常 WebSocket 连接成功')
    
    // 心跳
    vitalsHeartbeat = setInterval(() => {
      if (vitalsAlertWs && vitalsAlertWs.readyState === WebSocket.OPEN) {
        vitalsAlertWs.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }
  
  vitalsAlertWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'welcome':
          console.log('✅ 生命体征异常服务器欢迎消息')
          break
        
        case 'vitals_alert':
          console.log('💓 收到生命体征异常推送:', message.data)
          alertStore.handleVitalsAlertPush(message.data)
          break
        
        case 'pong':
          // 心跳响应
          break
        
        default:
          console.warn('未知消息类型:', message.type)
      }
    } catch (error) {
      console.error('❌ 解析生命体征异常消息失败:', error)
    }
  }
  
  vitalsAlertWs.onerror = (error) => {
    console.error('❌ 生命体征异常 WebSocket 错误:', error)
  }
  
  vitalsAlertWs.onclose = () => {
    console.log('🔌 生命体征异常 WebSocket 连接关闭')
    if (vitalsHeartbeat) {
      clearInterval(vitalsHeartbeat)
    }
    
    // 尝试重连（5秒后）
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 尝试重新连接生命体征异常 WebSocket...')
        initWebSockets()
      }
    }, 5000)
  }
}

// 关闭 WebSocket 连接
function closeWebSockets() {
  if (fallAlertWs) {
    fallAlertWs.close()
    fallAlertWs = null
  }
  
  if (vitalsAlertWs) {
    vitalsAlertWs.close()
    vitalsAlertWs = null
  }
}

// 页面可见性变化处理
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // 页面可见时，检查连接状态
    if (!fallAlertWs || fallAlertWs.readyState !== WebSocket.OPEN) {
      console.log('🔄 页面重新可见，重新连接 WebSocket...')
      initWebSockets()
    }
  }
}

// 生命周期
onMounted(async () => {
  console.log('🚀 应用启动，初始化警报系统...')
  
  // 初始化警报 Store
  await alertStore.initialize()
  
  // 初始化 WebSocket 连接
  initWebSockets()
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  console.log('👋 应用卸载，关闭 WebSocket 连接...')
  
  // 关闭 WebSocket
  closeWebSockets()
  
  // 移除事件监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="app-shell">
    <GlobalHeader />
    <main class="app-main">
      <div class="content-surface">
        <RouterView />
      </div>
    </main>
    
    <!-- 全局警报弹窗 -->
    <GlobalAlertModal />
  </div>
</template>

<style>
:root {
  --primary-500: #845ef7;
  --primary-600: #734bd3;
  --primary-700: #5f3dc4;
  --accent-500: #5ee9ff;
  --accent-600: #35d1ff;
  --bg-soft: #f5f7fb;
  --panel: rgba(255, 255, 255, 0.92);
  --text-strong: #1f2937;
  --text-soft: #5b6475;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background: radial-gradient(circle at 10% 20%, rgba(132, 94, 247, 0.06), transparent 32%),
    radial-gradient(circle at 90% 10%, rgba(94, 233, 255, 0.08), transparent 30%),
    radial-gradient(circle at 50% 90%, rgba(132, 94, 247, 0.05), transparent 40%),
    var(--bg-soft);
}

.app-shell {
  min-height: 100vh;
  color: var(--text-strong);
}

.app-main {
  padding: 18px 24px 32px;
}

.content-surface {
  background: var(--panel);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.06);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.6);
}
</style>
