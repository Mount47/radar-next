// API 基础配置
export const API_CONFIG = {
  // API 基础地址
  BASE_URL: import.meta.env.VITE_APP_BASE_API || 'http://localhost:8080',

  // API 端点
  ENDPOINTS: {
    // 雷达设备相关
    DEVICES: '/api/radar/devices',
    
    // 人员管理相关
    PERSONS: '/api/persons',

    // 人员设备映射关系
    PERSON_DEVICE_MAPPINGS: '/api/person-device-mappings'
  },

  // WebSocket配置
  WS: {
    // WebSocket基础地址
    BASE_URL: 'ws://' + (import.meta.env.VITE_APP_SERVER_IP || 'localhost') + ':' + (import.meta.env.VITE_APP_SERVER_PORT || '8080'),

    // WebSocket端点 (基于 docs/websocket接口.md)
    ENDPOINTS: {
      // R60ABD1 呼吸心跳数据 (实时)
      R60ABD1: '/ws/r60abd1',

      // TI6843 呼吸心跳数据 (实时)
      TI6843_VITAL: '/ws/ti6843-vital',

      // TI6843 人体位姿数据 (实时)
      TI6843_POSTURE: '/ws/ti6843-posture',

      // 跌倒警报 (实时)
      FALL_ALERT: '/ws/fall-alert',

      // 生命体征异常警报 (实时)
      VITALS_ALERT: '/ws/vitals-alert',

      // 设备状态通知
      DEVICE_STATUS: '/ws/device-status'
    }
  },

  // R60ABD1专用API配置
  R60ABD1: {
    // 基础路径
    BASE_PATH: '/api/r60abd1',
    
    // WebSocket端点
    WS_ENDPOINT: '/ws/r60abd1',
    
    // API端点
    ENDPOINTS: {
      // 数据相关
      DATA_UPLOAD: '/api/r60abd1/data/data',
      REALTIME_BY_DEVICE: '/api/r60abd1/data/realtime',
      REALTIME_BY_PERSON: '/api/r60abd1/data/person',
      HISTORICAL_DATA: '/api/r60abd1/data/historical',
      
      // 设备管理
      DEVICES: '/api/r60abd1/devices',
      
      // 人员设备绑定
      MAPPINGS: '/api/person-device-mappings'
    }
  },

  // TI6843专用API配置 - 基于TI6843_Posture_API_Documentation.md
  TI6843: {
    // 基础路径
    BASE_PATH: '/api/ti6843/posture',
    
    // WebSocket端点
    WS_ENDPOINT: '/ws/ti6843-posture',
    
    // API端点
    ENDPOINTS: {
      // 位姿数据处理相关 (/api/ti6843/posture/data)
      DATA_UPLOAD: '/api/ti6843/posture/data/data',
      REALTIME_BY_DEVICE: '/api/ti6843/posture/data/realtime',
      REALTIME_BY_PERSON: '/api/ti6843/posture/data/person',
      DEVICE_DATA: '/api/ti6843/posture/data/data/device',
      TIME_RANGE_DATA: '/api/ti6843/posture/data/data/timerange',
      
      // 设备管理相关 (/api/ti6843/posture)
      DEVICES: '/api/ti6843/posture/devices',
      DEVICE_HEALTH: '/api/ti6843/posture/health',
      DATA_HEALTH: '/api/ti6843/posture/data/health',
      
      // 人员设备绑定
      MAPPINGS: '/api/person-device-mapping',
      
      // 历史数据（兼容旧接口）
      POSTURE_HISTORICAL: '/api/ti6843/posture/data/data/timerange',
      POSTURE_HISTORICAL_SUMMARY: '/api/ti6843/posture/data/data/timerange'
    }
  }
}

// 构建WebSocket URL
export function getWsUrl(endpoint, params = {}) {
  let url = API_CONFIG.WS.BASE_URL + endpoint

  // 替换URL中的参数，例如 :deviceId
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key])
  })

  return url
}
