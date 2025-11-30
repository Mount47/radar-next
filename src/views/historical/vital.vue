<template>
  <div class="historical-vital-page">
    <!-- 搜索条件区域 -->
    <div class="search-section">
      <div class="search-card">
        <h3 class="section-title">搜索条件</h3>
        
        <div class="search-form">
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">人员姓名</label>
              <el-select
                v-model="searchForm.personId"
                placeholder="请选择人员"
                clearable
                filterable
                class="form-input"
                @change="handlePersonChange"
              >
                <el-option
                  v-for="person in personList"
                  :key="person.personId"
                  :label="person.personName"
                  :value="person.personId"
                />
              </el-select>
            </div>
            
            <div class="form-item">
              <label class="form-label">人员ID</label>
              <el-input
                v-model="searchForm.personIdInput"
                placeholder="请输入人员ID"
                clearable
                class="form-input"
              />
            </div>
            
            <div class="form-item">
              <label class="form-label">设备ID</label>
              <el-input
                v-model="searchForm.deviceId"
                placeholder="请输入设备ID"
                clearable
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item time-picker-item">
              <label class="form-label">时间范围</label>
              <el-date-picker
                v-model="searchForm.timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                class="form-input"
                :shortcuts="shortcuts"
              />
            </div>
          </div>
          
          <div class="form-actions">
            <el-button type="primary" @click="handleSearch" :loading="isLoading">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计数据区域 -->
    <div class="statistics-section">
      <h3 class="section-title">历史统计</h3>
      
      <div class="stat-cards">
        <div class="stat-card heart-rate-card">
          <div class="stat-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">最大心率</div>
            <div class="stat-value">{{ formatStat(statistics.maxHeartRate) }}</div>
            <div class="stat-unit">bpm</div>
          </div>
        </div>
        
        <div class="stat-card heart-rate-card-min">
          <div class="stat-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">最小心率</div>
            <div class="stat-value">{{ formatStat(statistics.minHeartRate) }}</div>
            <div class="stat-unit">bpm</div>
          </div>
        </div>
        
        <div class="stat-card breath-rate-card">
          <div class="stat-icon">
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="currentColor"/>
              <path d="M512 340c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z" fill="currentColor"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">最大呼吸率</div>
            <div class="stat-value">{{ formatStat(statistics.maxBreathRate) }}</div>
            <div class="stat-unit">rpm</div>
          </div>
        </div>
        
        <div class="stat-card breath-rate-card-min">
          <div class="stat-icon">
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="currentColor"/>
              <path d="M512 340c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z" fill="currentColor"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">最小呼吸率</div>
            <div class="stat-value">{{ formatStat(statistics.minBreathRate) }}</div>
            <div class="stat-unit">rpm</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="section-title">趋势图表</h3>
          <div class="chart-legend">
            <span class="legend-item heart-rate">
              <span class="legend-dot"></span>
              心率
            </span>
            <span class="legend-item breath-rate">
              <span class="legend-dot"></span>
              呼吸率
            </span>
          </div>
        </div>
        <div ref="chartContainer" class="chart-container"></div>
      </div>
    </div>

    <!-- 数据表格区域 -->
    <div class="table-section" v-if="tableData.length > 0">
      <div class="table-card">
        <h3 class="section-title">历史数据列表</h3>
        
        <el-table
          :data="tableData"
          stripe
          class="data-table"
          v-loading="isLoading"
        >
          <el-table-column prop="timestamp" label="时间" width="180" fixed>
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="personId" label="人员ID" width="120" />
          <el-table-column prop="personName" label="人员姓名" width="100" />
          <el-table-column prop="deviceId" label="设备ID" width="150" />
          
          <el-table-column prop="heartRate" label="心率 (bpm)" width="120">
            <template #default="{ row }">
              <el-tag :type="getHeartRateType(row.heartRate)">
                {{ formatValue(row.heartRate) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="breathRate" label="呼吸率 (rpm)" width="130">
            <template #default="{ row }">
              <el-tag :type="getBreathRateType(row.breathRate)">
                {{ formatValue(row.breathRate) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" min-width="150">
            <template #default="{ row }">
              <span>{{ row.status || 'N/A' }}</span>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!isLoading && tableData.length === 0 && hasSearched">
      <el-empty description="暂无数据">
        <el-button type="primary" @click="handleReset">重新搜索</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Search, RefreshLeft, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getPersons } from '@/api/persons/person'
import { getTI6843PersonHistoricalData, getTI6843PersonHistoricalSummary, getTI6843DeviceHistoricalData, getTI6843DeviceHistoricalSummary } from '@/api/sensors/ti6843-vital'

// 搜索表单
const searchForm = reactive({
  personId: '',
  personIdInput: '',
  deviceId: '',
  timeRange: []
})

// 人员列表
const personList = ref([])

// 统计数据 - 初始化为默认值
const statistics = ref({
  maxHeartRate: 0,
  minHeartRate: 0,
  avgHeartRate: 0,
  maxBreathRate: 0,
  minBreathRate: 0,
  avgBreathRate: 0
})

// 图表数据
const chartData = ref([])

// 表格数据
const tableData = ref([])

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 加载状态
const isLoading = ref(false)
const hasSearched = ref(false)

// 图表实例
const chartContainer = ref(null)
let chartInstance = null

// 时间快捷选项
const shortcuts = [
  {
    text: '最近1小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: '最近6小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 6)
      return [start, end]
    }
  },
  {
    text: '最近12小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 12)
      return [start, end]
    }
  },
  {
    text: '今天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return [start, end]
    }
  },
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  }
]

