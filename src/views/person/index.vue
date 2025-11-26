<template>
  <div class="person-container">
    <pre>{{ persons }}</pre>
  </div>
</template>

<script>
import {
  getPersons,
  createPerson,
  updatePerson,
  deletePerson as deletePersonAPI,
  getDepartments,
  batchDeletePersons
} from '@/api/person'

export default {
  name: 'PersonManagement',
  data() {
    return {
      // 搜索和过滤
      searchQuery: '',
      departmentFilter: '',
      genderFilter: '',

      // 表格数据
      persons: [],
      filteredPersons: [],
      selectedPersons: [],
      loading: false,

      // 分页
      currentPage: 1,
      pageSize: 20,
      totalPersons: 0,

      // 对话框
      dialogVisible: false,
      detailDialogVisible: false,
      importDialogVisible: false,
      isEdit: false,

      // 当前操作的人员
      currentPerson: this.getEmptyPerson(),
      selectedPerson: null,

      // 部门列表
      departments: [],

      // 文件上传
      fileList: [],

      // 表单验证规则
      formRules: {
        personId: [
          { required: true, message: '请输入工号', trigger: 'blur' },
          { min: 3, max: 20, message: '工号长度在 3 到 20 个字符', trigger: 'blur' }
        ],
        personName: [
          { required: true, message: '请输入姓名', trigger: 'blur' },
          { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
        ],
        gender: [
          { required: true, message: '请选择性别', trigger: 'change' }
        ],
        age: [
          { required: true, message: '请输入年龄', trigger: 'blur' },
          { type: 'number', min: 1, max: 120, message: '年龄必须在 1 到 120 之间', trigger: 'blur' }
        ]
        // 部门不是必填项，不需要验证规则
      }
    }
  },

  computed: {
    dialogTitle() {
      return this.isEdit ? '编辑人员' : '新增人员'
    }
  },

  mounted() {
    this.fetchPersons()
    this.fetchDepartments()
  },

  methods: {
    // 获取空的人员对象
    getEmptyPerson() {
      return {
        personId: '',
        personName: '',
        gender: '',
        age: null,
        department: ''
      }
    },

    // 获取人员列表
    async fetchPersons() {
      this.loading = true
      try {
        const response = await getPersons({
          page: this.currentPage - 1,
          size: this.pageSize
        })

        console.log('API响应:', response)
        console.log('响应数据:', response.data)

        if (response.data) {
          this.persons = response.data.content || response.data
          this.totalPersons = response.data.totalElements || this.persons.length
          console.log('设置的人员列表:', this.persons)
          console.log('总人数:', this.totalPersons)
          this.applyFilters()
        } else {
          console.log('响应中没有data字段')
          this.persons = []
          this.totalPersons = 0
        }
      } catch (error) {
        console.error('获取人员列表失败:', error)
        // this.$message.error('获取人员列表失败')
      } finally {
        this.loading = false
      }
    },

    // 获取部门列表
    async fetchDepartments() {
      try {
        const response = await getDepartments()
        this.departments = response.data || []
      } catch (error) {
        console.error('获取部门列表失败:', error)
      }
    },

    // 应用过滤条件
    applyFilters() {
      let filtered = [...this.persons]

      // 搜索过滤
      if (this.searchQuery) {
        filtered = filtered.filter(person =>
          person.personName.includes(this.searchQuery) ||
          person.personId.includes(this.searchQuery)
        )
      }

      // 部门过滤
      if (this.departmentFilter) {
        filtered = filtered.filter(person => person.department === this.departmentFilter)
      }

      // 性别过滤
      if (this.genderFilter) {
        filtered = filtered.filter(person => person.gender === this.genderFilter)
      }

      this.filteredPersons = filtered
    },

    // 搜索处理
    handleSearch() {
      this.applyFilters()
    },

    // 过滤处理
    handleFilter() {
      this.applyFilters()
    },

    // 分页处理
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchPersons()
    },

    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchPersons()
    },

    // 选择变化
    handleSelectionChange(val) {
      this.selectedPersons = val
    },

    // 显示新增对话框
    showAddDialog() {
      this.isEdit = false
      this.currentPerson = this.getEmptyPerson()
      this.dialogVisible = true
    },

    // 编辑人员
    editPerson(person) {
      this.isEdit = true
      this.currentPerson = { ...person }
      this.dialogVisible = true
    },

    // 保存人员
    async savePerson() {
      try {
        await this.$refs.personForm.validate()

        if (this.isEdit) {
          await updatePerson(this.currentPerson.personId, this.currentPerson)
          // this.$message.success('更新人员信息成功')
        } else {
          await createPerson(this.currentPerson)
          // this.$message.success('新增人员成功')
        }

        this.dialogVisible = false
        this.fetchPersons()
      } catch (error) {
        if (error !== false) { // 不是表单验证错误
          console.error('保存人员失败:', error)
          // this.$message.error('保存人员失败')
        }
      }
    },

    // 查看人员的设备映射
    viewMappings(person) {
      this.$router.push({
        path: '/mappings',
        query: {
          personId: person.personId,
          personName: person.personName
        }
      })
      // this.$message.info(`正在查看 ${person.personName} 的设备映射关系`)
    },

    // 删除人员
    deletePerson(person) {
      // this.$confirm(`确定要删除人员 ${person.personName} 吗？`, '提示', {
      //   confirmButtonText: '确定',
      //   cancelButtonText: '取消',
      //   type: 'warning'
      // }).then(async() => {
        // try {
        //   const result = await deletePersonAPI(person.personId)
        //   console.log('删除人员结果:', result)

        //   this.$message.success('删除成功')
        //   // 刷新数据
        //   await this.fetchPersons()
        // } catch (error) {
        //   console.error('删除人员失败:', error)
        //   // 提供更详细的错误信息
        //   const errorMessage = error.message || '删除人员失败'
        //   this.$message.error(errorMessage)
        // }
      // }).catch(() => {
      //   // 用户取消删除操作
      //   console.log('用户取消删除操作')
      // })
    },

    // 批量删除
    batchDelete() {
      if (this.selectedPersons.length === 0) {
        // this.$message.warning('请选择要删除的人员')
        return
      }

      // this.$confirm(`确定要删除选中的 ${this.selectedPersons.length} 个人员吗？`, '提示', {
      //   confirmButtonText: '确定',
      //   cancelButtonText: '取消',
      //   type: 'warning'
      // }).then(async() => {
        // try {
        //   const personIds = this.selectedPersons.map(p => p.personId)
        //   await batchDeletePersons(personIds)
        //   this.$message.success('批量删除成功')
        //   this.fetchPersons()
        // } catch (error) {
        //   console.error('批量删除失败:', error)
        //   this.$message.error('批量删除失败')
        // }
      // })
    },

    // 显示详情
    showDetails(person) {
      this.selectedPerson = person
      this.detailDialogVisible = true
    },

    // 刷新数据
    refreshData() {
      this.fetchPersons()
      // this.$message.success('数据已刷新')
    },

    // 导出数据
    async exportPersons() {
      try {
        // 由于后端暂无导出API，使用前端实现
        // this.$message.info('正在准备导出数据...')

        // 获取当前筛选的数据
        const dataToExport = this.filteredPersons
        if (dataToExport.length === 0) {
          // this.$message.warning('没有数据可以导出')
          return
        }

        // 简单的CSV导出实现
        const headers = ['工号', '姓名', '性别', '年龄', '部门', '创建时间']
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(person => [
            person.personId || '',
            person.personName || '',
            person.gender || '',
            person.age || '',
            person.department || '',
            person.createdAt ? new Date(person.createdAt).toLocaleString('zh-CN') : ''
          ].join(','))
        ].join('\n')

        // 创建下载链接
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `人员信息_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        // this.$message.success('导出成功')
      } catch (error) {
        console.error('导出失败:', error)
        // this.$message.error('导出失败: ' + error.message)
      }
    },

    // 显示导入对话框
    showImportDialog() {
      this.importDialogVisible = true
      this.fileList = []
    },

    // 文件变化处理
    handleFileChange(_, fileList) {
      this.fileList = fileList
    },

    // 处理导入
    async handleImport() {
      if (this.fileList.length === 0) {
        // this.$message.warning('请选择要导入的文件')
        return
      }

      try {
        // 由于后端暂无导入API，提示用户手动添加
        // this.$message.warning('批量导入功能暂未实现，请使用"新增人员"功能逐个添加')
        this.importDialogVisible = false
      } catch (error) {
        console.error('导入失败:', error)
        // this.$message.error('导入失败: ' + error.message)
      }
    },

    // 重置表单
    resetForm() {
      if (this.$refs.personForm) {
        this.$refs.personForm.resetFields()
      }
      this.currentPerson = this.getEmptyPerson()
    },

    // 格式化日期
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
</style>
