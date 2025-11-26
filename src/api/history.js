import request from '@/utils/request'

/**
 * 获取历史数据列表 (分页)
 * @param {object} params 查询参数，包括 deviceId, start, end, page, size
 */
export function getHistoryData(params) {
  const { deviceId, ...otherParams } = params
  return request({
    url: `/api/r60abd1/data/historical`,
    method: 'get',
    params: {
      deviceId,
      ...otherParams
    }
  })
}

/**
 * 获取指定时间范围内的关键统计指标
 * @param {object} params 查询参数，包括 deviceId, start, end
 */
export function getHistoryStats(params) {
  const { deviceId, ...otherParams } = params
  return request({
    url: `/api/r60abd1/data/historical/summary`,
    method: 'get',
    params: {
      deviceId,
      ...otherParams
    }
  })
}
