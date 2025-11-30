<template>
  <div class="person-page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">人员信息</p>
        <!-- <h1>人员管理与画像</h1>
        <p class="subtitle">结合检索、分组与实时概览，快速掌握当前人员的活跃度、性别与年龄分布。</p> -->
        <div class="chips">
          <span class="chip">总人数：{{ totalPersons }}</span>
          <span class="chip">本页展示：{{ filteredPersons.length }}</span>
          <span class="chip">男/女：{{ genderStats.male }} / {{ genderStats.female }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button type="primary" class="cta" @click="showAddDialog">新增人员</el-button>
        <el-button @click="refreshData">刷新</el-button>
      </div>
    </div>

    <div class="toolbar">
      <el-input v-model="searchQuery" placeholder="搜索姓名或工号" clearable :prefix-icon="SearchIcon" @input="handleSearch" />
      <el-select v-model="departmentFilter" placeholder="部门" clearable @change="handleFilter">
        <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
      </el-select>
      <el-select v-model="genderFilter" placeholder="性别" clearable @change="handleFilter">
        <el-option label="男" value="Male" />
        <el-option label="女" value="Female" />
        <el-option label="其他" value="Other" />
      </el-select>
      <div class="spacer" />
      <el-button type="primary" link @click="showImportDialog">导入</el-button>
      <el-button type="primary" link @click="exportPersons">导出</el-button>
      <el-button type="danger" link :disabled="!selectedPersons.length" @click="batchDelete">批量删除</el-button>
    </div>

    <div class="analytics-grid">
      <div class="card wide" ref="statusChart" />
      <div class="card" ref="genderChart" />
      <div class="card" ref="ageChart" />
      <div class="card full" ref="newUserChart" />
    </div>

    <div class="content-grid">
      <div class="card list-card">
        <div class="card-header">
          <div>
            <h3>用户列表</h3>
          </div>
          <el-button size="small" @click="refreshData">刷新数据</el-button>
        </div>
        <el-table v-loading="loading" :data="pagedPersons" stripe border style="width: 100%"
          @selection-change="handleSelectionChange"
          @row-click="setActivePerson">
          <el-table-column type="selection" width="45" />
          <el-table-column prop="personId" label="工号" width="110" />
          <el-table-column prop="personName" label="姓名" width="140" />
          <el-table-column prop="gender" label="性别" width="90">
            <template #default="{ row }">
              <el-tag :type="row.gender === 'Male' ? 'info' : row.gender === 'Female' ? 'success' : 'warning'"
                effect="light">
                {{ row.gender || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="age" label="年龄" width="90" />
          <el-table-column prop="department" label="部门" />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="showDetails(row)">详情</el-button>
              <el-button type="primary" link size="small" @click="editPerson(row)">编辑</el-button>
              <el-button type="primary" link size="small" @click="viewMappings(row)">绑定</el-button>
              <el-button type="danger" link size="small" @click="deletePerson(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="table-footer">
          <el-pagination background layout="prev, pager, next, sizes, total" :current-page="currentPage"
            :page-size="pageSize" :total="filteredPersons.length" :page-sizes="[10, 20, 50, 100]"
            @current-change="handleCurrentChange" @size-change="handleSizeChange" />
        </div>
      </div>

      <div class="side-panel card">
        <div class="card-header">
          <div>
            <h3>人员画像</h3>
            <p class="muted">选择列表中的人员查看详情</p>
          </div>
        </div>
        <div v-if="selectedPerson" class="profile">
          <div class="avatar-box">{{ selectedPerson.personName?.[0] || 'U' }}</div>
          <div class="profile-meta">
            <h4>{{ selectedPerson.personName }}</h4>
            <p>{{ selectedPerson.gender || '未知' }} · {{ selectedPerson.age ? selectedPerson.age + '岁' : '年龄未填' }}</p>
            <p class="muted">{{ selectedPerson.department || '未分配部门' }}</p>
          </div>
          <div class="detail-grid">
            <div>
              <p class="label">工号</p>
              <p class="value">{{ selectedPerson.personId }}</p>
            </div>
            <div>
              <p class="label">创建时间</p>
              <p class="value">{{ formatDate(selectedPerson.createdAt) || '暂无' }}</p>
            </div>
            <!-- <div>
              <p class="label">备注</p>
              <p class="value">关联设备、标签和最近动态可在绑定与实时监测中查看。</p>
            </div> -->
          </div>
        </div>
        <div v-else class="empty-profile">
          <p class="muted">请选择左侧列表中的人员查看画像与时间线。</p>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" @close="resetForm">
      <el-form ref="personForm" :model="currentPerson" :rules="formRules" label-width="80px">
        <el-form-item label="工号" prop="personId">
          <el-input v-model="currentPerson.personId" placeholder="请输入工号" />
        </el-form-item>
        <el-form-item label="姓名" prop="personName">
          <el-input v-model="currentPerson.personName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="currentPerson.gender" placeholder="请选择性别">
            <el-option label="男" value="Male" />
            <el-option label="女" value="Female" />
            <el-option label="其他" value="Other" />
          </el-select>
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="currentPerson.age" :min="1" :max="120" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="currentPerson.department" placeholder="请选择部门" clearable>
            <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePerson">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="导入人员" width="480px">
      <p class="muted">当前暂未接入后端导入接口，可在此处上传文件并由后台处理。</p>
      <el-upload drag action="#" :auto-upload="false" :file-list="fileList" @change="handleFileChange">
        <i class="el-icon-upload" />
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport">确认导入</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailDialogVisible" title="人员详情" size="420px">
      <div v-if="selectedPerson" class="drawer-body">
        <h4>{{ selectedPerson.personName }}</h4>
        <p>工号：{{ selectedPerson.personId }}</p>
        <p>性别：{{ selectedPerson.gender || '未知' }}</p>
        <p>年龄：{{ selectedPerson.age || '未填写' }}</p>
        <p>部门：{{ selectedPerson.department || '未分配' }}</p>
        <p>创建时间：{{ formatDate(selectedPerson.createdAt) || '暂无' }}</p>
      </div>
      <div v-else class="muted">暂无人员信息</div>
    </el-drawer>
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
} from '@/api/persons/person'
import * as echarts from 'echarts'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'PersonManagement',
  components: {},
  data() {
    return {
      SearchIcon: Search,
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

      // 图表实例
      charts: {
        status: null,
        gender: null,
        age: null,
        newUser: null
      },

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
      }
    }
  },

  computed: {
    dialogTitle() {
      return this.isEdit ? '编辑人员' : '新增人员'
    },

    pagedPersons() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = this.currentPage * this.pageSize
      return this.filteredPersons.slice(start, end)
    },

    genderStats() {
      const stats = { male: 0, female: 0, other: 0 }
      this.filteredPersons.forEach(person => {
        const g = (person.gender || '').toLowerCase()
        if (g === 'male' || g === '男') stats.male += 1
        else if (g === 'female' || g === '女') stats.female += 1
        else stats.other += 1
      })
      return stats
    },

    statusStats() {
      const stats = { active: 0, inactive: 0, unknown: 0 }
      this.filteredPersons.forEach(person => {
        const status = (person.status || person.state || '').toLowerCase()
        if (status.includes('active') || status.includes('online')) stats.active += 1
        else if (status.includes('inactive') || status.includes('offline')) stats.inactive += 1
        else stats.unknown += 1
      })
      if (stats.active === 0 && stats.inactive === 0 && stats.unknown === 0) {
        stats.active = this.filteredPersons.length
      }
      return stats
    },

    ageBuckets() {
      const buckets = [
        { label: '0-17', min: 0, max: 17, value: 0 },
        { label: '18-30', min: 18, max: 30, value: 0 },
        { label: '31-45', min: 31, max: 45, value: 0 },
        { label: '46-60', min: 46, max: 60, value: 0 },
        { label: '60+', min: 61, max: Infinity, value: 0 }
      ]
      this.filteredPersons.forEach(person => {
        if (person.age == null) return
        const bucket = buckets.find(b => person.age >= b.min && person.age <= b.max)
        if (bucket) bucket.value += 1
      })
      return buckets
    },

    newUserTrend() {
      const days = 7
      const labels = []
      const data = []
      for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const label = `${date.getMonth() + 1}/${date.getDate()}`
        labels.push(label)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        const count = this.filteredPersons.filter(person => {
          if (!person.createdAt) return false
          const created = new Date(person.createdAt)
          return created >= dayStart && created <= dayEnd
        }).length
        data.push(count)
      }
      return { labels, data }
    }
  },

  watch: {
    filteredPersons: {
      handler() {
        this.$nextTick(() => this.updateCharts())
      },
      deep: true
    }
  },

  mounted() {
    this.fetchPersons()
    this.fetchDepartments()
    this.$nextTick(() => {
      this.initCharts()
      window.addEventListener('resize', this.handleResize)
    })
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    Object.values(this.charts).forEach(instance => {
      instance?.dispose()
    })
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

    // 图表初始化与更新
    initCharts() {
      if (this.$refs.statusChart) this.charts.status = echarts.init(this.$refs.statusChart)
      if (this.$refs.genderChart) this.charts.gender = echarts.init(this.$refs.genderChart)
      if (this.$refs.ageChart) this.charts.age = echarts.init(this.$refs.ageChart)
      if (this.$refs.newUserChart) this.charts.newUser = echarts.init(this.$refs.newUserChart)
      this.updateCharts()
    },

    handleResize() {
      Object.values(this.charts).forEach(instance => instance?.resize())
    },

    updateCharts() {
      if (this.charts.status) {
        this.charts.status.setOption({
          title: { text: '在线状态', left: 'center', textStyle: { fontSize: 14, color: '#4b5563' } },
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '55%'],
              itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
              data: [
                { value: this.statusStats.active, name: '在线' },
                { value: this.statusStats.inactive, name: '离线' },
                { value: this.statusStats.unknown, name: '未知' }
              ],
              label: { formatter: '{b}: {d}%' }
            }
          ]
        })
      }

      if (this.charts.gender) {
        this.charts.gender.setOption({
          title: { text: '性别分布', left: 'center', textStyle: { fontSize: 14, color: '#4b5563' } },
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'pie',
              radius: '70%',
              center: ['50%', '55%'],
              data: [
                { value: this.genderStats.male, name: '男性' },
                { value: this.genderStats.female, name: '女性' },
                // { value: this.genderStats.other, name: '其他' }
              ],
              label: { formatter: '{b}: {c}' }
            }
          ]
        })
      }

      if (this.charts.age) {
        this.charts.age.setOption({
          title: { text: '年龄分布', left: 'center', textStyle: { fontSize: 14, color: '#4b5563' } },
          tooltip: {},
          xAxis: { type: 'category', data: this.ageBuckets.map(b => b.label), axisTick: { show: false } },
          yAxis: { type: 'value', minInterval: 1 },
          series: [
            {
              data: this.ageBuckets.map(b => b.value),
              type: 'bar',
              itemStyle: {
                borderRadius: [10, 10, 4, 4],
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#845ef7' },
                  { offset: 1, color: '#5ee9ff' }
                ])
              },
              barWidth: '50%'
            }
          ]
        })
      }

      if (this.charts.newUser) {
        this.charts.newUser.setOption({
          title: { text: '近 7 天新增', left: 'center', textStyle: { fontSize: 14, color: '#4b5563' } },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', boundaryGap: false, data: this.newUserTrend.labels },
          yAxis: { type: 'value', minInterval: 1 },
          series: [
            {
              data: this.newUserTrend.data,
              type: 'line',
              smooth: true,
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(132, 94, 247, 0.35)' },
                  { offset: 1, color: 'rgba(94, 233, 255, 0.15)' }
                ])
              },
              lineStyle: { color: '#845ef7', width: 3 },
              symbolSize: 10
            }
          ]
        })
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

        if (response.data) {
          this.persons = response.data.content || response.data
          this.totalPersons = response.data.totalElements || this.persons.length
          this.applyFilters()
        } else {
          this.persons = []
          this.totalPersons = 0
        }
      } catch (error) {
        console.error('获取人员列表失败:', error)
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
          person.personName?.includes(this.searchQuery) ||
          person.personId?.includes(this.searchQuery)
        )
      }

      // 部门过滤
      if (this.departmentFilter) {
        filtered = filtered.filter(person => person.department === this.departmentFilter)
      }

      // 性别过滤
      if (this.genderFilter) {
        filtered = filtered.filter(person => (person.gender || '').toLowerCase() === this.genderFilter.toLowerCase())
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
      this.selectedPerson = val[0] || this.selectedPerson
    },

    setActivePerson(row) {
      this.selectedPerson = row
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
          ElMessage.success('更新人员信息成功')
        } else {
          await createPerson(this.currentPerson)
          ElMessage.success('新增人员成功')
        }

        this.dialogVisible = false
        this.fetchPersons()
      } catch (error) {
        if (error !== false) {
          console.error('保存人员失败:', error)
          ElMessage.error('保存人员失败')
        }
      }
    },

    // 查看人员的设备映射
    viewMappings(person) {
      this.selectedPerson = person
      this.$router.push({
        path: '/mapping',
        query: {
          personId: person.personId,
          personName: person.personName
        }
      })
    },

    // 删除人员
    async deletePerson(person) {
      if (!person) return
      try {
        await ElMessageBox.confirm(
          `确定删除人员 "${person.personName || person.personId}" 吗？此操作不可撤销。`,
          '删除确认',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await deletePersonAPI(person.personId)
        ElMessage.success('人员已删除')
        this.fetchPersons()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除人员失败:', error)
          ElMessage.error('删除失败，人员可能存在绑定关系')
        }
      }
    },

    // 批量删除
    async batchDelete() {
      if (!this.selectedPersons.length) {
        ElMessage.warning('请先选择人员')
        return
      }
      const personNames = this.selectedPersons.map(p => p.personName || p.personId).join('、')
      try {
        await ElMessageBox.confirm(
          `确认删除以下人员？\n${personNames}`,
          '批量删除确认',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'error'
          }
        )
        const personIds = this.selectedPersons.map(p => p.personId)
        await batchDeletePersons(personIds)
        ElMessage.success(`已删除 ${this.selectedPersons.length} 个人员`)
        this.fetchPersons()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          ElMessage.error('批量删除失败')
        }
      }
    },

    // 显示详情
    showDetails(person) {
      this.selectedPerson = person
      this.detailDialogVisible = true
    },

    // 刷新数据
    refreshData() {
      this.fetchPersons()
    },

    // 导出数据
    async exportPersons() {
      try {
        const dataToExport = this.filteredPersons
        if (dataToExport.length === 0) {
          return
        }

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

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `人员信息_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('导出失败:', error)
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
        return
      }
      this.importDialogVisible = false
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
.person-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(120deg, rgba(132, 94, 247, 0.12), rgba(94, 233, 255, 0.12));
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 18px 22px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 4px;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 6px 0 10px;
  color: #6b7280;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-weight: 600;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cta {
  box-shadow: 0 12px 24px rgba(132, 94, 247, 0.3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.toolbar .spacer {
  flex: 1;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 14px;
}

.analytics-grid .card {
  height: 220px;
}

.analytics-grid .full {
  grid-column: 1 / span 3;
  height: 220px;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  padding: 14px;
  min-height: 180px;
}

.card.wide {
  grid-column: 1 / span 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-header h3 {
  margin: 0 0 4px;
}

.muted {
  color: #6b7280;
  margin: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

.list-card {
  padding: 16px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.side-panel {
  min-height: 100%;
}

.profile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-box {
  width: 78px;
  height: 78px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.3), rgba(94, 233, 255, 0.3));
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 700;
  color: #3f3f46;
}

.profile-meta h4 {
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.detail-grid .label {
  color: #9ca3af;
  margin: 0;
  font-size: 12px;
}

.detail-grid .value {
  margin: 4px 0 0;
  font-weight: 600;
}

.empty-profile {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
}

.drawer-body p {
  margin: 4px 0;
}

@media (max-width: 1100px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .analytics-grid .full {
    grid-column: 1;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .page-hero {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-end;
  }
}
</style>
