import request from '@/utils/request'
import { mapPersonsFromBackend, mapPersonFromBackend, mapPersonToBackend } from '@/utils/dataMapping'

// 获取所有人员
export function getPersons(params = {}) {
  return request({
    url: '/api/persons',
    method: 'get',
    params
  }).then(response => {
    console.log('=== API调试信息 ===')
    console.log('原始响应:', response)

    // 转换数据格式
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        console.log('数据是数组格式，转换前:', response.data)
        response.data = mapPersonsFromBackend(response.data)
        console.log('数组格式转换后:', response.data)
      } else if (response.data.content && Array.isArray(response.data.content)) {
        console.log('数据是分页格式，转换前:', response.data.content)
        response.data.content = mapPersonsFromBackend(response.data.content)
        console.log('分页格式转换后:', response.data.content)
      } else {
        console.log('数据格式未知:', response.data)
      }
    }

    console.log('返回的响应:', response)
    return response
  })
}

// 根据ID获取单个人员
export function getPerson(personId) {
  return request({
    url: `/api/persons/${personId}`,
    method: 'get'
  }).then(response => {
    if (response.data) {
      response.data = mapPersonFromBackend(response.data)
    }
    return response
  })
}

// 创建人员
export function createPerson(data) {
  return request({
    url: '/api/persons',
    method: 'post',
    data: mapPersonToBackend(data)
  })
}

// 更新人员信息
export function updatePerson(personId, data) {
  return request({
    url: `/api/persons/${personId}`,
    method: 'put',
    data: mapPersonToBackend(data)
  })
}

// 删除人员
export function deletePerson(personId) {
  return request({
    url: `/api/persons/${personId}`,
    method: 'delete'
  })
}

// 按部门查询人员
export function getPersonsByDepartment(department) {
  return request({
    url: `/api/persons/department/${department}`,
    method: 'get'
  })
}

// 按姓名搜索人员（模糊匹配）
export function searchPersonsByName(name) {
  return request({
    url: `/api/persons/search?name=${encodeURIComponent(name)}`,
    method: 'get'
  })
}

// 以下功能暂时在前端实现，后端API不存在

// 批量删除人员（前端循环调用单个删除API）
export async function batchDeletePersons(personIds) {
  const promises = personIds.map(personId => deletePerson(personId))
  return Promise.all(promises)
}

// 获取部门列表（从现有人员数据中提取）
export async function getDepartments() {
  try {
    const response = await getPersons()
    const persons = response.data || response
    const departments = [...new Set(persons.map(person => person.department).filter(dept => dept))]
    return { data: departments }
  } catch (error) {
    console.error('获取部门列表失败:', error)
    return { data: [] }
  }
}

// 导出人员信息（前端实现）
export function exportPersons(params = {}) {
  // 这个功能需要在前端实现，将数据导出为Excel或CSV
  return new Promise((resolve, reject) => {
    // 暂时返回空实现，需要集成导出库
    reject(new Error('导出功能暂未实现，请联系开发人员'))
  })
}

// 批量导入人员（前端实现）
export function importPersons(data) {
  // 这个功能需要在前端解析文件并批量调用创建API
  return new Promise((resolve, reject) => {
    // 暂时返回空实现，需要集成文件解析库
    reject(new Error('导入功能暂未实现，请联系开发人员'))
  })
}
