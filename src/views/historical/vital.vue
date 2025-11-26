
<template>  </template>

<script>
import { getHistoryData, getHistoryStats } from '@/api/history'
import * as echarts from 'echarts'
import { getPersonHistoricalData, getPersonHistoricalSummary } from '@/api/r60abd1'
import { getTI6843PersonHistoricalData, getTI6843PersonHistoricalSummary, getTI6843DeviceHistoricalData, getTI6843DeviceHistoricalSummary } from '@/api/ti6843-vital'
import { getPersons } from '@/api/person'
import { getDeviceType } from '@/utils/deviceConfig'

export default {
  name: 'HistoryPage',
  data() {
    // 默认查询过去一小时
    const end = new Date()
    const start = new Date()
    start.setTime(start.getTime() - 3600 * 1000)

    // 从路由参数带入 personId/deviceId
    const { personId: qpPersonId, deviceId: qpDeviceId } = this.$route.query || {}
    return {
      personId: qpPersonId || '',
      deviceId: qpDeviceId || '',
      selectedPersonId: qpPersonId || '', // 人员下拉选择器的值
      persons: [], // 人员列表
      timeRange: [start, end],
      statistics: {},
      tableData: [],
      pagination: {
        currentPage: 1,
        pageSize: 20,
        total: 0
      },
      isLoading: false,
      chart: null
    }
  },
  computed: {
    // 判断是否是 R60ABD1 数据
    isR60ABD1Data() {
      return this.tableData.length > 0 && 
             (this.tableData[0].hasOwnProperty('presence') || 
              this.tableData[0].hasOwnProperty('motion') ||
              this.tableData[0].hasOwnProperty('sleep'))
    },
    // 判断是否是 TI6843 数据
    isTI6843Data() {
      return this.tableData.length > 0 && 
             this.tableData[0].hasOwnProperty('breathRate')
    }
  },
  mounted() {
    this.initChart()
    this.fetchPersons() // 先获取人员列表
    this.fetchData()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    formatStat(value) {
      if (value === null || value === undefined) {
        return 'N/A'
      }
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return value.toFixed(2)
      }
      return value
    },
    // 格式化时间戳
    formatTimestamp(timestamp) {
      if (!timestamp) return 'N/A'
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      })
    },
    // 格式化数值
    formatValue(value) {
      if (value === null || value === undefined) return 'N/A'
      if (typeof value === 'number') {
        return value.toFixed(1)
      }
      return value
    },
    // 获取心率样式类
    getHeartRateClass(heartRate) {
      if (!heartRate) return ''
      if (heartRate < 60) return 'value-low'
      if (heartRate > 100) return 'value-high'
      return 'value-normal'
    },
    // 获取呼吸率样式类
    getRespirationClass(respiration) {
      if (!respiration) return ''
      if (respiration < 12) return 'value-low'
      if (respiration > 25) return 'value-high'
      return 'value-normal'
    },
    // 获取睡眠状态文本
    getSleepText(sleep) {
      const sleepMap = {
        0: '清醒',
        1: '浅睡',
        2: '深睡'
      }
      return sleepMap[sleep] || '未知'
    },
    // 获取睡眠状态类型
    getSleepType(sleep) {
      const typeMap = {
        0: 'info',
        1: 'warning',
        2: 'success'
      }
      return typeMap[sleep] || 'info'
    },
    // 核心数据获取逻辑（优先使用基于人员ID的接口）
    async fetchData() {
      if (!this.timeRange || this.timeRange.length !== 2) {
        this.$message.warning('请选择一个有效的时间范围')
        return
      }
      if (!this.personId && !this.deviceId) {
        this.$message.warning('请至少输入人员ID或设备ID')
        return
      }
      this.isLoading = true

      const commonParams = {
        start: this.timeRange[0].toISOString().slice(0, 19),
        end: this.timeRange[1].toISOString().slice(0, 19)
      }

      const dataParams = {
        ...commonParams,
        page: this.pagination.currentPage - 1, // API要求page从0开始
        size: this.pagination.pageSize,
        sort: 'timestamp,desc'
      }

      try {
        // 分开请求，以便更好地处理错误
        let dataRes, statsRes

        // 检测设备类型（如果有deviceId）
        const deviceType = this.deviceId ? getDeviceType(this.deviceId) : null
        console.log('📊 设备类型:', deviceType)

        // 1) 数据列表
        try {
          if (this.personId) {
            // 优先使用人员ID查询（需要判断设备类型）
            if (deviceType === 'TI6843') {
              dataRes = await getTI6843PersonHistoricalData(this.personId, dataParams)
            } else {
              dataRes = await getPersonHistoricalData(this.personId, dataParams)
            }
          } else if (this.deviceId) {
            // 使用设备ID查询
            if (deviceType === 'TI6843') {
              dataRes = await getTI6843DeviceHistoricalData(dataParams)
            } else {
              dataRes = await getHistoryData({ deviceId: this.deviceId, ...dataParams })
            }
          }

          console.log('历史数据响应:', dataRes)
          const payload = (dataRes && dataRes.data) ? dataRes.data : dataRes
          if (payload && payload.content) {
            this.tableData = payload.content
            this.pagination.total = payload.totalElements
          } else if (Array.isArray(payload)) {
            this.tableData = payload
            this.pagination.total = payload.length
          } else {
            console.error('历史数据格式不正确:', payload)
            this.$message.warning('历史数据格式不正确，请联系管理员')
            this.tableData = []
            this.pagination.total = 0
          }
        } catch (dataError) {
          console.error('获取历史数据失败:', dataError)
          this.$message.error('历史数据加载失败: ' + ((dataError && dataError.message) || '未知错误'))
          this.tableData = []
          this.pagination.total = 0
        }

        // 2) 统计数据
        try {
          if (this.personId) {
            if (deviceType === 'TI6843') {
              statsRes = await getTI6843PersonHistoricalSummary(this.personId, commonParams.start, commonParams.end)
            } else {
              statsRes = await getPersonHistoricalSummary(this.personId, commonParams)
            }
          } else if (this.deviceId) {
            if (deviceType === 'TI6843') {
              statsRes = await getTI6843DeviceHistoricalSummary(this.deviceId, commonParams.start, commonParams.end)
            } else {
              statsRes = await getHistoryStats({ deviceId: this.deviceId, ...commonParams })
            }
          }

          console.log('统计数据响应:', statsRes)
          const statsPayload = (statsRes && statsRes.data) ? statsRes.data : statsRes
          if (statsPayload) {
            this.statistics = statsPayload
          } else {
            console.error('统计数据格式不正确:', statsRes)
            this.$message.warning('统计数据格式不正确，请联系管理员')
            this.statistics = {}
          }
        } catch (statsError) {
          console.error('获取统计数据失败:', statsError)
          this.$message.error('统计数据加载失败: ' + ((statsError && statsError.message) || '未知错误'))
          this.statistics = {}
        }

        // 更新图表：有数据时显示数据，无数据时清空图表
        if (this.tableData && this.tableData.length > 0) {
          this.updateChart()
        } else {
          this.clearChart()
        }
      } catch (error) {
        console.error('获取历史数据失败:', error)
        this.$message.error('数据加载失败，请检查网络或联系管理员')
        // 数据获取失败时也要清空图表
        this.clearChart()
      } finally {
        this.isLoading = false
      }
    },

    // 搜索按钮
    handleSearch() {
      this.pagination.currentPage = 1
      this.fetchData()
    },

    // 获取人员列表
    async fetchPersons() {
      try {
        const response = await getPersons()
        this.persons = response.data?.content || response.data || []
        console.log('获取人员列表:', this.persons)
      } catch (error) {
        console.error('获取人员列表失败:', error)
        this.$message.error('获取人员列表失败')
      }
    },

    // 人员选择处理
    handlePersonSelect(personId) {
      if (personId) {
        this.personId = personId // 同步到人员ID输入框

        // 检查时间范围是否有效
        if (!this.timeRange || this.timeRange.length !== 2) {
          this.$message.warning('请先选择有效的时间范围')
          return
        }

        // 选择人员后自动查询数据
        this.pagination.currentPage = 1 // 重置到第一页
        this.fetchData()
      } else {
        this.personId = '' // 清空时同步清空
        // 清空选择时也清空查询结果
        this.tableData = []
        this.statistics = {}
        this.pagination.total = 0
        this.clearChart() // 清空图表
      }
    },

    // 重置表单
    resetForm() {
      this.personId = ''
      this.deviceId = ''
      this.selectedPersonId = '' // 重置人员选择器
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000) // 默认查询过去一小时
      this.timeRange = [start, end]
      this.tableData = []
      this.statistics = {}
      this.pagination.currentPage = 1
      this.pagination.total = 0
      this.clearChart() // 清空图表
      this.$message.success('表单已重置，请重新选择查询条件')
    },

    // 切换分页
    handlePageChange(newPage) {
      this.pagination.currentPage = newPage
      this.fetchData()
    },

    // 切换每页条数
    handleSizeChange(newSize) {
      this.pagination.pageSize = newSize
      this.pagination.currentPage = 1 // 回到第一页
      this.fetchData()
    },

    handleResize() {
      if (this.chart) {
        this.chart.resize()
      }
    },

    // ECharts初始化
    initChart() {
      this.chart = echarts.init(this.$refs.historyChart)
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['心率', '呼吸率'],
          top: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [], // x轴数据 (时间戳)
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '心率 (bpm)',
            position: 'left',
            min: 0,
            max: 120,
            axisLabel: {
              formatter: '{value}'
            }
          },
          {
            type: 'value',
            name: '呼吸率 (rpm)',
            position: 'right',
            min: 0,
            max: 35,
            axisLabel: {
              formatter: '{value}'
            }
          }
        ],
        series: [
          {
            name: '心率',
            type: 'line',
            yAxisIndex: 0,
            data: [],
            showSymbol: false,
            smooth: true,
            color: '#F56C6C',
            lineStyle: {
              width: 2
            },
            markLine: {
              silent: true,
              data: [
                { yAxis: 60, name: '心率下限', lineStyle: { color: '#409EFF', type: 'dashed' }},
                { yAxis: 100, name: '心率上限', lineStyle: { color: '#409EFF', type: 'dashed' }}
              ],
              label: {
                show: true,
                position: 'end'
              }
            }
          },
          {
            name: '呼吸率',
            type: 'line',
            yAxisIndex: 1,
            data: [],
            showSymbol: false,
            smooth: true,
            color: '#67C23A',
            lineStyle: {
              width: 2
            },
            markLine: {
              silent: true,
              data: [
                { yAxis: 12, name: '呼吸下限', lineStyle: { color: '#E6A23C', type: 'dashed' }},
                { yAxis: 25, name: '呼吸上限', lineStyle: { color: '#E6A23C', type: 'dashed' }}
              ],
              label: {
                show: true,
                position: 'end'
              }
            }
          }
        ]
      }
      this.chart.setOption(option)
    },

    // 清空图表数据
    clearChart() {
      if (!this.chart) return

      this.chart.setOption({
        xAxis: {
          data: []
        },
        series: [
          { name: '心率', data: [] },
          { name: '呼吸率', data: [] }
        ]
      })
    },

    // 更新图表数据
    updateChart() {
      if (!this.chart || !this.tableData || this.tableData.length === 0) return

      // 从tableData中提取数据
      const timestamps = []
      const heartRates = []
      const respirations = []

      // 创建一个反转后的数据副本进行遍历，确保图表从左到右时间递增
      const reversedData = [...this.tableData].reverse()

      // 处理数据格式
      reversedData.forEach(item => {
        // 尝试获取时间戳 - 可能在timestamp或id字段中
        const timestamp = item.timestamp || item.id || item.time
        if (timestamp) {
          const date = new Date(timestamp)
          timestamps.push(date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        } else {
          timestamps.push('未知时间')
        }

        // 尝试获取心率 - 可能在heartRate或heart_rate字段中
        heartRates.push(item.heartRate || item.heart_rate || 0)
        
        // 尝试获取呼吸率 - 可能在respiration、breathRate或respiration_rate字段中
        respirations.push(item.respiration || item.breathRate || item.respiration_rate || 0)
      })

      this.chart.setOption({
        xAxis: {
          data: timestamps
        },
        series: [
          { 
            name: '心率', 
            data: heartRates,
            yAxisIndex: 0
          },
          { 
            name: '呼吸率', 
            data: respirations,
            yAxisIndex: 1
          }
        ]
      })
    }
  }
}
</script>