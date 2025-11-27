import { defineStore } from 'pinia'
import { getDevices, addDevice, updateDevice, deleteDevice } from '@/api/device'
import { ElMessage } from 'element-plus'

export const useDeviceStore = defineStore('device', {
  state: () => ({
    deviceList: [],
    loading: false,
    error: null,
    currentDeviceId: 'UnknownID', // 默认设备ID
    pagination: {
      currentPage: 1,
      pageSize: 10,
      total: 0
    }
  }),

  actions: {
    // 设置当前设备
    setCurrentDevice(deviceId) {
      this.currentDeviceId = deviceId
    },

    // 获取设备列表
    async fetchDevices(params = {}) {
      try {
        this.loading = true
        this.error = null
        console.log('正在获取设备列表...')
        
        // 合并分页参数
        const requestParams = {
          page: (params.page || this.pagination.currentPage) - 1, // API要求page从0开始，前端是从1开始
          size: params.size || this.pagination.pageSize,
          search: params.search,
          status: params.status,
          ...params
        }
        
        console.log('发送给API的分页参数:', requestParams)
        
        const { data, meta } = await getDevices(requestParams)
        console.log('获取到的设备列表（已标准化为前端格式）:', data)
        console.log('原始响应元信息:', meta)

        if (Array.isArray(data)) {
          this.deviceList = data
          
          // 更新分页信息
          if (meta) {
            const totalCount = meta.total || meta.totalElements || meta.totalCount || meta.totalItems || null
            const currentPageNum = meta.currentPage ?? meta.page ?? meta.number ?? requestParams.page
            const pageSizeNum = meta.pageSize || meta.size || requestParams.size
            
            if (totalCount === null) {
              console.error('⚠️ 后端未返回总记录数！meta字段:', Object.keys(meta))
            }
            
            this.pagination = {
              currentPage: currentPageNum + 1, // 后端0-based转前端1-based
              pageSize: pageSizeNum,
              total: totalCount || 0
            }
            console.log('✅ 更新分页信息:', this.pagination)
          } else {
            console.error('⚠️ 后端响应缺少meta信息，无法正确分页')
            this.pagination = {
              currentPage: requestParams.page + 1,
              pageSize: requestParams.size,
              total: 0
            }
          }
        } else {
          console.error('设备列表数据格式不正确:', data)
          ElMessage.error('获取设备列表失败：数据格式不正确')
        }
      } catch (error) {
        console.error('获取设备列表失败:', error)
        this.error = error.message
        ElMessage.error('获取设备列表失败：' + (error.message || '未知错误'))
      } finally {
        this.loading = false
      }
    },

    // 添加设备
    async addDevice(deviceData) {
      try {
        await addDevice(deviceData)
        ElMessage.success('添加设备成功')
        this.fetchDevices()
      } catch (error) {
        console.error('添加设备失败:', error)
        ElMessage.error('添加设备失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 更新设备
    async updateDevice({ deviceId, data }) {
      try {
        await updateDevice(deviceId, data)
        ElMessage.success('更新设备成功')
        this.fetchDevices()
      } catch (error) {
        console.error('更新设备失败:', error)
        ElMessage.error('更新设备失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 删除设备
    async deleteDevice(deviceId) {
      try {
        await deleteDevice(deviceId)
        ElMessage.success('删除设备成功')
        this.fetchDevices()
      } catch (error) {
        console.error('删除设备失败:', error)
        ElMessage.error('删除设备失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 更新设备状态 (本地更新，用于WebSocket推送等场景)
    updateDeviceStatus({ deviceId, statusZh, rawStatus }) {
      const idx = this.deviceList.findIndex(d => d.deviceId === deviceId)
      if (idx !== -1) {
        if (statusZh) this.deviceList[idx].status = statusZh
        if (rawStatus !== undefined) this.deviceList[idx].rawStatus = rawStatus
        this.deviceList[idx].updatedAt = new Date().toISOString()
      }
    }
  }
})
