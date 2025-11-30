import request from '@/utils/request'
import { mapMappingsFromBackend, mapMappingFromBackend, mapMappingToBackend } from '@/utils/dataMapping'

// ==================== API检测功能 ====================

// 检测后端API支持情况
export async function checkApiSupport() {
  const results = {
    basicList: false,
    singleUpdate: false,
    batchSafe: false,
    batchUpdate: false,
    inactive: false
  }

  try {
    // 测试基础列表API
    await request({ url: '/api/person-device-mappings', method: 'get', params: { page: 0, size: 1 } })
    results.basicList = true
    console.log('✅ 基础列表API可用')
  } catch (error) {
    console.log('❌ 基础列表API不可用:', error.response?.status)
  }

  try {
    // 测试停用映射列表API  
    await request({ url: '/api/person-device-mappings/inactive', method: 'get', params: { page: 0, size: 1 } })
    results.inactive = true
    console.log('✅ 停用映射列表API可用')
  } catch (error) {
    console.log('❌ 停用映射列表API不可用:', error.response?.status)
  }

  // 输出API支持情况
  console.log('🔍 后端API支持情况:', results)
  return results
}

// 自动适配API调用
export async function adaptiveApiCall(preferredMethod, fallbackMethod, ...args) {
  try {
    return await preferredMethod(...args)
  } catch (error) {
    console.warn('首选API调用失败，尝试备用方案:', error.response?.status)
    if (fallbackMethod) {
      return await fallbackMethod(...args)
    }
    throw error
  }
}

// ==================== 基础查询功能 ====================

// 获取所有活跃的映射关系
export function getPersonDeviceMappings(params = {}) {
  return request({
    url: '/api/person-device-mappings',
    method: 'get',
    params
  }).then(response => {
    if (response.data) {
      if (Array.isArray(response.data)) {
        response.data = mapMappingsFromBackend(response.data)
      } else if (response.data.content) {
        response.data.content = mapMappingsFromBackend(response.data.content)
      }
    }
    return response
  })
}

// 获取所有停用的映射关系（如果后端不支持，则返回空数组）
export function getInactivePersonDeviceMappings(params = {}) {
  return request({
    url: '/api/person-device-mappings/inactive',
    method: 'get',
    params
  }).then(response => {
    if (response.data) {
      if (Array.isArray(response.data)) {
        response.data = mapMappingsFromBackend(response.data)
      } else if (response.data.content) {
        response.data.content = mapMappingsFromBackend(response.data.content)
      }
    }
    return response
  }).catch(error => {
    // 如果后端不支持此API，返回空数组
    console.warn('获取停用映射API不支持:', error)
    return { data: [] }
  })
}

// 根据ID获取映射详情（如果后端不支持，则使用基础查询）
export function getPersonDeviceMappingById(mappingId) {
  return request({
    url: `/api/person-device-mappings/${mappingId}`,
    method: 'get'
  }).then(response => {
    if (response.data) {
      response.data = mapMappingFromBackend(response.data)
    }
    return response
  }).catch(error => {
    // 如果后端不支持此API，可以尝试从列表中查找
    console.warn('根据ID获取映射API不支持:', error)
    return getPersonDeviceMappings().then(response => {
      const mappings = response.data?.content || response.data || []
      const mapping = mappings.find(m => m.id == mappingId)
      return { data: mapping || null }
    })
  })
}

// ==================== 创建功能 ====================

// 创建人员与设备的映射关系（会停用现有映射）
export function createPersonDeviceMapping(data) {
  return request({
    url: '/api/person-device-mappings',
    method: 'post',
    data: mapMappingToBackend(data)
  })
}

// 创建多设备映射（不停用现有映射，支持多设备绑定）
export function createMultiDeviceMapping(data) {
  return request({
    url: '/api/person-device-mappings/multi-bind',
    method: 'post',
    data: mapMappingToBackend(data)
  })
}

// ==================== 设备相关查询 ====================

// 根据设备ID查询对应的人员信息
export function getPersonByDeviceId(deviceId) {
  return request({
    url: `/api/person-device-mappings/device/${deviceId}/person`,
    method: 'get'
  })
}

// 获取设备的所有映射关系（包括停用的）
export function getAllMappingsByDeviceId(deviceId) {
  return request({
    url: `/api/person-device-mappings/device/${deviceId}/all`,
    method: 'get'
  }).then(response => {
    if (response.data && Array.isArray(response.data)) {
      response.data = mapMappingsFromBackend(response.data)
    }
    return response
  }).catch(error => {
    // 如果后端不支持此API，返回空数组
    console.warn('获取设备所有映射API不支持:', error)
    return { data: [] }
  })
}

