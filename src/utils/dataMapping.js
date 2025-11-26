// 数据映射工具 - 处理前端和后端字段名不一致的问题

/**
 * 将后端人员数据转换为前端格式
 * @param {Object} backendPerson - 后端人员数据
 * @returns {Object} 前端人员数据格式
 */
export function mapPersonFromBackend(backendPerson) {
  if (!backendPerson) return null

  return {
    personId: backendPerson.person_id || backendPerson.personId,
    personName: backendPerson.person_name || backendPerson.personName,
    gender: backendPerson.gender,
    age: backendPerson.age,
    department: backendPerson.department,
    systemUserId: backendPerson.system_user_id || backendPerson.systemUserId,
    createdAt: backendPerson.created_at || backendPerson.createdAt,
    updatedAt: backendPerson.updated_at || backendPerson.updatedAt
  }
}

/**
 * 将前端人员数据转换为后端格式
 * @param {Object} frontendPerson - 前端人员数据
 * @returns {Object} 后端人员数据格式
 */
export function mapPersonToBackend(frontendPerson) {
  if (!frontendPerson) return null

  return {
    person_id: frontendPerson.personId,
    person_name: frontendPerson.personName,
    gender: frontendPerson.gender,
    age: frontendPerson.age,
    department: frontendPerson.department,
    system_user_id: frontendPerson.systemUserId
  }
}

/**
 * 将后端映射数据转换为前端格式
 * @param {Object} backendMapping - 后端映射数据
 * @returns {Object} 前端映射数据格式
 */
export function mapMappingFromBackend(backendMapping) {
  if (!backendMapping) return null

  return {
    id: backendMapping.id,
    personId: backendMapping.person_id || backendMapping.personId,
    deviceId: backendMapping.device_id || backendMapping.deviceId,
    mappingName: backendMapping.mapping_name || backendMapping.mappingName,
    isActive: backendMapping.is_active !== undefined ? backendMapping.is_active : backendMapping.isActive,
    createdAt: backendMapping.created_at || backendMapping.createdAt,
    updatedAt: backendMapping.updated_at || backendMapping.updatedAt
  }
}

/**
 * 将前端映射数据转换为后端格式
 * @param {Object} frontendMapping - 前端映射数据
 * @returns {Object} 后端映射数据格式
 */
export function mapMappingToBackend(frontendMapping) {
  if (!frontendMapping) return null

  const backendData = {
    person_id: frontendMapping.personId,
    device_id: frontendMapping.deviceId,
    mapping_name: frontendMapping.mappingName,
    is_active: frontendMapping.isActive
  }

  // 如果有ID字段，添加到后端数据中（用于更新操作）
  if (frontendMapping.id) {
    backendData.id = frontendMapping.id
  }

  return backendData
}

/**
 * 批量转换人员数据（后端到前端）
 * @param {Array} backendPersons - 后端人员数据数组
 * @returns {Array} 前端人员数据数组
 */
export function mapPersonsFromBackend(backendPersons) {
  if (!Array.isArray(backendPersons)) return []
  return backendPersons.map(mapPersonFromBackend)
}

/**
 * 批量转换映射数据（后端到前端）
 * @param {Array} backendMappings - 后端映射数据数组
 * @returns {Array} 前端映射数据数组
 */
export function mapMappingsFromBackend(backendMappings) {
  if (!Array.isArray(backendMappings)) return []
  return backendMappings.map(mapMappingFromBackend)
}

/**
 * 批量转换映射数据（前端到后端）
 * @param {Array} frontendMappings - 前端映射数据数组
 * @returns {Array} 后端映射数据数组
 */
export function mapMappingsToBackend(frontendMappings) {
  if (!Array.isArray(frontendMappings)) return []
  return frontendMappings.map(mapMappingToBackend)
}

/**
 * 映射错误响应格式
 * @param {Object} errorResponse - 后端错误响应
 * @returns {Object} 标准化的错误对象
 */
export function mapErrorResponse(errorResponse) {
  if (!errorResponse) return null

  return {
    error: errorResponse.error || 'UNKNOWN_ERROR',
    message: errorResponse.message || '未知错误',
    timestamp: errorResponse.timestamp || new Date().toISOString()
  }
}

