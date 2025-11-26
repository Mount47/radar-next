/**
 * 设备管理配置文件
 * 包含设备类型映射、状态映射等配置
 */

// 设备监测类型映射（modelType -> 中文显示）
export const DEVICE_MODEL_TYPE_MAP = {
  'TI6843-VITAL': '呼吸心跳',
  'TI6843-POSTURE': '姿态监测',
  'R60ABD1': '人员检测',
}

// 反向映射（中文 -> modelType）
export const DEVICE_TYPE_TO_MODEL = Object.entries(DEVICE_MODEL_TYPE_MAP)
  .reduce((acc, [key, value]) => {
    if (!acc[value]) acc[value] = key
    return acc
  }, {})

// 设备状态映射（英文 -> 中文）
export const DEVICE_STATUS_MAP = {
  'online': '在线',
  'offline': '离线',
  'maintenance': '维护中'
}

// 反向映射（中文 -> 英文）
export const DEVICE_STATUS_ZH_TO_EN = {
  '在线': 'online',
  '离线': 'offline',
  '维护中': 'maintenance'
}

// 状态标签类型映射（用于Element UI的tag组件）
export const DEVICE_STATUS_TAG_TYPE = {
  'online': 'success', // 在线：绿色
  'offline': 'info', // 离线：灰色
  'maintenance': 'warning' // 维护中：橙色
}

// 状态图标映射
export const DEVICE_STATUS_ICON = {
  'online': 'el-icon-success', // 在线：成功图标
  'offline': 'el-icon-remove', // 离线：移除图标
  'maintenance': 'el-icon-warning' // 维护中：警告图标
}

// 监测类型标签颜色映射（与设备映射页面保持一致）
export const DEVICE_TYPE_TAG_COLOR = {
  '人体位姿': 'success', // 绿色
  '姿态监测': 'success', // 绿色（兼容）
  '呼吸心跳': 'warning', // 橙色
  '人员检测': 'warning', // 橙色（兼容）
  '生命体征': 'danger', // 红色
  '心电': 'danger' // 红色
}

// 获取设备监测类型（优先从type字段获取）
export function getDeviceMonitorType(device) {
  if (!device) return '未知类型'
  
  // 优先级1: 直接使用type字段（后端已返回中文类型）
  if (device.type) {
    return device.type
  }
  
  // 优先级2: 使用modelType映射
  if (device.modelType && DEVICE_MODEL_TYPE_MAP[device.modelType]) {
    return DEVICE_MODEL_TYPE_MAP[device.modelType]
  }
  
  // 优先级3: 尝试从model字段推导
  if (device.model) {
    for (const [modelType, typeName] of Object.entries(DEVICE_MODEL_TYPE_MAP)) {
      if (device.model.includes(modelType)) {
        return typeName
      }
    }
  }
  
  return '未知类型'
}

// 获取设备状态显示文本
export function getDeviceStatusText(status) {
  return DEVICE_STATUS_MAP[status] || status || '未知'
}

// 获取设备状态标签类型
export function getDeviceStatusTagType(status) {
  return DEVICE_STATUS_TAG_TYPE[status] || 'info'
}

// 获取设备状态图标
export function getDeviceStatusIcon(status) {
  return DEVICE_STATUS_ICON[status] || 'el-icon-question'
}

// 格式化时间显示
export function formatDeviceTime(timeStr) {
  if (!timeStr) return '-'
  
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now - time
  
  // 1小时内显示"XX分钟前"
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
  }
  
  // 今天显示"今天 HH:mm"
  if (time.toDateString() === now.toDateString()) {
    return `今天 ${time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // 昨天显示"昨天 HH:mm"
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (time.toDateString() === yesterday.toDateString()) {
    return `昨天 ${time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // 标准格式：YYYY-MM-DD HH:mm:ss
  return time.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

// 获取型号显示文本（优先model，其次modelType）
export function getDeviceModelText(device) {
  return device.model || device.modelType || '-'
}

// === 监测页面依赖的工具（补齐缺失函数） ===
// 推断设备型号类型（用于监测页差异化展示）
export function getDeviceType(deviceIdOrModel) {
  const source = String(deviceIdOrModel || '').toUpperCase()
  if (!source) return ''
  if (source.includes('R60')) return 'R60ABD1'
  if (source.includes('R77')) return 'R77ABH1'
  if (source.includes('TI6843') || source.includes('TI-6843')) return 'TI6843'
  if (source.includes('ECG')) return 'ECG'
  return 'UNKNOWN'
}

// 根据设备ID/名称推断串口和波特率配置
export function getDevicePortConfig(deviceIdOrName) {
  const id = String(deviceIdOrName || '')
  const match = id.match(/COM\d+/i)
  const port = match ? match[0].toUpperCase() : 'COM3'
  const type = getDeviceType(id)
  const baudRateMap = {
    R60ABD1: '115200',
    TI6843: '921600',
    R77ABH1: '115200',
    ECG: '115200'
  }
  const baudRate = baudRateMap[type] || '115200'
  return { port, baudRate }
}
