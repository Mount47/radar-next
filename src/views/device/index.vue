<template>
  <div class="device-page">
    <div class="page-hero">
      <div class="hero-copy">
        <p class="eyebrow">设备信息</p>
        <!-- <h1>雷达设备管理</h1>
        <p class="subtitle">统一检索、分组与实时监测入口，快速掌握设备在线率、固件与告警状态。</p> -->
        <div class="chips">
          <span class="chip">总数：{{ statistics.totalDevices || 0 }}</span>
          <span class="chip success">在线：{{ statistics.onlineDevices || 0 }}</span>
          <span class="chip warning">离线：{{ statistics.offlineDevices || 0 }}</span>
          <span class="chip info">维保：{{ statistics.maintenanceDevices || 0 }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button type="primary" class="cta" @click="handleAddDevice">新增设备</el-button>
        <el-button @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="filters.search"
        placeholder="搜索设备ID/名称/位置"
        clearable
        :prefix-icon="SearchIcon"
        @change="handleSearch"
      />
      <el-select v-model="filters.modelType" placeholder="型号类型" clearable @change="handleFilter">
        <el-option
          v-for="type in modelTypes"
          :key="type"
          :label="type"
          :value="type"
        />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable @change="handleFilter">
        <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <div class="spacer" />
      <el-button type="primary" link @click="handleBatchUpdateStatus" :disabled="!selectedDevices.length">批量状态</el-button>
      <el-button type="danger" link @click="handleBatchDelete" :disabled="!selectedDevices.length">批量删除</el-button>
    </div>

    <div class="analytics-grid">
      <div class="metric-card" v-for="card in metricCards" :key="card.label">
        <div class="metric-top">
          <span class="metric-icon" :style="{ background: card.tint }">
            <el-icon :size="18"><component :is="card.icon" /></el-icon>
          </span>
          <p class="metric-label">{{ card.label }}</p>
        </div>
        <div class="metric-value">{{ card.value }}</div>
        <p class="metric-sub">{{ card.desc }}</p>
      </div>
      <div class="card status-ratio">
        <h3>状态分布</h3>
        <div class="tags">
          <el-tag type="success">在线 {{ statistics.onlineDevices }}</el-tag>
          <el-tag type="warning">离线 {{ statistics.offlineDevices }}</el-tag>
          <el-tag type="info">维保 {{ statistics.maintenanceDevices }}</el-tag>
        </div>
        <div class="progress">
          <div class="bar online" :style="{ width: onlineRatio + '%' }" />
          <div class="bar offline" :style="{ width: offlineRatio + '%' }" />
          <div class="bar maintenance" :style="{ width: maintenanceRatio + '%' }" />
        </div>
      </div>
      <div class="card model-breakdown">
        <h3>型号分布</h3>
        <div class="model-list">
          <div v-for="item in modelBreakdown" :key="item.model" class="model-row">
            <div>
              <p class="label">{{ item.model }}</p>
              <p class="muted">{{ item.desc }}</p>
            </div>
            <div class="model-count">{{ item.count }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card list-card">
        <div class="card-header">
          <div>
            <h3>设备列表</h3>
            <p class="muted">支持选中、批量操作、查看详情与跳转监测。</p>
          </div>
          <el-button size="small" @click="handleRefresh">刷新数据</el-button>
        </div>
        <el-table
          ref="deviceTable"
          v-loading="loading"
          :data="deviceList"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
          @row-click="setActiveDevice"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="deviceId" label="设备ID" width="150" />
          <el-table-column prop="deviceName" label="名称" width="160" />
          <el-table-column label="监测类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getTypeTagColor(row)">{{ getMonitorType(row) || '未知' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="modelType" label="型号" width="140" />
          <el-table-column prop="location" label="位置" />
          <el-table-column label="状态" width="140">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                <el-icon><component :is="getStatusIcon(row.status)" /></el-icon>
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="180">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click.stop="handleViewDetails(row)">详情</el-button>
              <el-button type="primary" link size="small" @click.stop="handleEdit(row)">编辑</el-button>
              <el-button type="primary" link size="small" @click.stop="viewMonitor(row)">监测</el-button>
              <el-button type="danger" link size="small" @click.stop="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="table-footer">
          <el-pagination
            background
            layout="prev, pager, next, sizes, total"
            :current-page="pagination.currentPage"
            :page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>

      <div class="side-panel card">
        <div class="card-header">
          <div>
            <h3>设备画像</h3>
            <p class="muted">点击表格行查看实时属性与状态。</p>
          </div>
        </div>
        <div v-if="activeDevice" class="profile">
          <div class="avatar-box">{{ activeDevice.deviceName?.[0] || 'D' }}</div>
          <div class="profile-meta">
            <h4>{{ activeDevice.deviceName || activeDevice.deviceId }}</h4>
            <p class="muted">{{ getModelText(activeDevice) }}</p>
            <p>{{ activeDevice.location || '未填写位置' }}</p>
          </div>
          <div class="detail-grid">
            <div>
              <p class="label">设备ID</p>
              <p class="value">{{ activeDevice.deviceId }}</p>
            </div>
            <div>
              <p class="label">监测类型</p>
              <p class="value">{{ getMonitorType(activeDevice) || '未知' }}</p>
            </div>
            <div>
              <p class="label">状态</p>
              <p class="value">{{ getStatusText(activeDevice.status) }}</p>
            </div>
            <div>
              <p class="label">更新时间</p>
              <p class="value">{{ formatTime(activeDevice.updatedAt) || '暂无' }}</p>
            </div>
          </div>
          <div class="profile-actions">
            <el-button type="primary" plain size="small" @click="handleViewDetails(activeDevice)">详情</el-button>
            <el-button type="primary" plain size="small" @click="viewMonitor(activeDevice)">跳转监测</el-button>
          </div>
        </div>
        <div v-else class="empty-profile">
          <p class="muted">请选择左侧列表中的设备查看概要。</p>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailsDialogVisible" title="设备详情" width="520px" @close="resetDetailsDialog">
      <div v-if="currentDevice">
        <p>设备ID：{{ currentDevice.deviceId }}</p>
        <p>名称：{{ currentDevice.deviceName || '-' }}</p>
        <p>型号：{{ currentDevice.modelType || '-' }}</p>
        <p>监测类型：{{ getMonitorType(currentDevice) || '-' }}</p>
        <p>位置：{{ currentDevice.location || '-' }}</p>
        <p>状态：{{ getStatusText(currentDevice.status) }}</p>
        <p>更新时间：{{ formatTime(currentDevice.updatedAt) || '暂无' }}</p>
      </div>
      <div v-else class="muted">暂无设备信息</div>
      <template #footer>
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEditFromDetails">编辑</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" :title="currentDevice ? '编辑设备' : '新增设备'" width="520px" @close="resetEditDialog">
      <el-form ref="editForm" :model="editForm" :rules="editRules" label-width="88px">
        <el-form-item label="设备ID" prop="deviceId">
          <el-input v-model="editForm.deviceId" placeholder="唯一标识" :disabled="!!currentDevice" />
        </el-form-item>
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="editForm.deviceName" placeholder="便于识别的名称" />
        </el-form-item>
        <el-form-item label="型号类型" prop="modelType">
          <el-select v-model="editForm.modelType" placeholder="选择型号" :disabled="!!currentDevice">
            <el-option v-for="type in modelTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="型号" prop="model">
          <el-input v-model="editForm.model" placeholder="如固件/硬件版本" />
        </el-form-item>
        <el-form-item label="部署位置" prop="location">
          <el-input v-model="editForm.location" placeholder="房间/床位/楼层" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchStatusDialogVisible" title="批量更新状态" width="420px">
      <el-select v-model="batchStatus" placeholder="选择新状态" style="width: 100%">
        <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <template #footer>
        <el-button @click="batchStatusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleConfirmBatchStatus">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import {
  getDeviceMonitorType,
  getDeviceStatusText,
  getDeviceStatusTagType,
  getDeviceStatusIcon,
  getDeviceModelText,
  formatDeviceTime,
  DEVICE_TYPE_TAG_COLOR
} from '@/utils/deviceConfig'
import {
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  updateDeviceStatus
} from '@/api/devices/device'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Cpu, Platform, Tools } from '@element-plus/icons-vue'

export default {
  name: 'DeviceManagement',
  data() {
    return {
      SearchIcon: Search,
      loading: false,
      submitting: false,
      deviceList: [],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0
      },
      filters: {
        search: '',
        modelType: '',
        status: ''
      },
      statistics: {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        maintenanceDevices: 0
      },
      modelTypes: [
        'TI6843-VITAL',
        'TI6843-POSTURE',
        'R60ABD1',
        'R77ABH1'
      ],
      statusOptions: [
        { label: '在线', value: 'online' },
        { label: '离线', value: 'offline' },
        { label: '维护中', value: 'maintenance' }
      ],
      selectedDevices: [],
      activeDevice: null,
      currentDevice: null,
      detailsDialogVisible: false,
      editDialogVisible: false,
      batchStatusDialogVisible: false,
      batchStatus: '',
      editForm: {
        deviceId: '',
        deviceName: '',
        modelType: '',
        model: '',
        location: '',
        status: 'offline'
      },
      editRules: {
        deviceId: [
          { required: true, message: '请输入设备ID', trigger: 'blur' },
          { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
        ],
        modelType: [
          { required: true, message: '请选择型号类型', trigger: 'change' }
        ],
        status: [
          { required: true, message: '请选择设备状态', trigger: 'change' }
        ]
      },
      wsConnection: null
    }
  },
  computed: {
    metricCards() {
      return [
        { label: '在线设备', value: this.statistics.onlineDevices, desc: '当前可用', icon: Refresh, tint: 'linear-gradient(135deg, #86efac, #34d399)' },
        { label: '离线设备', value: this.statistics.offlineDevices, desc: '待排查', icon: Platform, tint: 'linear-gradient(135deg, #fcd34d, #f59e0b)' },
        { label: '维护中', value: this.statistics.maintenanceDevices, desc: '升级/检修', icon: Tools, tint: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)' },
        { label: '总设备数', value: this.statistics.totalDevices, desc: '包含全部型号', icon: Cpu, tint: 'linear-gradient(135deg, #a78bfa, #5ee9ff)' }
      ]
    },
    onlineRatio() {
      if (!this.statistics.totalDevices) return 0
      return ((this.statistics.onlineDevices / this.statistics.totalDevices) * 100).toFixed(0)
    },
    offlineRatio() {
      if (!this.statistics.totalDevices) return 0
      return ((this.statistics.offlineDevices / this.statistics.totalDevices) * 100).toFixed(0)
    },
    maintenanceRatio() {
      if (!this.statistics.totalDevices) return 0
      return ((this.statistics.maintenanceDevices / this.statistics.totalDevices) * 100).toFixed(0)
    },
    modelBreakdown() {
      const counts = {}
      this.deviceList.forEach(device => {
        const key = device.modelType || '其他型号'
        counts[key] = (counts[key] || 0) + 1
      })
      return Object.keys(counts).map(model => ({
        model,
        count: counts[model],
        desc: this.getModelText({ modelType: model })
      }))
    }
  },
  mounted() {
    this.loadDevices()
    this.setupWebSocket()
  },
  beforeUnmount() {
    this.closeWebSocket()
  },
  methods: {
    getMonitorType(device) {
      return getDeviceMonitorType(device)
    },
    getStatusText(status) {
      return getDeviceStatusText(status)
    },
    getStatusTagType(status) {
      return getDeviceStatusTagType(status)
    },
    getStatusIcon(status) {
      return getDeviceStatusIcon(status)
    },
    getModelText(device) {
      return getDeviceModelText(device)
    },
    formatTime(time) {
      return formatDeviceTime(time)
    },
    getTypeTagColor(device) {
      const type = this.getMonitorType(device)
      return DEVICE_TYPE_TAG_COLOR[type] || 'info'
    },
    setActiveDevice(row) {
      this.activeDevice = row
    },
    async loadDevices() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.currentPage - 1,
          size: this.pagination.pageSize,
          search: this.filters.search || undefined,
          modelType: this.filters.modelType || undefined,
          status: this.filters.status || undefined,
          sortBy: 'updatedAt',
          sortDir: 'desc'
        }

        const { data, meta } = await getDevices(params)
        this.deviceList = data || []

        if (meta) {
          this.pagination.total = meta.totalItems || meta.total || 0
          this.pagination.currentPage = (meta.currentPage || 0) + 1
        } else {
          this.pagination.total = this.deviceList.length
        }

        this.calculateStatistics()
        this.activeDevice = this.deviceList[0] || null
      } catch (error) {
        console.error('加载设备列表失败:', error)
        ElMessage.error('加载设备列表失败')
      } finally {
        this.loading = false
      }
    },
    calculateStatistics() {
      const total = this.pagination.total || this.deviceList.length
      const online = this.deviceList.filter(d => d.status === 'online').length
      const offline = this.deviceList.filter(d => d.status === 'offline').length
      const maintenance = this.deviceList.filter(d => d.status === 'maintenance').length

      this.statistics = {
        totalDevices: total,
        onlineDevices: online,
        offlineDevices: offline,
        maintenanceDevices: maintenance
      }
    },
    handleSearch() {
      this.pagination.currentPage = 1
      this.loadDevices()
    },
    handleFilter() {
      this.pagination.currentPage = 1
      this.loadDevices()
    },
    handleRefresh() {
      this.loadDevices()
      ElMessage.success('已刷新设备列表')
    },
    handleSizeChange(size) {
      this.pagination.pageSize = size
      this.pagination.currentPage = 1
      this.loadDevices()
    },
    handlePageChange(page) {
      this.pagination.currentPage = page
      this.loadDevices()
    },
    handleSelectionChange(selection) {
      this.selectedDevices = selection
    },
    handleViewDetails(device) {
      this.currentDevice = device
      this.detailsDialogVisible = true
    },
    resetDetailsDialog() {
      this.currentDevice = null
    },
    handleEdit(device) {
      this.currentDevice = device
      this.editForm = {
        deviceId: device.deviceId,
        deviceName: device.deviceName || '',
        modelType: device.modelType || '',
        model: device.model || '',
        location: device.location || '',
        status: device.status || 'offline'
      }
      this.editDialogVisible = true
    },
    handleEditFromDetails() {
      this.detailsDialogVisible = false
      this.handleEdit(this.currentDevice)
    },
    resetEditDialog() {
      this.currentDevice = null
      this.editForm = {
        deviceId: '',
        deviceName: '',
        modelType: '',
        model: '',
        location: '',
        status: 'offline'
      }
      if (this.$refs.editForm) {
        this.$refs.editForm.clearValidate()
      }
    },
    viewMonitor(device) {
      if (!device) return
      const type = (device.type || '').trim()
      const typeRouteMap = {
        '人体位姿': '/realtime/posture',
        '呼吸心跳': '/realtime/vital',
        '心电': '/realtime/ecg'
      }
      const path = typeRouteMap[type] || '/realtime'
      this.$router.push({
        path,
        query: {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceLocation: device.location
        }
      })
    },
    handleAddDevice() {
      this.currentDevice = null
      this.resetEditDialog()
      this.editDialogVisible = true
    },
    async handleSubmitEdit() {
      try {
        await this.$refs.editForm.validate()
        this.submitting = true

        if (this.currentDevice) {
          await updateDevice(this.editForm.deviceId, {
            deviceName: this.editForm.deviceName,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          ElMessage.success('设备信息已更新')
        } else {
          await addDevice({
            deviceId: this.editForm.deviceId,
            deviceName: this.editForm.deviceName,
            modelType: this.editForm.modelType,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          ElMessage.success('设备注册成功')
        }

        this.editDialogVisible = false
        this.loadDevices()
      } catch (error) {
        console.error('保存设备失败:', error)
        if (error?.message) ElMessage.error(error.message)
      } finally {
        this.submitting = false
      }
    },
    async handleDelete(device) {
      if (!device) return
      try {
        await ElMessageBox.confirm(`确定删除设备 "${device.deviceName || device.deviceId}" 吗？此操作不可撤销。`, '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteDevice(device.deviceId)
        ElMessage.success('设备已删除')
        this.loadDevices()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除设备失败:', error)
          ElMessage.error('删除失败，设备可能存在绑定关系')
        }
      }
    },
    handleBatchUpdateStatus() {
      if (!this.selectedDevices.length) {
        ElMessage.warning('请先选择设备')
        return
      }
      this.batchStatus = 'offline'
      this.batchStatusDialogVisible = true
    },
    async handleConfirmBatchStatus() {
      if (!this.batchStatus) return

      try {
        this.submitting = true
        const deviceIds = this.selectedDevices.map(d => d.deviceId)
        for (const deviceId of deviceIds) {
          await updateDeviceStatus(deviceId, this.batchStatus)
        }
        ElMessage.success(`已更新 ${deviceIds.length} 台设备状态`)
        this.batchStatusDialogVisible = false
        this.$refs.deviceTable?.clearSelection()
        this.loadDevices()
      } catch (error) {
        console.error('批量更新状态失败:', error)
        ElMessage.error('批量更新失败')
      } finally {
        this.submitting = false
      }
    },
    handleBatchDelete() {
      if (!this.selectedDevices.length) {
        ElMessage.warning('请先选择设备')
        return
      }
      const deviceNames = this.selectedDevices.map(d => d.deviceName || d.deviceId).join('、')
      ElMessageBox.confirm(`确认删除以下设备？\n${deviceNames}`, '批量删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error'
      })
        .then(async() => {
          this.submitting = true
          for (const device of this.selectedDevices) {
            await deleteDevice(device.deviceId)
          }
          ElMessage.success(`已删除 ${this.selectedDevices.length} 台设备`)
          this.$refs.deviceTable?.clearSelection()
          this.loadDevices()
        })
        .catch(() => {})
        .finally(() => {
          this.submitting = false
        })
    },
    setupWebSocket() {
      try {
        const serverIp = import.meta.env.VITE_SERVER_IP || 'localhost'
        const serverPort = import.meta.env.VITE_SERVER_PORT || '8080'
        const wsUrl = `ws://${serverIp}:${serverPort}/ws/device-status`

        this.wsConnection = new WebSocket(wsUrl)

        this.wsConnection.onopen = () => {
          console.log('✅ WebSocket连接已建立')
        }

        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            if (message.type === 'DEVICE_STATUS_CHANGE') {
              const device = this.deviceList.find(d => d.deviceId === message.deviceId)
              if (device) {
                device.status = message.newStatus
                device.updatedAt = message.timestamp
              }
              this.calculateStatistics()
            } else if (message.type === 'DEVICE_STATISTICS') {
              this.statistics = {
                totalDevices: message.totalDevices || 0,
                onlineDevices: message.onlineDevices || 0,
                offlineDevices: message.offlineDevices || 0,
                maintenanceDevices: message.statusDistribution?.maintenance || 0
              }
            }
          } catch (error) {
            console.error('WebSocket消息解析失败:', error)
          }
        }

        this.wsConnection.onerror = (error) => {
          console.error('WebSocket错误:', error)
        }

        this.wsConnection.onclose = () => {
          console.log('WebSocket连接已关闭')
        }
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    },
    closeWebSocket() {
      if (this.wsConnection) {
        this.wsConnection.close()
        this.wsConnection = null
      }
    }
  }
}
</script>

<style scoped>
.device-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(120deg, rgba(132, 94, 247, 0.12), rgba(94, 233, 255, 0.12));
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 18px 22px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
}

.hero-copy h1 {
  margin: 0;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 4px;
}

.subtitle {
  margin: 6px 0 10px;
  color: #6b7280;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-weight: 600;
}

.chip.success {
  color: #059669;
}

.chip.warning {
  color: #d97706;
}

.chip.info {
  color: #2563eb;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cta {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
  border: none;
  color: #fff;
}

.toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr)) auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.spacer {
  flex: 1;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.metric-card {
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
}

.metric-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.metric-label {
  margin: 0;
  color: #6b7280;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  margin: 6px 0 4px;
}

.metric-sub {
  margin: 0;
  color: #9ca3af;
}

.card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
}

.status-ratio h3,
.model-breakdown h3 {
  margin: 0 0 10px;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.progress {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bar {
  height: 8px;
  border-radius: 10px;
}

.bar.online {
  background: linear-gradient(90deg, #34d399, #10b981);
}

.bar.offline {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.bar.maintenance {
  background: linear-gradient(90deg, #a5b4fc, #818cf8);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(132, 94, 247, 0.05);
}

.model-count {
  font-weight: 700;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
}

.muted {
  color: #9ca3af;
  margin: 0;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px 4px;
}

.side-panel {
  min-height: 100%;
}

.profile {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.avatar-box {
  width: 66px;
  height: 66px;
  border-radius: 18px;
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.profile-meta h4 {
  margin: 0 0 4px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.label {
  margin: 0 0 4px;
  color: #9ca3af;
  font-size: 12px;
  text-transform: uppercase;
}

.value {
  margin: 0;
  font-weight: 600;
  color: #111827;
}

.profile-actions {
  display: flex;
  gap: 10px;
}

.empty-profile {
  color: #9ca3af;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .toolbar {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
</style>