/**
 * 映射成功响应格式
 * @param {Object} successResponse - 后端成功响应
 * @returns {Object} 标准化的成功响应对象
 */
export function mapSuccessResponse(successResponse) {
  if (!successResponse) return null

  // 如果是映射数据，进行转换
  if (successResponse.id && (successResponse.person_id || successResponse.personId)) {
    return mapMappingFromBackend(successResponse)
  }

  // 如果是人员数据，进行转换
  if (successResponse.person_id || successResponse.personId) {
    return mapPersonFromBackend(successResponse)
  }

  // 其他情况直接返回
  return successResponse
}

/**
 * 处理分页响应数据
 * @param {Object} pageResponse - 分页响应数据
 * @param {Function} mapFunction - 数据映射函数
 * @returns {Object} 转换后的分页数据
 */
export function mapPageResponse(pageResponse, mapFunction) {
  if (!pageResponse) return null

  return {
    content: Array.isArray(pageResponse.content) ? pageResponse.content.map(mapFunction) : [],
    totalElements: pageResponse.totalElements || 0,
    totalPages: pageResponse.totalPages || 0,
    size: pageResponse.size || 0,
    number: pageResponse.number || 0,
    first: pageResponse.first || false,
    last: pageResponse.last || false,
    empty: pageResponse.empty || false
  }
}


// ==================== 设备数据映射 ====================

// 英文状态到中文的映射
export const DEVICE_STATUS_EN_TO_ZH = {
  online: '在线',
  offline: '离线',
  active: '激活',
  inactive: '停用',
  maintenance: '维护中'
}

// 中文到英文（用于需要传回后端的场景）
export const DEVICE_STATUS_ZH_TO_EN = Object.keys(DEVICE_STATUS_EN_TO_ZH).reduce((acc, en) => {
  acc[DEVICE_STATUS_EN_TO_ZH[en]] = en
  return acc
}, {})

/**
 * 将后端设备数据转换为前端格式
 * - 保留后端原始状态到 rawStatus
 * - 将 status 映射为中文，便于前端直接展示
 */
/**
 * 根据设备ID修正设备类型
 * @param {string} deviceId 设备ID
 * @param {string} originalType 原始类型
 * @returns {string} 修正后的类型
 */
function correctDeviceType(deviceId, originalType) {
  if (!deviceId) return originalType
  
  // TI6843 vital设备应该是呼吸心跳，不是心电
  if (deviceId.includes('TI6843') && deviceId.includes('VITAL')) {
    return '呼吸心跳'
  }
  
  // TI6843 posture设备应该是人体位姿
  if (deviceId.includes('TI6843') && (deviceId.includes('POSTURE') || deviceId.includes('COM'))) {
    return '人体位姿'
  }
  
  // R60ABD1系列是呼吸心跳
  if (deviceId.includes('R60ABD1')) {
    return '呼吸心跳'
  }
  
  // R77ABH1系列是人体位姿
  if (deviceId.includes('R77ABH1')) {
    return '人体位姿'
  }
  
  // 如果原始类型已经正确，则保持不变
  return originalType
}

export function mapDeviceFromBackend(backendDevice) {
  if (!backendDevice) return null
  const rawStatus = backendDevice.status || backendDevice.deviceStatus
  const statusZh = DEVICE_STATUS_EN_TO_ZH[rawStatus] || rawStatus || '未知'
  const deviceId = backendDevice.deviceId || backendDevice.device_id
  const originalType = backendDevice.type || backendDevice.deviceType
  
  return {
    deviceId: deviceId,
    deviceName: backendDevice.deviceName || backendDevice.device_name || deviceId,
    modelType: backendDevice.modelType || backendDevice.model_type,
    model: backendDevice.model,
    location: backendDevice.location || backendDevice.deviceLocation || '-',
    type: correctDeviceType(deviceId, originalType), // 使用修正后的类型
    status: statusZh,
    rawStatus: rawStatus,
    createdAt: backendDevice.createdAt || backendDevice.created_at,
    updatedAt: backendDevice.updatedAt || backendDevice.updated_at
  }
}

/**
 * 批量转换设备数据（后端到前端）
 */
export function mapDevicesFromBackend(backendDevices) {
  if (!Array.isArray(backendDevices)) return []
  return backendDevices.map(mapDeviceFromBackend)
}