// 检查设备是否有活跃映射
export function checkDeviceHasActiveMapping(deviceId) {
  return request({
    url: `/api/person-device-mappings/device/${deviceId}/has-active`,
    method: 'get'
  }).catch(error => {
    // 如果后端不支持此API，通过查询映射列表来判断
    console.warn('检查设备活跃映射API不支持:', error)
    return getPersonDeviceMappings().then(response => {
      const mappings = response.data?.content || response.data || []
      const hasActive = mappings.some(m => m.deviceId === deviceId && m.isActive)
      return { data: hasActive }
    })
  })
}

// ==================== 人员相关查询 ====================

// 根据人员ID查询对应的设备信息
export function getDeviceByPersonId(personId) {
  return request({
    url: `/api/person-device-mappings/person/${personId}/device`,
    method: 'get'
  })
}

// 根据人员ID查询所有绑定的设备
export function getDevicesByPersonId(personId) {
  return request({
    url: `/api/person-device-mappings/person/${personId}/devices`,
    method: 'get'
  })
}

// 根据人员ID和设备类型查询绑定的设备
export function getDevicesByPersonIdAndModelType(personId, modelType) {
  return request({
    url: `/api/person-device-mappings/person/${personId}/devices/model-type/${modelType}`,
    method: 'get'
  })
}

// 按设备型号查询活跃绑定
export function getActiveBindingsByModelType(modelType) {
  return request({
    url: `/api/person-device-mappings/active/model-type/${modelType}`,
    method: 'get'
  }).then(response => {
    if (response.data && Array.isArray(response.data)) {
      response.data = mapMappingsFromBackend(response.data)
    }
    return response
  })
}

// 获取绑定统计信息
export function getBindingStatistics() {
  return request({
    url: '/api/person-device-mappings/statistics',
    method: 'get'
  })
}

// 获取人员的所有映射关系（包括停用的）
export function getAllMappingsByPersonId(personId) {
  return request({
    url: `/api/person-device-mappings/person/${personId}/all`,
    method: 'get'
  }).then(response => {
    if (response.data && Array.isArray(response.data)) {
      response.data = mapMappingsFromBackend(response.data)
    }
    return response
  }).catch(error => {
    // 如果后端不支持此API，返回空数组
    console.warn('获取人员所有映射API不支持:', error)
    return { data: [] }
  })
}

// ==================== 更新功能 ====================

// 更新单个映射关系
export function updateSingleMapping(mappingId, data) {
  console.log('🔍 单个映射更新 - 输入数据:', { mappingId, data })
  
  const backendData = mapMappingToBackend(data)
  console.log('📤 转换后的后端数据:', backendData)
  
  return request({
    url: `/api/person-device-mappings/${mappingId}`,
    method: 'put',
    data: backendData
  }).catch(error => {
    console.error('❌ 单个映射更新失败:', error)
    console.error('❌ 错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      requestData: error.config?.data
    })
    throw error
  })
}

// 批量更新映射关系（使用新的批量安全更新接口）
export function batchUpdatePersonDeviceMappings(mappings) {
  // 优先使用批量安全更新接口
  return batchSafeUpdatePersonDeviceMappings(mappings)
}

// 批量安全更新映射关系（新接口，包含数据验证）
export function batchSafeUpdatePersonDeviceMappings(mappings) {
  console.log('🔍 批量安全更新映射 - 输入数据:', mappings)
  
  // 前端数据验证
  const validMappings = mappings.filter(mapping =>
    mapping.personId && mapping.personId.trim() !== '' &&
    mapping.deviceId && mapping.deviceId.trim() !== ''
  )

  console.log('✅ 验证通过的映射数量:', validMappings.length, '/', mappings.length)

  if (validMappings.length !== mappings.length) {
    console.error('❌ 存在无效的映射关系数据:', mappings.filter(m => !validMappings.includes(m)))
    throw new Error('存在无效的映射关系数据，请检查人员ID和设备ID是否完整')
  }

  const requestData = {
    mappings: validMappings.map(mapping => ({
      id: mapping.id, // 添加id字段支持
      personId: mapping.personId,
      deviceId: mapping.deviceId,
      mappingName: mapping.mappingName || `${mapping.personId}-${mapping.deviceId}`,
      isActive: mapping.isActive !== false // 默认为true
    }))
  }

  console.log('📤 发送到后端的数据:', requestData)

  return request({
    url: '/api/person-device-mappings/batch-safe',
    method: 'put',
    headers: {
      'Content-Type': 'application/json'
    },
    data: requestData
  }).catch(error => {
    console.error('❌ 批量安全更新失败:', error)
    console.error('❌ 错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      requestData: error.config?.data
    })
    throw error
  })
}

