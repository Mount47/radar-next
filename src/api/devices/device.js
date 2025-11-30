import request from '@/utils/request'
import { mapDevicesFromBackend, mapDeviceFromBackend } from '@/utils/dataMapping'

// 获取设备列表（支持分页与搜索参数），并标准化为前端格式
export function getDevices(params = {}) {
  return request({
    url: '/api/radar/devices',
    method: 'get',
    params
  }).then(({ data }) => {
    console.log('📦 原始后端响应数据:', data)
    console.log('📦 响应数据类型:', typeof data, '是否为数组:', Array.isArray(data))
    
    // data 可能是数组或包含 devices/content 的分页对象
    let list = []
    let meta = null
    
    if (Array.isArray(data)) {
      console.log('⚠️ 后端返回的是纯数组（无分页信息）')
      list = data
      meta = null // 纯数组没有分页元信息
    } else if (data && typeof data === 'object') {
      // 后端返回的是分页对象
      console.log('✅ 后端返回的是分页对象，字段:', Object.keys(data))
      
      // 提取设备列表
      if (Array.isArray(data.devices)) {
        list = data.devices
      } else if (Array.isArray(data.content)) {
        list = data.content
      } else if (Array.isArray(data.data)) {
        list = data.data
      } else {
        console.error('❌ 无法从响应中提取设备列表，响应结构:', data)
      }
      
      // 保留完整的meta信息（包括分页信息）
      meta = data
      
      console.log('📊 提取到的设备数量:', list.length)
      console.log('📊 分页信息 - total:', data.total || data.totalElements || data.totalCount || data.totalItems || '未找到')
      console.log('📊 分页信息 - page:', data.page || data.currentPage || data.number || '未找到')
      console.log('📊 分页信息 - size:', data.size || data.pageSize || '未找到')
    } else {
      console.error('❌ 后端返回的数据格式不正确:', data)
    }
    
    return { data: mapDevicesFromBackend(list), meta }
  })
}

// 获取简单设备列表（不分页）
export function getSimpleDeviceList() {
  return request({
    url: '/api/radar/devices/list',
    method: 'get'
  }).then(({ data }) => ({ data: mapDevicesFromBackend(Array.isArray(data) ? data : (data?.devices || [])) }))
}

// 获取所有设备的绑定状态信息（用于映射管理）
export function getDevicesForMapping() {
  return request({
    url: '/api/device-status/all-for-mapping',
    method: 'get'
  }).then(({ data }) => {
    // data 格式应该包含：
    // [
    //   {
    //     deviceId: "r60abd1_com3",
    //     deviceName: "雷达设备A", 
    //     modelType: "R60ABD1",
    //     isBound: true/false,
    //     boundPersonName: "张三" (如果已绑定),
    //     boundPersonId: "PERSON_001" (如果已绑定),
    //     mappingId: 123 (如果已绑定),
    //     lastDataTime: "2023-12-19T10:30:00Z",
    //     status: "online/offline/unbound"
    //   }
    // ]
    return { data: Array.isArray(data) ? data : [] }
  }).catch(error => {
    console.warn('获取设备绑定状态API不可用，尝试备用方案:', error)
    // 备用方案：合并设备列表和映射关系
    return getDevicesWithMappingStatus()
  })
}

// 备用方案：合并设备列表和映射关系信息
async function getDevicesWithMappingStatus() {
  try {
    // 并行获取设备列表和映射关系
    const [devicesResponse, mappingsResponse] = await Promise.all([
      getDevices(),
      import('@/api/mappings/person-device-mapping').then(module => module.getPersonDeviceMappings())
    ])
    
    const devices = devicesResponse.data || []
    const mappings = mappingsResponse.data?.content || mappingsResponse.data || []
    
    // 合并数据
    const devicesWithStatus = devices.map(device => {
      const mapping = mappings.find(m => m.deviceId === device.deviceId && m.isActive)
      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName || device.name,
        modelType: device.modelType || device.type,
        isBound: !!mapping,
        boundPersonName: mapping?.personName,
        boundPersonId: mapping?.personId,
        mappingId: mapping?.id,
        lastDataTime: device.lastDataTime,
        status: mapping ? 'bound' : 'unbound'
      }
    })
    
    console.log('🔄 使用备用方案合并设备和映射数据:', devicesWithStatus)
    return { data: devicesWithStatus }
  } catch (error) {
    console.error('备用方案也失败了:', error)
    return { data: [] }
  }
}

// 获取单个设备，并标准化
export function getDevice(deviceId) {
  return request({
    url: `/api/radar/devices/${deviceId}`,
    method: 'get'
  }).then(({ data }) => ({ data: mapDeviceFromBackend(data) }))
}

// 添加设备
export function addDevice(data) {
  return request({
    url: '/api/radar/devices',
    method: 'post',
    data
  })
}

// 更新设备
export function updateDevice(deviceId, data) {
  return request({
    url: `/api/radar/devices/${deviceId}`,
    method: 'put',
    data
  })
}

// 删除设备
export function deleteDevice(deviceId) {
  return request({
    url: `/api/radar/devices/${deviceId}`,
    method: 'delete'
  })
}

// 更新设备状态
export function updateDeviceStatus(deviceId, status) {
  return request({
    url: `/api/radar/devices/${deviceId}/status`,
    method: 'put',
    params: { status }
  })
}

// 批量更新设备状态
export function batchUpdateDeviceStatus(deviceIds, status) {
  return request({
    url: '/api/radar/devices/batch/status',
    method: 'put',
    data: { deviceIds, status }
  })
}

// 批量删除设备
export function batchDeleteDevices(deviceIds) {
  return request({
    url: '/api/radar/devices/batch',
    method: 'delete',
    data: { deviceIds }
  })
}

// 获取设备统计信息
export function getDeviceStatistics() {
  return request({
    url: '/api/radar/devices/statistics',
    method: 'get'
  })
}

// 获取型号类型列表
export function getModelTypes() {
  return request({
    url: '/api/radar/devices/model-types',
    method: 'get'
  })
}

// 获取状态列表
export function getDeviceStatuses() {
  return request({
    url: '/api/radar/devices/statuses',
    method: 'get'
  })
}
