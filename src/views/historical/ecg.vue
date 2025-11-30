<template>
  <div class="historical-ecg-page">
    <!-- 搜索条件区域 -->
    <div class="search-section">
      <div class="search-card">
        <h3 class="section-title">搜索条件</h3>
        
        <div class="search-form">
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">监测对象</label>
              <DevicePersonSelector
                v-model="queryParams.deviceId"
                v-model:personId="queryParams.personId"
                class="form-input"
              />
            </div>
            
            <div class="form-item time-picker-item">
              <label class="form-label">时间范围</label>
              <el-date-picker
                v-model="dateRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="YYYY-MM-DDTHH:mm:ss"
                :shortcuts="shortcuts"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-actions">
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetQuery">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计数据区域 -->
    <div class="statistics-section" v-if="statistics">
      <h3 class="section-title">历史统计</h3>
      
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">平均心率</div>
            <div class="stat-value">{{ statistics.averageHeartRate || '--' }}</div>
            <div class="stat-unit">bpm</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon danger">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">最高心率</div>
            <div class="stat-value text-danger">{{ statistics.maxHeartRate || '--' }}</div>
            <div class="stat-unit">bpm</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">最低心率</div>
            <div class="stat-value text-warning">{{ statistics.minHeartRate || '--' }}</div>
            <div class="stat-unit">bpm</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">平均信号质量</div>
            <div class="stat-value text-success">{{ statistics.averageSignalQuality || '--' }}</div>
            <div class="stat-unit">%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <div class="chart-card" v-loading="loading">
        <div class="card-header">
          <h3>历史趋势图</h3>
        </div>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <div class="table-card">
        <div class="card-header">
          <h3>详细数据</h3>
        </div>
        <el-table :data="tableData" border style="width: 100%" v-loading="loading">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="ecgValue" label="ECG值 (mV)" width="120" />
          <el-table-column prop="heartRate" label="心率 (bpm)" width="120" />
          <el-table-column prop="signalQuality" label="信号质量" width="120">
            <template #default="scope">
              <el-tag :type="getSignalQualityType(scope.row.signalQuality)">
                {{ scope.row.signalQuality }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="leadType" label="导联类型" />
          <el-table-column prop="deviceId" label="设备ID" />
          <el-table-column prop="personId" label="人员ID" />
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="queryParams.page"
            v-model:page-size="queryParams.size"
            :page-sizes="[20, 50, 100, 200]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import * as echarts from 'echarts'
import DevicePersonSelector from '@/components/DevicePersonSelector.vue'
import ecgApi from '@/api/ecg'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Monitor, Warning, Connection } from '@element-plus/icons-vue'

// 查询参数
const queryParams = reactive({
  deviceId: '',
  personId: '',
  page: 1,
  size: 20
})

const dateRange = ref([])
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const statistics = ref(null)
const chartRef = ref(null)
let chartInstance = null

// 日期快捷选项
const shortcuts = [
  {
    text: '最近1小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近24小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    },
  },
]

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    window.addEventListener('resize', resizeChart)
    // 初始化空图表
    updateChart([])
  }
}

const resizeChart = () => {
  chartInstance?.resize()
}

const updateChart = (data) => {
  if (!chartInstance) return

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['心率', 'ECG值']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => formatTime(item.timestamp)),
      axisLabel: {
        show: false
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '心率',
        position: 'left',
        min: 0,
        max: 200
      },
      {
        type: 'value',
        name: 'ECG',
        position: 'right',
        splitLine: { show: false },
        min: -1.5,
        max: 1.5
      }
    ],
    series: [
      {
        name: '心率',
        type: 'line',
        data: data.map(item => item.heartRate),
        smooth: true,
        itemStyle: { color: '#f87171' }
      },
      {
        name: 'ECG值',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => item.ecgValue),
        showSymbol: false,
        lineStyle: {
            width: 1,
            opacity: 0.5,
            color: '#60a5fa'
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100
      }
    ]
  }
  chartInstance.setOption(option)
}

// API 调用
const handleSearch = async () => {
  if (!queryParams.deviceId && !queryParams.personId) {
    ElMessage.warning('请选择设备或人员')
    return
  }
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择时间范围')
    return
  }

  loading.value = true
  try {
    const start = dateRange.value[0]
    const end = dateRange.value[1]
    
    // 1. 获取列表数据
    const params = {
      start,
      end,
      page: queryParams.page - 1, // API通常是0-based
      size: queryParams.size
    }

    let res
    if (queryParams.deviceId) {
      res = await ecgApi.getDeviceHistorical(queryParams.deviceId, params)
    } else {
      res = await ecgApi.getPersonHistorical(queryParams.personId, params)
    }

    if (res) {
      tableData.value = res.content || []
      total.value = res.totalElements || 0
      updateChart(tableData.value) // 更新图表
    }

    // 2. 获取统计数据
    let statsRes
    if (queryParams.deviceId) {
      statsRes = await ecgApi.getDeviceStatistics(queryParams.deviceId, start, end)
    } else {
      statsRes = await ecgApi.getPersonStatistics(queryParams.personId, start, end)
    }
    
    if (statsRes) {
      statistics.value = statsRes
    }

  } catch (error) {
    console.error('查询失败', error)
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  queryParams.deviceId = ''
  queryParams.personId = ''
  queryParams.page = 1
  dateRange.value = []
  tableData.value = []
  total.value = 0
  statistics.value = null
  if (chartInstance) {
    chartInstance.clear()
    updateChart([]) // 重置为空图表
  }
}

const handleSizeChange = (val) => {
  queryParams.size = val
  handleSearch()
}

const handleCurrentChange = (val) => {
  queryParams.page = val
  handleSearch()
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString()
}

const getSignalQualityType = (val) => {
  if (val >= 80) return 'success'
  if (val >= 60) return 'warning'
  return 'danger'
}

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped lang="scss">
.historical-ecg-page {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.search-section, .statistics-section, .chart-section, .table-section {
  margin-bottom: 24px;
}

.search-card, .table-card, .chart-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.search-form {
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin-bottom: 24px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 240px;

    .form-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .form-input {
      width: 100%;
    }
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: #eff6ff;
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

    &.danger {
      background-color: #fef2f2;
      color: #ef4444;
    }

    &.warning {
      background-color: #fffbeb;
      color: #f59e0b;
    }

    &.success {
      background-color: #ecfdf5;
      color: #10b981;
    }
  }

  .stat-content {
    flex: 1;

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      display: inline-block;
      margin-right: 4px;
    }

    .stat-unit {
      font-size: 14px;
      color: #9ca3af;
      display: inline-block;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }
}

.chart-container {
  width: 100%;
  height: 400px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.text-danger { color: #ef4444; }
.text-warning { color: #f59e0b; }
.text-success { color: #10b981; }
</style>
