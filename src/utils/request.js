import axios from 'axios'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getToken } from '@/utils/auth'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
  timeout: 10000 // 请求超时时间设置为10秒
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 阻止R60ABD1相关的API调用（这些应该已经被删除）
    if (config.url && (config.url.includes('/ws/r60abd1/info') || config.url.includes('/ws/r60abd1/status'))) {
      console.error('🚫 阻止不应该存在的API调用:', config.url)
      console.error('🚫 这可能是浏览器缓存问题，请清除缓存')
      return Promise.reject(new Error('此API调用已被禁用，R60ABD1只使用WebSocket'))
    }
    
    // 添加请求日志
    console.log('Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      params: config.params
    })

    // 如果有token则添加到请求头
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${getToken()}`
    }

    return config
  },
  error => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data

    // 添加响应日志
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: res
    })

    // 处理成功状态码：200, 201, 204等
    if (response.status >= 200 && response.status < 300) {
      // 204 No Content 通常用于删除操作，没有响应体
      if (response.status === 204) {
        return { data: null, success: true }
      }
      // 其他成功状态码返回数据
      return { data: res }
    }

    // 处理客户端和服务器错误状态码
    const errorMessage = res?.message || `请求失败 (${response.status})`

    // 401: 未登录或token过期
    if (response.status === 401) {
      ElMessageBox.confirm(
        '您已登出，请重新登录',
        '确认登出',
        {
          confirmButtonText: '重新登录',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        const userStore = useUserStore()
        userStore.resetToken().then(() => {
          location.reload()
        })
      })
      return Promise.reject(new Error('未授权'))
    }

    // 其他错误状态码显示错误消息
    ElMessage({
      message: errorMessage,
      type: 'error',
      duration: 5 * 1000
    })

    return Promise.reject(new Error(errorMessage))
  },
  error => {
    console.error('Response Error:', error)

    // 处理网络错误
    let message = '请求失败'
    if (error.response) {
      // 记录详细错误信息
      console.error('Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        data: error.response.data
      })
      switch (error.response.status) {
        case 400:
          message = '请求错误 (400): ' + ((error.response.data && error.response.data.message) || '参数有误')
          break
        case 401:
          message = '未授权，请登录 (401)'
          break
        case 403:
          message = '拒绝访问 (403)'
          break
        case 404:
          message = '请求地址不存在 (404): ' + error.config.url
          break
        case 408:
          message = '请求超时 (408)'
          break
        case 500:
          message = '服务器内部错误 (500): ' + ((error.response.data && error.response.data.message) || '')
          break
        case 501:
          message = '服务未实现 (501)'
          break
        case 502:
          message = '网关错误 (502)'
          break
        case 503:
          message = '服务不可用 (503)'
          break
        case 504:
          message = '网关超时 (504)'
          break
        case 505:
          message = 'HTTP版本不受支持 (505)'
          break
        default:
          message = `连接错误 (${error.response.status})`
      }
    } else if (error.request) {
      console.error('No Response:', error.request)
      message = '无法连接到服务器，请检查网络连接'
    } else {
      message = error.message
    }

    ElMessage({
      message: message,
      type: 'error',
      duration: 5 * 1000
    })

    return Promise.reject(error)
  }
)

export default service
