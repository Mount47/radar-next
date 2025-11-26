import request from '@/utils/request'

// 获取汇总统计信息
export function getStatistics() {
  return request({
    url: '/api/v1/statistics',
    method: 'get'
  })
}
