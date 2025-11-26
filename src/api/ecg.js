import request from '@/utils/request'

// 获取所有心电图数据
export function getAllECGData() {
  return request({
    url: '/api/ecg',
    method: 'get'
  })
}

// 获取最新10条心电图数据
export function getLatestECGData() {
  return request({
    url: '/api/ecg/latest',
    method: 'get'
  })
}

// 获取特定设备的心电图数据
export function getDeviceECGData(deviceId) {
  return request({
    url: `/api/ecg/device/${deviceId}`,
    method: 'get'
  })
}

// 添加心电图数据
export function addECGData(data) {
  return request({
    url: '/api/ecg',
    method: 'post',
    data
  })
}

// 更新心电图数据
export function updateECGData(id, data) {
  return request({
    url: `/api/ecg/${id}`,
    method: 'put',
    data
  })
}

// 删除心电图数据
export function deleteECGData(id) {
  return request({
    url: `/api/ecg/${id}`,
    method: 'delete'
  })
}