// 交换两个设备的人员映射关系（旧版本，保持兼容性）
export function swapPersonDeviceMappings(data) {
  return request({
    url: '/api/person-device-mappings/swap',
    method: 'post',
    data
  })
}

// 人员互换（新版本，推荐使用）
export function swapPersons(deviceId1, deviceId2) {
  return request({
    url: '/api/person-device-mappings/swap-persons',
    method: 'post',
    params: { deviceId1, deviceId2 }
  })
}

// 切换绑定关系
export function switchPersonDeviceMapping(deviceId, newPersonId, mappingName) {
  return request({
    url: '/api/person-device-mappings/switch',
    method: 'post',
    params: { deviceId, newPersonId, mappingName }
  })
}

// 停用映射关系（如果后端不支持，则提示用户）
export function deactivatePersonDeviceMapping(mappingId) {
  return request({
    url: `/api/person-device-mappings/${mappingId}/deactivate`,
    method: 'put'
  }).catch(error => {
    console.warn('停用映射API不支持:', error)
    throw new Error('停用映射功能暂未实现，请联系开发人员')
  })
}

// 重新激活映射关系（如果后端不支持，则提示用户）
export function reactivatePersonDeviceMapping(mappingId) {
  return request({
    url: `/api/person-device-mappings/${mappingId}/reactivate`,
    method: 'put'
  }).catch(error => {
    console.warn('激活映射API不支持:', error)
    throw new Error('激活映射功能暂未实现，请联系开发人员')
  })
}

// ==================== 删除功能 ====================

// 删除单个映射关系
export function deletePersonDeviceMapping(mappingId) {
  return request({
    url: `/api/person-device-mappings/${mappingId}`,
    method: 'delete'
  }).then(response => {
    // 处理成功响应，包括204 No Content
    return response
  }).catch(error => {
    console.error('删除映射失败:', error)
    // 检查是否是404错误（资源不存在，可能已被删除）
    if (error.response && error.response.status === 404) {
      console.warn('映射关系不存在，可能已被删除')
      return { success: true, message: '映射关系已删除' }
    }
    // 其他错误正常抛出
    throw error
  })
}

// 删除设备的所有映射关系（如果后端不支持，则提示用户）
export function deleteAllMappingsByDeviceId(deviceId) {
  return request({
    url: `/api/person-device-mappings/device/${deviceId}`,
    method: 'delete'
  }).catch(error => {
    console.warn('删除设备所有映射API不支持:', error)
    throw new Error('删除设备所有映射功能暂未实现，请联系开发人员')
  })
}

// 删除人员的所有映射关系（如果后端不支持，则提示用户）
export function deleteAllMappingsByPersonId(personId) {
  return request({
    url: `/api/person-device-mappings/person/${personId}`,
    method: 'delete'
  }).catch(error => {
    console.warn('删除人员所有映射API不支持:', error)
    throw new Error('删除人员所有映射功能暂未实现，请联系开发人员')
  })
}

// 批量删除映射关系
export function batchDeletePersonDeviceMappings(mappingIds) {
  return request({
    url: '/api/person-device-mappings/batch',
    method: 'delete',
    data: mappingIds
  }).then(response => {
    return response
  }).catch(error => {
    console.error('批量删除映射失败:', error)
    // 如果后端不支持批量删除，尝试逐个删除
    if (error.response && error.response.status === 404) {
      console.warn('批量删除API不支持，尝试逐个删除')
      return Promise.all(mappingIds.map(id => deletePersonDeviceMapping(id)))
    }
    throw error
  })
}

// ==================== 数据清理功能 ====================

// 清理旧的停用映射关系（如果后端不支持，则提示用户）
export function cleanupInactiveMappings(daysOld = 30) {
  return request({
    url: '/api/person-device-mappings/cleanup',
    method: 'delete',
    params: { daysOld }
  }).catch(error => {
    console.warn('清理映射API不支持:', error)
    throw new Error('清理映射功能暂未实现，请联系开发人员')
  })
}

// ==================== 兼容性别名（保持向后兼容） ====================

// 为了保持向后兼容，保留一些旧的函数名作为别名
export const getMappingsByPersonId = getAllMappingsByPersonId
