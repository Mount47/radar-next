<template>
  <div class="device-container">
    <pre>{{ deviceList }}</pre>
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
} from '@/api/device'

export default {
  name: 'DeviceManagement',
  data() {
    return {
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
      selectedDevices: [],
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
  mounted() {
    this.loadDevices()
    this.setupWebSocket()
  },
  beforeDestroy() {
    this.closeWebSocket()
  },
  methods: {
    // 工具方法
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

    // 加载设备列表
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
        }

        // 计算统计信息
        this.calculateStatistics()
      } catch (error) {
        console.error('加载设备列表失败:', error)
        // this.$message.error('加载设备列表失败')
      } finally {
        this.loading = false
      }
    },

    // 计算统计信息
    calculateStatistics() {
      const total = this.pagination.total
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

    // 搜索
    handleSearch() {
      this.pagination.currentPage = 1
      this.loadDevices()
    },

    // 刷新
    handleRefresh() {
      this.loadDevices()
      // this.$message.success('刷新成功')
    },

    // 分页变化
    handleSizeChange(size) {
      this.pagination.pageSize = size
      this.pagination.currentPage = 1
      this.loadDevices()
    },
    handlePageChange(page) {
      this.pagination.currentPage = page
      this.loadDevices()
    },

    // 选择变化
    handleSelectionChange(selection) {
      this.selectedDevices = selection
    },

    // 查看详情
    handleViewDetails(device) {
      this.currentDevice = device
      this.detailsDialogVisible = true
    },
    resetDetailsDialog() {
      this.currentDevice = null
    },

    // 编辑设备
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

    // 查看监测
    viewMonitor(device) {
      if (!device) return
      const type = (device.type || '').trim()
      const typeRouteMap = {
        '人体位姿': '/realtime/posture',
        '呼吸心跳': '/realtime/vital',
        '心电': '/realtime/ecg',
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

    // 新增设备
    handleAddDevice() {
      this.currentDevice = null
      this.resetEditDialog()
      this.editDialogVisible = true
    },

    // 提交编辑
    async handleSubmitEdit() {
      try {
        await this.$refs.editForm.validate()
        this.submitting = true

        if (this.currentDevice) {
          // 更新设备
          await updateDevice(this.editForm.deviceId, {
            deviceName: this.editForm.deviceName,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          // this.$message.success('设备信息已更新')
        } else {
          // 新增设备
          await addDevice({
            deviceId: this.editForm.deviceId,
            deviceName: this.editForm.deviceName,
            modelType: this.editForm.modelType,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          // this.$message.success('设备注册成功')
        }

        this.editDialogVisible = false
        this.loadDevices()
      } catch (error) {
        console.error('保存设备失败:', error)
        // this.$message.error(error.message || '保存失败')
      } finally {
        this.submitting = false
      }
    },

    // 状态管理（已移除单个状态管理按钮与对话框）

    // 删除设备
    handleDelete(device) {
      // this.$confirm(`确定要删除设备 "${device.deviceName || device.deviceId}" 吗？此操作不可撤销！`, '确认删除', {
      //   confirmButtonText: '确定',
      //   cancelButtonText: '取消',
      //   type: 'warning'
      // }).then(async() => {
        // try {
        //   await deleteDevice(device.deviceId)
        //   this.$message.success('设备已删除')
        //   this.loadDevices()
        // } catch (error) {
        //   console.error('删除设备失败:', error)
        //   this.$message.error(error.response?.data?.message || '删除失败，设备可能存在绑定关系')
        // }
      // }).catch(() => {})
    },

    // 批量更新状态
    handleBatchUpdateStatus() {
      if (this.selectedDevices.length === 0) {
        // this.$message.warning('请先选择设备')
        return
      }
      this.batchStatus = 'offline'
      this.batchStatusDialogVisible = true
    },
    async handleConfirmBatchStatus() {
      if (!this.batchStatus) return

      try {
        const deviceIds = this.selectedDevices.map(d => d.deviceId)
        for (const deviceId of deviceIds) {
          await updateDeviceStatus(deviceId, this.batchStatus)
        }
        // this.$message.success(`已成功更新 ${deviceIds.length} 个设备的状态`)
        this.batchStatusDialogVisible = false
        this.$refs.deviceTable.clearSelection()
        this.loadDevices()
      } catch (error) {
        console.error('批量更新状态失败:', error)
        // this.$message.error('批量更新失败')
      }
    },

    // 批量删除
    handleBatchDelete() {
      if (this.selectedDevices.length === 0) {
        // this.$message.warning('请先选择设备')
        return
      }

      const deviceNames = this.selectedDevices.map(d => d.deviceName || d.deviceId).join('、')
      // this.$confirm(`确定要删除以下 ${this.selectedDevices.length} 个设备吗？\n\n${deviceNames}\n\n此操作不可撤销！`, '批量删除确认', {
      //   confirmButtonText: '确定删除',
      //   cancelButtonText: '取消',
      //   type: 'error'
      // }).then(async() => {
        // try {
        //   for (const device of this.selectedDevices) {
        //     await deleteDevice(device.deviceId)
        //   }
        //   this.$message.success(`已成功删除 ${this.selectedDevices.length} 个设备`)
        //   this.$refs.deviceTable.clearSelection()
        //   this.loadDevices()
        // } catch (error) {
        //   console.error('批量删除失败:', error)
        //   this.$message.error('批量删除失败，部分设备可能存在绑定关系')
        // }
      // }).catch(() => {})
    },

    // WebSocket
    setupWebSocket() {
      try {
        const serverIp = process.env.VUE_APP_SERVER_IP || 'localhost'
        const serverPort = process.env.VUE_APP_SERVER_PORT || '8080'
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
                // this.$message.info(`设备 ${device.deviceName || device.deviceId} 状态已变更为 ${this.getStatusText(message.newStatus)}`)
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
</style>
