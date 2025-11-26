import request from '@/utils/request'

// 获取所有生命体征数据
export function getAllVitalSigns() {
  return request({
    url: '/api/vital-signs',
    method: 'get'
  })
}

// 获取最新10条数据
export function getLatestVitalSigns() {
  return request({
    url: '/api/vital-signs/latest',
    method: 'get'
  })
}

// 获取设备生命体征数据
export function getDeviceVitalSigns(deviceId) {
  return {
    url: `/api/vital-signs/device/${deviceId}`,
    method: 'get'
  }
}

// 获取设备状态
export function getDeviceStatus(deviceId) {
  return {
    url: `/api/vital-signs/device/${deviceId}/status`,
    method: 'get'
  }
}

// 获取WebSocket连接URL
export function getWebSocketUrl(deviceId, clientType = 'frontend') {
  return `ws://localhost:8080/radar-websocket?deviceId=${deviceId}&clientType=${clientType}`
}

// 添加生命体征数据
export function addVitalSigns(data) {
  return request({
    url: '/api/vital-signs',
    method: 'post',
    data
  })
}

// 更新生命体征数据
export function updateVitalSigns(id, data) {
  return request({
    url: `/api/vital-signs/${id}`,
    method: 'put',
    data
  })
}

// 删除生命体征数据
export function deleteVitalSigns(id) {
  return request({
    url: `/api/vital-signs/${id}`,
    method: 'delete'
  })
}
