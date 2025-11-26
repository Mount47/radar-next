import request from '@/utils/request'

// 获取所有位姿数据
export function getAllPose() {
  return request({
    url: '/api/pose',
    method: 'get'
  })
}

// 获取最新20条位姿数据
export function getLatestPose() {
  return request({
    url: '/api/pose/latest',
    method: 'get'
  })
}

// 获取特定设备的位姿数据
export function getDevicePose(deviceId) {
  return request({
    url: `/api/pose/device/${deviceId}`,
    method: 'get'
  })
}

// 获取特定设备和目标的位姿数据
export function getDeviceTargetPose(deviceId, targetId) {
  return request({
    url: `/api/pose/device/${deviceId}/target/${targetId}`,
    method: 'get'
  })
}

// 添加位姿数据
export function addPose(data) {
  return request({
    url: '/api/pose',
    method: 'post',
    data
  })
}

// 更新位姿数据
export function updatePose(id, data) {
  return request({
    url: `/api/pose/${id}`,
    method: 'put',
    data
  })
}

// 删除位姿数据
export function deletePose(id) {
  return request({
    url: `/api/pose/${id}`,
    method: 'delete'
  })
}

// 模拟数据生成函数
const generateMockData = () => {
  return {
    heartbeat: 60 + Math.random() * 20,
    breath: 16 + Math.random() * 8,
    motion: Math.random() * 0.5,
    presence: true,
    heartbeatWave: Array.from({ length: 50 }, () => Math.sin(Math.random() * Math.PI) * 0.5 + 0.5),
    breathWave: Array.from({ length: 50 }, () => Math.sin(Math.random() * Math.PI) * 0.3 + 0.3),
    timestamp: new Date().toISOString()
  }
}

// 模拟获取设备生命体征数据
export const getDeviceVitalSigns = async(deviceId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 200,
        data: generateMockData(),
        message: 'success'
      })
    }, 100)
  })
}

// 模拟获取设备状态
export const getDeviceStatus = async(deviceId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 200,
        data: {
          deviceId,
          status: 'online',
          lastUpdateTime: new Date().toISOString()
        },
        message: 'success'
      })
    }, 50)
  })
}

// 模拟获取设备配置
export const getDeviceConfig = async(deviceId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 200,
        data: {
          deviceId,
          sampleRate: 200,
          dataInterval: 1000,
          alarmThresholds: {
            heartRateHigh: 100,
            heartRateLow: 60,
            breathRateHigh: 20,
            breathRateLow: 12
          }
        },
        message: 'success'
      })
    }, 50)
  })
}
