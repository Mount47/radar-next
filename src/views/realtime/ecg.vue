<template>
  <div class="app-container">
    <h1>ECG Monitor</h1>
    
    <div class="debug-info">
      <h2>Device Info</h2>
      <pre>{{ deviceInfo }}</pre>
    </div>

    <div class="debug-info">
      <h2>ECG Data</h2>
      <p>Rate: {{ ecgRate }}</p>
      <p>Status: {{ ecgStatus }}</p>
      <p>Data Points: {{ ecgWaveform.length }}</p>
      <p>Last Update: {{ lastUpdateTime }}</p>
    </div>

    <div class="debug-info">
      <h2>Stats</h2>
      <pre>{{ historyStats }}</pre>
    </div>
  </div>
</template>

<script>
// import WaveformChart from '@/components/WaveformChart'
import { getDeviceECGData } from '@/api/ecg'
import { mapState, mapActions } from 'pinia'
import { useDeviceStore } from '@/stores/device'
import { useStatsStore } from '@/stores/stats'

export default {
  name: 'ECGView',
  // components: { WaveformChart },
  data() {
    return {
      deviceId: 'RD003', // 默认设备ID
      deviceInfo: {
        deviceName: '',
        location: '',
        status: '',
        model: '',
        type: ''
      },
      currentPerson: {
        id: '',
        name: '未知用户'
      },
      mappingInfo: {
        name: '默认映射'
      },
      loading: false,
      ecgWaveform: [],
      ecgStatus: 'normal',
      ecgRate: 0,
      lastUpdateTime: '',
      refreshTimer: null,
      initialDataLoaded: false, // 标记初次数据加载
      // 心率异常统计数据
      historyStats: [
        {
          name: '心动过速',
          count: '0次',
          duration: '总持续时间: 0min',
          type: 'danger',
          tagType: 'danger'
        },
        {
          name: '心动过缓',
          count: '0次',
          duration: '总持续时间: 0min',
          type: 'warning',
          tagType: 'warning'
        },
        {
          name: '心律不齐',
          count: '0次',
          duration: '总持续时间: 0min',
          type: 'normal',
          tagType: 'info'
        }
      ]
    }
  },
  computed: {
    ...mapState(useDeviceStore, ['currentDeviceId']),
    // ...mapGetters([
    //   'sidebar',
    //   'device'
    // ]),
    // eslint-disable-next-line no-unused-vars
    globalStats() {
      const statsStore = useStatsStore()
      return statsStore.ecgStats || {}
    }
  },
  watch: {
    // 监听Vuex中的当前设备ID变化
    currentDeviceId: {
      handler(newId) {
        if (newId && newId !== this.deviceId) {
          // 更新本地设备ID并重新获取数据
          this.deviceId = newId
          this.fetchECGData()
        }
      },
      immediate: true
    },
    // 监听全局统计数据变化
    globalStats: {
      handler(newStats) {
        if (newStats && Object.keys(newStats).length > 0) {
          this.updateHistoryStats(newStats)
        }
      },
      deep: true,
      immediate: true
    }
  },
  mounted() {
    // 从路由参数获取设备和人员信息
    const deviceName = this.$route.query.deviceName || '雷达设备'
    const deviceLocation = this.$route.query.deviceLocation || '默认位置'
    const personId = this.$route.query.personId || ''
    const personName = this.$route.query.personName || '未知用户'
    const mappingName = this.$route.query.mappingName || '默认映射'

    // 如果路由参数中有设备ID，更新设备ID
    if (this.$route.query.deviceId) {
      this.deviceId = this.$route.query.deviceId
      // 如果当前设备ID与Vuex中不一致，并且Vuex中存在currentDeviceId，则更新Vuex
      if (this.currentDeviceId && this.$route.query.deviceId !== this.currentDeviceId) {
        this.setCurrentDevice(this.$route.query.deviceId)
      }
    }

    // 设置初始设备信息
    this.deviceInfo = {
      deviceName: deviceName,
      location: deviceLocation,
      status: '在线'
    }

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
      document.title = `${personName} - 心电监测 - 雷达监测系统`
    }

    console.log('ECG页面 - 初始化')
    console.log('ECG页面 - 设备ID:', this.deviceId)
    console.log('ECG页面 - 设备名称:', deviceName)
    console.log('ECG页面 - 人员ID:', personId)
    console.log('ECG页面 - 人员姓名:', personName)
    console.log('ECG页面 - 映射名称:', mappingName)

    // 获取心电图数据
    this.fetchECGData()

    // 从Store获取历史统计数据
    this.getHistoryStats()

    // 设置定时刷新 - 每1秒刷新一次数据
    this.startDataRefresh()
  },
  beforeDestroy() {
    // 组件销毁前清理定时器
    this.stopDataRefresh()
  },
  methods: {
    ...mapActions(useDeviceStore, ['setCurrentDevice']),
    async fetchECGData() {
      try {
        this.loading = !this.initialDataLoaded // 只在首次加载时显示loading
        const res = await getDeviceECGData(this.deviceId)
        if (res && Array.isArray(res) && res.length > 0) {
          const latestData = res[0]

          // 处理心电图数据
          let ecgData = []
          try {
            // ECG数据可能存在于ecgData字段中
            if (latestData.ecgData) {
              // 尝试解析JSON字符串
              if (typeof latestData.ecgData === 'string') {
                try {
                  const parsedData = JSON.parse(latestData.ecgData)
                  if (Array.isArray(parsedData)) {
                    ecgData = parsedData
                  } else {
                    // 如果解析后不是数组，尝试将字符串分割为数组
                    ecgData = latestData.ecgData
                      .replace(/^\[|\]$/g, '') // 移除开头和结尾的方括号
                      .split(',')
                      .map(str => parseFloat(str.trim()))
                      .filter(num => !isNaN(num))
                  }
                } catch (e) {
                  // 解析失败，尝试将字符串分割为数组
                  ecgData = latestData.ecgData
                    .replace(/^\[|\]$/g, '') // 移除开头和结尾的方括号
                    .split(',')
                    .map(str => parseFloat(str.trim()))
                    .filter(num => !isNaN(num))
                }
              } else if (Array.isArray(latestData.ecgData)) {
                // 如果已经是数组，直接使用
                ecgData = latestData.ecgData
              }
            }

            // 确保是有效的数组数据
            if (!Array.isArray(ecgData) || ecgData.length === 0) {
              console.warn('ECG数据不是有效数组或为空')
            }
          } catch (e) {
            console.error('解析ECG数据失败:', e)
          }

          if (ecgData.length > 0) {
            console.log('获取到有效的ECG数据，长度:', ecgData.length)
            this.ecgWaveform = ecgData
            this.lastUpdateTime = latestData.timestamp || new Date().toISOString()

            // 分析心电数据，更新心率状态
            this.analyzeECGData(ecgData)
          }

          // 更新设备信息（如果存在）
          if (latestData.radarDevice) {
            this.deviceInfo = {
              deviceName: latestData.radarDevice.deviceName || this.deviceInfo.deviceName,
              location: latestData.radarDevice.location || this.deviceInfo.location,
              status: latestData.radarDevice.status || this.deviceInfo.status,
              model: latestData.radarDevice.model || this.deviceInfo.model,
              type: latestData.radarDevice.type || this.deviceInfo.type
            }
          }

          // 标记初始数据已加载
          this.initialDataLoaded = true
        } else {
          console.warn('API返回数据为空或格式不正确:', res)
          // 如果数据为空，可以在此处添加备用方案
        }
      } catch (error) {
        console.error('获取心电图数据失败:', error)
        // 发生错误时可以在此处添加备用方案
      } finally {
        this.loading = false
      }
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return '未知'

      // 如果是ISO格式的时间字符串，直接格式化
      try {
        const date = new Date(timestamp)
        return date.toLocaleString()
      } catch (e) {
        return timestamp
      }
    },
    startDataRefresh() {
      // 设置1秒刷新一次 - 更频繁地更新数据
      this.refreshTimer = setInterval(() => {
        this.fetchECGData()
      }, 1000) // 1秒
    },
    stopDataRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },
    // 新增：从Store获取历史统计数据
    getHistoryStats() {
      // 从Vuex获取全局统计数据
      const statsStore = useStatsStore()
      const globalStats = statsStore.ecgStats
      if (globalStats) {
        this.updateHistoryStats(globalStats)
      } else {
        // 如果Vuex中没有数据，尝试从API获取
        this.fetchECGStats()
      }
    },
    // 新增：从API获取心电图统计数据
    async fetchECGStats() {
      try {
        // 这里应该调用获取统计数据的API
        // 示例使用默认数据
        const statsData = {
          tachycardia: { count: 8, duration: 35 },
          bradycardia: { count: 6, duration: 20 },
          arrhythmia: { count: 0, duration: 0 }
        }

        // 更新本地统计数据
        this.updateHistoryStats(statsData)

        // 同步到Vuex
        const statsStore = useStatsStore()
        statsStore.updateECGStats(statsData)
      } catch (error) {
        console.error('获取心电图统计数据失败:', error)
      }
    },
    // 新增：更新历史统计数据
    updateHistoryStats(stats) {
      // 心动过速
      if (stats.tachycardia) {
        this.historyStats[0].count = `${stats.tachycardia.count}次`
        this.historyStats[0].duration = `总持续时间: ${stats.tachycardia.duration}min`
      }

      // 心动过缓
      if (stats.bradycardia) {
        this.historyStats[1].count = `${stats.bradycardia.count}次`
        this.historyStats[1].duration = `总持续时间: ${stats.bradycardia.duration}min`
      }

      // 心律不齐
      if (stats.arrhythmia) {
        this.historyStats[2].count = `${stats.arrhythmia.count}次`
        this.historyStats[2].duration = `总持续时间: ${stats.arrhythmia.duration}min`
      }
    },
    // 新增：分析心电数据并更新统计
    analyzeECGData(ecgData) {
      // 简单实现：基于波峰数量和波形特征计算心率
      // 在实际项目中，这部分应该有专业的心电图分析算法

      try {
        // 计算心率（粗略实现）
        const sampleRate = 200 // 采样率200Hz
        const peakCount = this.countPeaks(ecgData)
        const dataLengthInSeconds = ecgData.length / sampleRate
        const heartRate = Math.round((peakCount / dataLengthInSeconds) * 60)

        // 更新心率
        this.ecgRate = heartRate

        // 判断心率状态
        let status = 'normal'
        let abnormality = null

        if (heartRate > 100) {
          status = 'fast'
          abnormality = 'tachycardia'
        } else if (heartRate < 60) {
          status = 'slow'
          abnormality = 'bradycardia'
        }

        // 检测心律不齐（简化实现）
        const hasArrhythmia = this.detectArrhythmia(ecgData)
        if (hasArrhythmia) {
          abnormality = 'arrhythmia'
        }

        // 更新心率状态
        this.ecgStatus = status

        // 如果检测到异常，更新统计数据
        if (abnormality) {
          this.updateAbnormalityStats(abnormality)
        }
      } catch (error) {
        console.error('心电数据分析失败:', error)
      }
    },
    // 新增：计算心电图中的波峰数量
    countPeaks(data) {
      if (!data || data.length < 3) return 0

      // 简单的波峰检测算法
      const threshold = 0.5 // 波峰阈值
      let peakCount = 0

      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          peakCount++
        }
      }

      return peakCount
    },
    // 新增：检测心律不齐
    detectArrhythmia(data) {
      if (!data || data.length < 200) return false

      // 简单的心律不齐检测算法（仅示例）
      // 在实际项目中，这需要专业的心电图分析算法

      // 计算R波间隔的变异性
      const rPeaks = []
      const threshold = 0.5

      // 找出所有R波峰
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          rPeaks.push(i)
        }
      }

      // 至少需要3个R波才能计算变异性
      if (rPeaks.length < 3) return false

      // 计算RR间隔
      const rrIntervals = []
      for (let i = 1; i < rPeaks.length; i++) {
        rrIntervals.push(rPeaks[i] - rPeaks[i - 1])
      }

      // 计算RR间隔的标准差
      const avg = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length
      const variance = rrIntervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / rrIntervals.length
      const stdDev = Math.sqrt(variance)

      // 标准差超过阈值认为有心律不齐
      const variabilityThreshold = avg * 0.2 // 20%的变异视为心律不齐
      return stdDev > variabilityThreshold
    },
    // 新增：更新异常统计
    updateAbnormalityStats(type) {
      // 获取当前的统计数据
      const statsStore = useStatsStore()
      const stats = { ...(statsStore.ecgStats) } || {
        tachycardia: { count: 0, duration: 0 },
        bradycardia: { count: 0, duration: 0 },
        arrhythmia: { count: 0, duration: 0 }
      }

      // 更新对应类型的统计
      if (type === 'tachycardia') {
        stats.tachycardia.count++
        stats.tachycardia.duration += 1 / 60 // 增加1秒，转换为分钟
      } else if (type === 'bradycardia') {
        stats.bradycardia.count++
        stats.bradycardia.duration += 1 / 60 // 增加1秒，转换为分钟
      } else if (type === 'arrhythmia') {
        stats.arrhythmia.count++
        stats.arrhythmia.duration += 1 / 60 // 增加1秒，转换为分钟
      }

      // 更新Vuex中的统计数据
      statsStore.updateECGStats(stats)

      // 更新本地统计显示
      this.updateHistoryStats(stats)
    }
  }
}
</script>
