import { defineStore } from 'pinia'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    // 心电图异常统计数据
    ecgStats: {
      tachycardia: { count: 8, duration: 35 }, // 心动过速
      bradycardia: { count: 6, duration: 20 }, // 心动过缓
      arrhythmia: { count: 0, duration: 0 } // 心律不齐
    }
  }),

  actions: {
    // 更新心电图统计数据
    updateECGStats(stats) {
      this.ecgStats = stats
    },

    // 重置心电图统计
    resetECGStats() {
      this.ecgStats = {
        tachycardia: { count: 0, duration: 0 },
        bradycardia: { count: 0, duration: 0 },
        arrhythmia: { count: 0, duration: 0 }
      }
    },

    // 增加指定类型的异常计数
    incrementAbnormality({ type, duration = 1 / 60 }) {
      if (!this.ecgStats[type]) return

      this.ecgStats[type].count++
      this.ecgStats[type].duration += duration
    },

    // 初始化统计数据
    initStats() {
      // 这里可以从API获取初始统计数据
      // 示例使用默认值
      const defaultStats = {
        tachycardia: { count: 8, duration: 35 },
        bradycardia: { count: 6, duration: 20 },
        arrhythmia: { count: 0, duration: 0 }
      }

      this.updateECGStats(defaultStats)
    },

    // 记录异常事件
    recordAbnormality({ type, duration }) {
      this.incrementAbnormality({ type, duration })
    }
  }
})