// 初始化
onMounted(async () => {
  await fetchPersonList()
  // 设置默认时间范围为最近1小时
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000)
  searchForm.timeRange = [start, end]
  
  // 初始化图表，显示默认的0数据
  await nextTick()
  renderChart()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

// 获取人员列表
const fetchPersonList = async () => {
  try {
    const response = await getPersons()
    personList.value = response.data?.content || response.data || []
  } catch (error) {
    console.error('获取人员列表失败:', error)
    ElMessage.error('获取人员列表失败')
  }
}

// 人员选择变化
const handlePersonChange = (personId) => {
  if (personId) {
    searchForm.personIdInput = personId
  }
}

// 搜索
const handleSearch = async () => {
  if (!searchForm.timeRange || searchForm.timeRange.length !== 2) {
    ElMessage.warning('请选择时间范围')
    return
  }
  
  if (!searchForm.personIdInput && !searchForm.deviceId) {
    ElMessage.warning('请至少输入人员ID或设备ID')
    return
  }
  
  isLoading.value = true
  hasSearched.value = true
  
  try {
    const [start, end] = searchForm.timeRange
    const params = {
      start: start.toISOString().slice(0, 19),
      end: end.toISOString().slice(0, 19),
      page: pagination.currentPage - 1,
      size: pagination.pageSize,
      sort: 'timestamp,desc'
    }
    
    // 获取历史数据
    let dataRes, statsRes
    
    if (searchForm.personIdInput) {
      // 按人员查询
      dataRes = await getTI6843PersonHistoricalData(searchForm.personIdInput, params)
      statsRes = await getTI6843PersonHistoricalSummary(searchForm.personIdInput, params.start, params.end)
    } else if (searchForm.deviceId) {
      // 按设备查询
      dataRes = await getTI6843DeviceHistoricalData({ ...params, deviceId: searchForm.deviceId })
      statsRes = await getTI6843DeviceHistoricalSummary(searchForm.deviceId, params.start, params.end)
    }
    
    // 处理数据响应
    const payload = (dataRes && dataRes.data) ? dataRes.data : dataRes
    if (payload && payload.content) {
      tableData.value = payload.content
      pagination.total = payload.totalElements || 0
    } else if (Array.isArray(payload)) {
      tableData.value = payload
      pagination.total = payload.length
    } else {
      tableData.value = []
      pagination.total = 0
    }
    
    // 处理统计数据
    const statsPayload = (statsRes && statsRes.data) ? statsRes.data : statsRes
    statistics.value = statsPayload || {
      maxHeartRate: 0,
      minHeartRate: 0,
      avgHeartRate: 0,
      maxBreathRate: 0,
      minBreathRate: 0,
      avgBreathRate: 0
    }
    
    // 准备图表数据
    chartData.value = [...tableData.value].reverse()
    
    // 渲染图表（始终渲染，即使数据为空）
    await nextTick()
    renderChart()
    
    if (tableData.value.length === 0) {
      ElMessage.info('未查询到数据')
    }
  } catch (error) {
    console.error('查询失败:', error)
    ElMessage.error('查询失败: ' + (error.message || '未知错误'))
    tableData.value = []
    statistics.value = {
      maxHeartRate: 0,
      minHeartRate: 0,
      avgHeartRate: 0,
      maxBreathRate: 0,
      minBreathRate: 0,
      avgBreathRate: 0
    }
    chartData.value = []
    // 即使失败也渲染图表显示0值
    await nextTick()
    renderChart()
  } finally {
    isLoading.value = false
  }
}

// 重置
const handleReset = () => {
  searchForm.personId = ''
  searchForm.personIdInput = ''
  searchForm.deviceId = ''
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000)
  searchForm.timeRange = [start, end]
  
  tableData.value = []
  statistics.value = {
    maxHeartRate: 0,
    minHeartRate: 0,
    avgHeartRate: 0,
    maxBreathRate: 0,
    minBreathRate: 0,
    avgBreathRate: 0
  }
  chartData.value = []
  pagination.currentPage = 1
  pagination.total = 0
  hasSearched.value = false
  
  // 重置后重新渲染图表显示0值
  nextTick(() => {
    renderChart()
  })
}

