/**
 * 映射关系数据验证工具
 * 用于验证人员设备映射数据的完整性和有效性
 */

/**
 * 验证单个映射关系数据
 * @param {Object} mapping - 映射关系对象
 * @returns {Object} 验证结果
 */
export function validateSingleMapping(mapping) {
  const errors = []

  // 检查必需字段
  if (!mapping.personId || mapping.personId.trim() === '') {
    errors.push('人员ID不能为空')
  }

  if (!mapping.deviceId || mapping.deviceId.trim() === '') {
    errors.push('设备ID不能为空')
  }

  // 检查数据格式
  if (mapping.personId && typeof mapping.personId !== 'string') {
    errors.push('人员ID必须是字符串格式')
  }

  if (mapping.deviceId && typeof mapping.deviceId !== 'string') {
    errors.push('设备ID必须是字符串格式')
  }

  // 检查映射名称
  if (mapping.mappingName && mapping.mappingName.trim().length > 100) {
    errors.push('映射名称不能超过100个字符')
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    mapping: mapping
  }
}

/**
 * 验证批量映射关系数据
 * @param {Array} mappings - 映射关系数组
 * @returns {Object} 验证结果
 */
export function validateBatchMappings(mappings) {
  if (!Array.isArray(mappings)) {
    return {
      isValid: false,
      message: '映射数据必须是数组格式',
      validMappings: [],
      invalidMappings: []
    }
  }

  if (mappings.length === 0) {
    return {
      isValid: false,
      message: '映射数据不能为空',
      validMappings: [],
      invalidMappings: []
    }
  }

  const validMappings = []
  const invalidMappings = []

  mappings.forEach((mapping, index) => {
    const validation = validateSingleMapping(mapping)
    if (validation.isValid) {
      validMappings.push(mapping)
    } else {
      invalidMappings.push({
        index: index,
        mapping: mapping,
        errors: validation.errors
      })
    }
  })

  return {
    isValid: invalidMappings.length === 0,
    message: invalidMappings.length > 0 
      ? `存在 ${invalidMappings.length} 个无效的映射关系，请检查数据完整性`
      : '所有映射关系数据验证通过',
    validMappings: validMappings,
    invalidMappings: invalidMappings,
    totalCount: mappings.length,
    validCount: validMappings.length,
    invalidCount: invalidMappings.length
  }
}

/**
 * 检查映射关系重复
 * @param {Array} mappings - 映射关系数组
 * @returns {Object} 重复检查结果
 */
export function checkDuplicateMappings(mappings) {
  const seen = new Set()
  const duplicates = []

  mappings.forEach((mapping, index) => {
    const key = `${mapping.personId}-${mapping.deviceId}`
    if (seen.has(key)) {
      duplicates.push({
        index: index,
        mapping: mapping,
        key: key
      })
    } else {
      seen.add(key)
    }
  })

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates,
    message: duplicates.length > 0 
      ? `发现 ${duplicates.length} 个重复的映射关系`
      : '没有发现重复的映射关系'
  }
}

/**
 * 格式化映射数据以符合后端API要求
 * @param {Array} mappings - 原始映射数据
 * @returns {Array} 格式化后的映射数据
 */
export function formatMappingsForAPI(mappings) {
  return mappings.map(mapping => ({
    personId: mapping.personId?.trim(),
    deviceId: mapping.deviceId?.trim(),
    mappingName: mapping.mappingName?.trim() || `${mapping.personId}-${mapping.deviceId}`,
    isActive: mapping.isActive !== false // 默认为true
  }))
}

/**
 * 完整的映射数据验证和格式化
 * @param {Array} mappings - 原始映射数据
 * @returns {Object} 完整的验证和格式化结果
 */
export function validateAndFormatMappings(mappings) {
  // 基础验证
  const validation = validateBatchMappings(mappings)
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.message,
      data: null,
      details: validation
    }
  }

  // 重复检查
  const duplicateCheck = checkDuplicateMappings(validation.validMappings)
  if (duplicateCheck.hasDuplicates) {
    return {
      success: false,
      message: duplicateCheck.message,
      data: null,
      details: {
        validation: validation,
        duplicateCheck: duplicateCheck
      }
    }
  }

  // 格式化数据
  const formattedMappings = formatMappingsForAPI(validation.validMappings)

  return {
    success: true,
    message: `成功验证并格式化 ${formattedMappings.length} 个映射关系`,
    data: formattedMappings,
    details: {
      validation: validation,
      duplicateCheck: duplicateCheck
    }
  }
}
