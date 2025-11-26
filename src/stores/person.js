import { defineStore } from 'pinia'
import {
  getPersons,
  createPerson,
  updatePerson,
  deletePerson,
  getDepartments,
  searchPersonsByName
} from '@/api/person'
import { ElMessage } from 'element-plus'

export const usePersonStore = defineStore('person', {
  state: () => ({
    personList: [],
    departments: [],
    loading: false,
    error: null,
    currentPerson: null,
    searchResults: []
  }),

  getters: {
    // 按部门分组的人员
    personsByDepartment: (state) => {
      const grouped = {}
      state.personList.forEach(person => {
        const dept = person.department || '未分配'
        if (!grouped[dept]) {
          grouped[dept] = []
        }
        grouped[dept].push(person)
      })
      return grouped
    },

    // 获取人员总数
    totalPersons: (state) => state.personList.length,

    // 按性别统计
    genderStats: (state) => {
      const stats = { 男: 0, 女: 0 }
      state.personList.forEach(person => {
        if (stats.hasOwnProperty(person.gender)) {
          stats[person.gender]++
        }
      })
      return stats
    }
  },

  actions: {
    // 获取人员列表
    async fetchPersons(params = {}) {
      this.loading = true
      this.error = null
      
      try {
        const response = await getPersons(params)
        const persons = response.data?.content || response.data || []
        this.personList = persons
        return response
      } catch (error) {
        console.error('获取人员列表失败:', error)
        this.error = error.message
        ElMessage.error('获取人员列表失败：' + (error.message || '未知错误'))
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取部门列表
    async fetchDepartments() {
      try {
        const response = await getDepartments()
        const departments = response.data || []
        this.departments = departments
        return departments
      } catch (error) {
        console.error('获取部门列表失败:', error)
        this.error = error.message
        throw error
      }
    },

    // 创建人员
    async createPerson(personData) {
      try {
        const response = await createPerson(personData)
        const newPerson = response.data
        this.personList.push(newPerson)
        ElMessage.success('创建人员成功')
        return newPerson
      } catch (error) {
        console.error('创建人员失败:', error)
        ElMessage.error('创建人员失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 更新人员
    async updatePerson({ personId, data }) {
      try {
        const response = await updatePerson(personId, data)
        const updatedPerson = response.data
        
        const index = this.personList.findIndex(p => p.personId === updatedPerson.personId)
        if (index !== -1) {
          this.personList[index] = updatedPerson
        }
        
        ElMessage.success('更新人员成功')
        return updatedPerson
      } catch (error) {
        console.error('更新人员失败:', error)
        ElMessage.error('更新人员失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 删除人员
    async deletePerson(personId) {
      try {
        await deletePerson(personId)
        this.personList = this.personList.filter(p => p.personId !== personId)
        ElMessage.success('删除人员成功')
      } catch (error) {
        console.error('删除人员失败:', error)
        ElMessage.error('删除人员失败：' + (error.message || '未知错误'))
        throw error
      }
    },

    // 搜索人员
    async searchPersons(searchQuery) {
      try {
        const response = await searchPersonsByName(searchQuery)
        const results = response.data || []
        this.searchResults = results
        return results
      } catch (error) {
        console.error('搜索人员失败:', error)
        this.error = error.message
        throw error
      }
    },

    // 设置当前人员
    setCurrentPerson(person) {
      this.currentPerson = person
    },

    // 清除搜索结果
    clearSearchResults() {
      this.searchResults = []
    }
  }
})
