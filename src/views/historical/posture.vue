<template>
  <div class="historical-posture-page">
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
        <div class="stat-card sitting-card">
          <div class="stat-icon sitting-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">坐姿时间</div>
            <div class="stat-value">{{ formatPercentage(statistics.sittingPercentage) }}</div>
            <div class="stat-duration">{{ formatDuration(statistics.sittingDuration) }}</div>
          </div>
        </div>
        
        <div class="stat-card standing-card">
          <div class="stat-icon standing-icon">
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path d="M512 128c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zM416 320c-17.7 0-32 14.3-32 32v384c0 17.7 14.3 32 32 32s32-14.3 32-32V544h64v192c0 17.7 14.3 32 32 32s32-14.3 32-32V544h64v192c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H416z" fill="currentColor"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">站立时间</div>
            <div class="stat-value">{{ formatPercentage(statistics.standingPercentage) }}</div>
            <div class="stat-duration">{{ formatDuration(statistics.standingDuration) }}</div>
          </div>
        </div>
        
        <div class="stat-card walking-card">
          <div class="stat-icon walking-icon">
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path d="M512 128c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zM400 320c-17.7 0-32 14.3-32 32v192l-48 96v192c0 17.7 14.3 32 32 32s32-14.3 32-32V672l32-64v224c0 17.7 14.3 32 32 32s32-14.3 32-32V608l64 128v96c0 17.7 14.3 32 32 32s32-14.3 32-32V736l-64-128V352c0-17.7-14.3-32-32-32H400z" fill="currentColor"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">行走时间</div>
            <div class="stat-value">{{ formatPercentage(statistics.walkingPercentage) }}</div>
            <div class="stat-duration">{{ formatDuration(statistics.walkingDuration) }}</div>
          </div>
        </div>
        
        <div class="stat-card fall-card">
          <div class="stat-icon fall-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">跌倒次数</div>
            <div class="stat-value">{{ statistics.fallCount || 0 }}</div>
            <div class="stat-duration">{{ formatPercentage(statistics.fallPercentage) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="section-title">位姿分布</h3>
          <div class="chart-info">
            <span class="total-time">总时长: {{ formatDuration(statistics.totalDuration) }}</span>
          </div>
        </div>
        <div class="chart-container-wrapper">
          <div ref="chartContainer" class="chart-container"></div>
          <div class="chart-legend-custom">
            <div class="legend-item" v-for="item in legendData" :key="item.name">
              <span class="legend-dot" :style="{ background: item.color }"></span>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
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
          
          <el-table-column prop="posture" label="位姿状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getPostureType(row.posture)">
                {{ getPostureText(row.posture) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="activity" label="活动状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getActivityType(row.activity)" effect="plain">
                {{ getActivityText(row.activity) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="confidence" label="置信度" width="100">
            <template #default="{ row }">
              <span v-if="row.confidence !== null && row.confidence !== undefined">
                {{ (row.confidence * 100).toFixed(1) }}%
              </span>
              <span v-else>N/A</span>
            </template>
          </el-table-column>
          
          <el-table-column label="点云数量" width="100">
            <template #default="{ row }">
              {{ getPointCloudCount(row) }}
            </template>
          </el-table-column>
          
          <el-table-column label="关键点数量" width="110">
            <template #default="{ row }">
              {{ getKeypointCount(row) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="location" label="位置" min-width="120" />
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
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { Search, RefreshLeft, User, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getPersons } from '@/api/person'
import { getTI6843PosturePersonHistoricalData, getTI6843PosturePersonHistoricalSummary, getTI6843PostureDeviceHistoricalData, getTI6843PostureDeviceHistoricalSummary } from '@/api/ti6843-posture'

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
  sittingPercentage: 0,
  sittingDuration: 0,
  standingPercentage: 0,
  standingDuration: 0,
  walkingPercentage: 0,
  walkingDuration: 0,
  fallPercentage: 0,
  fallCount: 0,
  totalDuration: 0
})

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

// 图例数据
const legendData = computed(() => {
  return [
    {
      name: '坐姿',
      value: formatPercentage(statistics.value.sittingPercentage || 0),
      color: '#845EF7'
    },
    {
      name: '站立',
      value: formatPercentage(statistics.value.standingPercentage || 0),
      color: '#5E9AFF'
    },
    {
      name: '行走',
      value: formatPercentage(statistics.value.walkingPercentage || 0),
      color: '#67C23A'
    },
    {
      name: '跌倒',
      value: formatPercentage(statistics.value.fallPercentage || 0),
      color: '#F56C6C'
    }
  ]
})

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
      dataRes = await getTI6843PosturePersonHistoricalData(searchForm.personIdInput, params)
      statsRes = await getTI6843PosturePersonHistoricalSummary(searchForm.personIdInput, params.start, params.end)
    } else if (searchForm.deviceId) {
      // 按设备查询
      dataRes = await getTI6843PostureDeviceHistoricalData({ ...params, deviceId: searchForm.deviceId })
      statsRes = await getTI6843PostureDeviceHistoricalSummary(searchForm.deviceId, params.start, params.end)
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
      sittingPercentage: 0,
      sittingDuration: 0,
      standingPercentage: 0,
      standingDuration: 0,
      walkingPercentage: 0,
      walkingDuration: 0,
      fallPercentage: 0,
      fallCount: 0,
      totalDuration: 0
    }
    
    // 渲染图表（始终渲染，即使数据为0）
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
      sittingPercentage: 0,
      sittingDuration: 0,
      standingPercentage: 0,
      standingDuration: 0,
      walkingPercentage: 0,
      walkingDuration: 0,
      fallPercentage: 0,
      fallCount: 0,
      totalDuration: 0
    }
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
    sittingPercentage: 0,
    sittingDuration: 0,
    standingPercentage: 0,
    standingDuration: 0,
    walkingPercentage: 0,
    walkingDuration: 0,
    fallPercentage: 0,
    fallCount: 0,
    totalDuration: 0
  }
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
  
  const chartData = [
    { value: statistics.value.sittingPercentage || 0, name: '坐姿', itemStyle: { color: '#845EF7' } },
    { value: statistics.value.standingPercentage || 0, name: '站立', itemStyle: { color: '#5E9AFF' } },
    { value: statistics.value.walkingPercentage || 0, name: '行走', itemStyle: { color: '#67C23A' } },
    { value: statistics.value.fallPercentage || 0, name: '跌倒', itemStyle: { color: '#F56C6C' } }
  ]
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%'
    },
    series: [
      {
        name: '位姿分布',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      },
      // 内圈文字
      {
        type: 'pie',
        radius: ['0%', '40%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            return `{total|${formatDuration(statistics.value.totalDuration)}}\n{label|总时长}`
          },
          rich: {
            total: {
              fontSize: 24,
              fontWeight: 'bold',
              color: '#2c3e50',
              lineHeight: 36
            },
            label: {
              fontSize: 14,
              color: '#909399',
              lineHeight: 24
            }
          }
        },
        data: [{ value: 1 }],
        itemStyle: {
          color: 'transparent'
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
const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%'
  return `${Number(value).toFixed(1)}%`
}

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0小时'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  } else if (minutes > 0) {
    return `${minutes}分钟`
  } else {
    return `${seconds}秒`
  }
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

const getPostureText = (posture) => {
  const postureMap = {
    'sitting': '坐姿',
    'standing': '站立',
    'walking': '行走',
    'lying': '躺卧',
    'fall': '跌倒',
    'unknown': '未知'
  }
  return postureMap[posture] || posture || 'N/A'
}

const getPostureType = (posture) => {
  const typeMap = {
    'sitting': 'primary',
    'standing': 'success',
    'walking': 'warning',
    'lying': 'info',
    'fall': 'danger',
    'unknown': 'info'
  }
  return typeMap[posture] || 'info'
}

const getActivityText = (activity) => {
  const activityMap = {
    'stationary': '静止',
    'moving': '移动',
    'active': '活跃',
    'inactive': '不活跃',
    'unknown': '未知'
  }
  return activityMap[activity] || activity || 'N/A'
}

const getActivityType = (activity) => {
  const typeMap = {
    'stationary': 'info',
    'moving': 'warning',
    'active': 'success',
    'inactive': 'info',
    'unknown': 'info'
  }
  return typeMap[activity] || 'info'
}

const getPointCloudCount = (row) => {
  if (!row.pointclouds || !Array.isArray(row.pointclouds)) return 0
  
  return row.pointclouds.reduce((total, frame) => {
    if (Array.isArray(frame)) {
      return total + frame.reduce((frameTotal, cloud) => {
        return frameTotal + (Array.isArray(cloud) ? cloud.length : 0)
      }, 0)
    }
    return total
  }, 0)
}

const getKeypointCount = (row) => {
  if (!row.keypoints || !Array.isArray(row.keypoints)) return 0
  return row.keypoints.length
}
</script>

<style scoped>
.historical-posture-page {
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

.sitting-card {
  border-left: 4px solid #845EF7;
}

.standing-card {
  border-left: 4px solid #5E9AFF;
}

.walking-card {
  border-left: 4px solid #67C23A;
}

.fall-card {
  border-left: 4px solid #F56C6C;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.sitting-icon {
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.1), rgba(132, 94, 247, 0.2));
  color: #845EF7;
}

.standing-icon {
  background: linear-gradient(135deg, rgba(94, 154, 255, 0.1), rgba(94, 154, 255, 0.2));
  color: #5E9AFF;
}

.walking-icon {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1), rgba(103, 194, 58, 0.2));
  color: #67C23A;
}

.fall-icon {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.1), rgba(245, 108, 108, 0.2));
  color: #F56C6C;
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

.stat-duration {
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

.chart-info {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.total-time {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.1), rgba(94, 233, 255, 0.1));
  border-radius: 20px;
  color: var(--primary-600);
}

.chart-container-wrapper {
  display: grid;
  grid-template-columns: 1fr 250px;
  gap: 32px;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.chart-legend-custom {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.legend-item:hover {
  background: #f0f2f5;
  transform: translateX(4px);
}

.legend-dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.legend-value {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
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
@media (max-width: 1200px) {
  .chart-container-wrapper {
    grid-template-columns: 1fr;
  }
  
  .chart-legend-custom {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

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