// 分页处理
const handlePageChange = (page) => {
  pagination.currentPage = page
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  handleSearch()
}

// 渲染图表
const renderChart = () => {
  if (!chartContainer.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartContainer.value)
  
  const timestamps = chartData.value.map(item => {
    const date = new Date(item.timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
  
  const heartRates = chartData.value.map(item => item.heartRate || 0)
  const breathRates = chartData.value.map(item => item.breathRate || 0)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timestamps,
      axisLabel: {
        rotate: 45,
        color: '#666'
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
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e0e0e0'
          }
        }
      },
      {
        type: 'value',
        name: '呼吸率 (rpm)',
        position: 'right',
        min: 0,
        max: 35,
        axisLabel: {
          color: '#666'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '心率',
        type: 'line',
        yAxisIndex: 0,
        data: heartRates,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#F56C6C'
        },
        itemStyle: {
          color: '#F56C6C'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
            { offset: 1, color: 'rgba(245, 108, 108, 0.05)' }
          ])
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 60, name: '正常下限', lineStyle: { color: '#409EFF', type: 'dashed' }},
            { yAxis: 100, name: '正常上限', lineStyle: { color: '#409EFF', type: 'dashed' }}
          ],
          label: {
            show: true,
            position: 'end',
            formatter: '{b}'
          }
        }
      },
      {
        name: '呼吸率',
        type: 'line',
        yAxisIndex: 1,
        data: breathRates,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#67C23A'
        },
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 12, name: '正常下限', lineStyle: { color: '#E6A23C', type: 'dashed' }},
            { yAxis: 25, name: '正常上限', lineStyle: { color: '#E6A23C', type: 'dashed' }}
          ],
          label: {
            show: true,
            position: 'end',
            formatter: '{b}'
          }
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
  
  // 响应式调整
  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
}

// 格式化函数
const formatStat = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'number') return value.toFixed(1)
  return value
}

const formatTimestamp = (timestamp) => {
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
}

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'number') return value.toFixed(1)
  return value
}

const getHeartRateType = (heartRate) => {
  if (!heartRate) return 'info'
  if (heartRate < 60) return 'warning'
  if (heartRate > 100) return 'danger'
  return 'success'
}

const getBreathRateType = (breathRate) => {
  if (!breathRate) return 'info'
  if (breathRate < 12) return 'warning'
  if (breathRate > 25) return 'danger'
  return 'success'
}
</script>

<style scoped>
.historical-vital-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fb 0%, #e8ebf3 100%);
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
}

.search-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-picker-item {
  grid-column: span 2;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.form-input {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 统计卡片 */
.statistics-section {
  margin-bottom: 24px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #fff 0%, #f9fafb 100%);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.heart-rate-card {
  border-left: 4px solid #F56C6C;
}

.heart-rate-card-min {
  border-left: 4px solid #ff9999;
}

.breath-rate-card {
  border-left: 4px solid #67C23A;
}

.breath-rate-card-min {
  border-left: 4px solid #95d475;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.1), rgba(94, 233, 255, 0.1));
  color: var(--primary-500);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-unit {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 图表区域 */
.chart-section {
  margin-bottom: 24px;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-legend {
  display: flex;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-item.heart-rate .legend-dot {
  background: #F56C6C;
}

.legend-item.breath-rate .legend-dot {
  background: #67C23A;
}

.chart-container {
  width: 100%;
  height: 400px;
}

/* 表格区域 */
.table-section {
  margin-bottom: 24px;
}

.table-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.data-table {
  margin-top: 16px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 空状态 */
.empty-state,
.initial-state {
  background: #fff;
  border-radius: 16px;
  padding: 60px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 48px;
  color: #909399;
}

/* 响应式 */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .time-picker-item {
    grid-column: span 1;
  }
  
  .stat-cards {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 300px;
  }
}
</style>
