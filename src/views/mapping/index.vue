<template>
  <div class="mapping-container">
    <pre>{{ mappings }}</pre>
  </div>
</template>

<script>
import {
  getPersonDeviceMappings,
  getInactivePersonDeviceMappings,
  createPersonDeviceMapping,
  updateSingleMapping,
  batchUpdatePersonDeviceMappings,
  batchSafeUpdatePersonDeviceMappings,
  swapPersons,
  deactivatePersonDeviceMapping,
  reactivatePersonDeviceMapping,
  deletePersonDeviceMapping,
  batchDeletePersonDeviceMappings,
  cleanupInactiveMappings,
  checkApiSupport,
  adaptiveApiCall
} from '@/api/person-device-mapping'
import { getPersons } from '@/api/person'
import { getDevices } from '@/api/device'
import { validateAndFormatMappings } from '@/utils/mapping-validation'

export default {
  name: 'MappingManagement',
  data() {
    return {
      // 视图模式
      viewMode: 'table', // 'table' 或 'graph'

      // API支持情况
      apiSupport: {
        basicList: false,
        singleUpdate: false,
        batchSafe: false,
        batchUpdate: false,
        inactive: false
      },

      // 过滤条件
      searchQuery: '',
      selectedPerson: '',
      deviceTypeFilter: '',
      statusFilter: '',
      showInactive: false, // 是否显示停用的映射

      // 设备类型统计信息
      deviceTypeStats: null,

      // 数据
      mappings: [],
      filteredMappings: [],
      persons: [],
      devices: [],
      selectedMappings: [],
      loading: false,

      // 分页
      currentPage: 1,
      pageSize: 20,
      totalMappings: 0,

      // 对话框
      createDialogVisible: false,
      multiBindDialogVisible: false,
      swapDialogVisible: false,
      editDialogVisible: false,
      cleanupDialogVisible: false,
      deviceSelectionDialogVisible: false,

      // 新建映射数据
      newMapping: {
        personId: '',
        deviceId: '',
        mappingName: ''
      },

      // 多设备绑定数据
      multiBindData: {
        personId: '',
        deviceIds: [],
        mappingName: ''
      },

      // 交换映射数据
      swapData: {
        mappingId1: '',
        mappingId2: ''
      },

      // 编辑映射数据
      editMapping: {
        id: null,
        personId: '',
        deviceId: '',
        mappingName: '',
        isActive: true
      },

      // 清理配置
      cleanupConfig: {
        daysOld: 30
      },

      // 设备选择数据
      deviceSelectionData: {
        personName: '',
        availableDevices: [],
        selectedDevice: null
      },

      // 表单验证规则
      createRules: {
        personId: [
          { required: true, message: '请选择人员', trigger: 'change' }
        ],
        deviceId: [
          { required: true, message: '请选择设备', trigger: 'change' }
        ],
        mappingName: [
          { required: true, message: '请输入映射名称', trigger: 'blur' }
        ]
      },

      multiBindRules: {
        personId: [
          { required: true, message: '请选择人员', trigger: 'change' }
        ],
        deviceIds: [
          { required: true, type: 'array', min: 1, message: '请至少选择一个设备', trigger: 'change' }
        ],
        mappingName: [
          { required: true, message: '请输入映射名称', trigger: 'blur' }
        ]
      },

      swapRules: {
        mappingId1: [
          { required: true, message: '请选择第一个映射关系', trigger: 'change' }
        ],
        mappingId2: [
          { required: true, message: '请选择第二个映射关系', trigger: 'change' }
        ]
      }
    }
  },

  computed: {
    // 可用设备（显示所有设备，标明绑定状态）
    availableDevices() {
      // 获取已映射的设备ID集合
      const mappedDeviceIds = new Set(this.mappings.filter(m => m.isActive).map(m => m.deviceId))
      
      return this.devices.map(device => {
        const isBound = mappedDeviceIds.has(device.deviceId)
        const boundMapping = isBound ? this.mappings.find(m => m.deviceId === device.deviceId && m.isActive) : null
        
        return {
          ...device,
          isBound,
          boundPersonId: boundMapping?.personId,
          boundPersonName: boundMapping ? this.getPersonName(boundMapping.personId) : null,
          displayName: isBound 
            ? `${device.deviceName || device.deviceId} (已绑定: ${this.getPersonName(boundMapping.personId)})`
            : `${device.deviceName || device.deviceId} (未绑定)`,
          disabled: false // 不再禁用已绑定的设备，允许重新绑定
        }
      }).sort((a, b) => {
        // 未绑定的设备排在前面
        if (a.isBound && !b.isBound) return 1
        if (!a.isBound && b.isBound) return -1
        return a.deviceId.localeCompare(b.deviceId)
      })
    },

    // 可用人员（未被映射的人员）
    availablePersons() {
      const mappedPersonIds = this.mappings.map(m => m.personId)
      return this.persons.filter(person => !mappedPersonIds.includes(person.personId))
    },

    // 激活的映射数量
    activeMappingsCount() {
      return this.mappings.filter(m => m.isActive).length
    },

    // 停用的映射数量
    inactiveMappingsCount() {
      return this.mappings.filter(m => !m.isActive).length
    },

    // 激活的映射关系（用于交换功能）
    activeMappings() {
      return this.mappings.filter(m => m.isActive)
    }
  },

  async mounted() {
    // 首先检测API支持情况
    try {
      this.apiSupport = await checkApiSupport()
      console.log('🔍 API支持检测完成:', this.apiSupport)
    } catch (error) {
      console.error('❌ API支持检测失败:', error)
    }
    
    // 然后获取数据
    this.fetchData()
  },

  methods: {

    // 获取所有数据
    async fetchData() {
      await Promise.all([
        this.fetchMappings(),
        this.fetchPersons(),
        this.fetchDevices()
      ])
    },

    // 获取映射关系列表
    async fetchMappings() {
      this.loading = true
      try {
        let response
        if (this.showInactive) {
          // 获取活跃和停用的映射（不分页，获取所有数据）
          const [activeResponse, inactiveResponse] = await Promise.all([
            getPersonDeviceMappings({
              page: 0,
              size: 1000 // 获取更多数据
            }),
            getInactivePersonDeviceMappings({
              page: 0,
              size: 1000 // 获取更多数据
            })
          ])

          const activeMappings = activeResponse.data?.content || activeResponse.data || []
          const inactiveMappings = inactiveResponse.data?.content || inactiveResponse.data || []

          console.log('获取到的活跃映射数量:', activeMappings.length)
          console.log('获取到的停用映射数量:', inactiveMappings.length)

          // 合并数据并标记状态
          const allMappings = [
            ...activeMappings.map(m => ({ ...m, isActive: true })),
            ...inactiveMappings.map(m => ({ ...m, isActive: false }))
          ]

          this.mappings = allMappings
          this.totalMappings = allMappings.length

          console.log('合并后总映射数量:', this.totalMappings)

          // 如果没有停用映射，给用户提示
          if (inactiveMappings.length === 0 && activeMappings.length > 0) {
            // this.$message.info('当前没有停用的映射关系')
          }
        } else {
          // 仅获取活跃映射
          response = await getPersonDeviceMappings({
            page: this.currentPage - 1,
            size: this.pageSize
          })

          this.mappings = response.data?.content || response.data || []
          this.totalMappings = response.data?.totalElements || this.mappings.length
        }

        this.applyFilters()
      } catch (error) {
        console.error('获取映射关系失败:', error)
        // this.$message.error('获取映射关系失败')

        // 如果获取停用映射失败，可能是接口不存在，只显示活跃映射
        if (this.showInactive) {
          console.warn('停用映射接口可能不存在，回退到仅显示活跃映射')
          this.showInactive = false
          this.fetchMappings() // 重新获取活跃映射
          return
        }
      } finally {
        this.loading = false
      }
    },

    // 获取人员列表
    async fetchPersons() {
      try {
        const response = await getPersons()
        this.persons = response.data?.content || response.data || []
      } catch (error) {
        console.error('获取人员列表失败:', error)
      }
    },

    // 获取设备列表
    async fetchDevices() {
      try {
        // 尝试使用新的API获取包含绑定状态的设备信息
        try {
          const { getDevicesForMapping } = await import('@/api/device')
          const { data } = await getDevicesForMapping()
          this.devices = data || []
          console.log('✅ 使用新API获取设备绑定状态:', this.devices)
        } catch (error) {
          console.warn('新API不可用，使用备用方案:', error)
          // 备用方案：使用原有API
          const { data } = await getDevices()
          this.devices = data || []
        }

        // 验证设备类型绑定
        this.validateDeviceTypeBinding()
      } catch (error) {
        console.error('获取设备列表失败:', error)
      }
    },

    // 验证设备类型绑定
    validateDeviceTypeBinding() {
      console.log('=== 设备类型绑定验证 ===')

      const standardTypes = ['人体位姿', '呼吸心跳', '心电']
      const deviceTypeStats = {
        standard: 0,
        mapped: 0,
        unknown: 0,
        details: []
      }

      this.devices.forEach(device => {
        const isStandard = standardTypes.includes(device.type)
        const mappedType = this.getDeviceType(device.deviceId)

        const deviceInfo = {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          originalType: device.type,
          mappedType: mappedType,
          isStandard: isStandard
        }

        if (isStandard) {
          deviceTypeStats.standard++
        } else if (mappedType !== '呼吸心跳') { // 不是默认值
          deviceTypeStats.mapped++
        } else {
          deviceTypeStats.unknown++
        }

        deviceTypeStats.details.push(deviceInfo)
      })

      console.log('设备类型统计:', deviceTypeStats)
      console.log('设备详细信息:', deviceTypeStats.details)

      // 如果有未识别的设备类型，给出提示
      if (deviceTypeStats.unknown > 0) {
        console.warn(`发现 ${deviceTypeStats.unknown} 个设备使用默认类型，建议在设备管理中设置正确的监测类型`)
      }

      // 保存统计信息供UI显示使用
      this.deviceTypeStats = deviceTypeStats
    },

    // 显示设备类型绑定状态
    showDeviceTypeStatus() {
      if (!this.deviceTypeStats) {
        // this.$message.info('正在加载设备类型信息...')
        return
      }

      const stats = this.deviceTypeStats
      const total = stats.standard + stats.mapped + stats.unknown

      let message = `设备类型绑定状态：\n\n`
      message += `总设备数：${total}\n`
      message += `标准类型：${stats.standard} 个\n`
      message += `映射类型：${stats.mapped} 个\n`
      message += `默认类型：${stats.unknown} 个\n\n`

      if (stats.unknown > 0) {
        message += `⚠️ 建议：有 ${stats.unknown} 个设备使用默认类型，建议在设备管理中设置正确的监测类型`
      } else {
        message += `✅ 所有设备类型绑定正常`
      }

      // this.$alert(message, '设备类型绑定状态', {
      //   confirmButtonText: '查看详情',
      //   callback: () => {
      //     console.log('设备类型详细信息:', stats.details)
      //     this.$message.info('详细信息已输出到控制台')
      //   }
      // })
    },

    // 应用过滤条件
    applyFilters() {
      let filtered = [...this.mappings]

      // 搜索过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(mapping => {
          const personName = this.getPersonName(mapping.personId).toLowerCase()
          const deviceId = mapping.deviceId.toLowerCase()
          const deviceName = this.getDeviceName(mapping.deviceId).toLowerCase()
          const mappingName = (mapping.mappingName || '').toLowerCase()

          return personName.includes(query) ||
                 deviceId.includes(query) ||
                 deviceName.includes(query) ||
                 mappingName.includes(query)
        })
      }

      // 人员过滤
      if (this.selectedPerson) {
        filtered = filtered.filter(mapping => mapping.personId === this.selectedPerson)
      }

      // 设备类型过滤
      if (this.deviceTypeFilter) {
        filtered = filtered.filter(mapping => {
          const deviceType = this.getDeviceType(mapping.deviceId)
          return deviceType === this.deviceTypeFilter
        })
      }

      // 状态过滤
      if (this.statusFilter) {
        if (this.statusFilter === 'active') {
          filtered = filtered.filter(mapping => mapping.isActive)
        } else if (this.statusFilter === 'inactive') {
          filtered = filtered.filter(mapping => !mapping.isActive)
        }
      }

      this.filteredMappings = filtered
    },

    // 人员选择变化
    handlePersonChange() {
      this.applyFilters()
    },

    // 快速监测选中的人员
    async quickMonitorPerson() {
      if (!this.selectedPerson) {
        // this.$message.warning('请先选择人员')
        return
      }

      try {
        // 获取该人员的活跃映射关系
        const personMappings = this.mappings.filter(m =>
          m.personId === this.selectedPerson && m.isActive
        )

        if (personMappings.length === 0) {
          // this.$message.warning('该人员没有活跃的设备映射关系')
          return
        }

        if (personMappings.length === 1) {
          // 只有一个设备，直接跳转
          this.goToMonitor(personMappings[0])
        } else {
          // 多个设备，显示选择对话框
          this.showDeviceSelectionDialog(personMappings)
        }
      } catch (error) {
        console.error('快速监测失败:', error)
        // this.$message.error('操作失败，请重试')
      }
    },

    // 显示设备选择对话框
    showDeviceSelectionDialog(mappings) {
      const person = this.persons.find(p => p.personId === this.selectedPerson)

      // 准备设备选择数据
      this.deviceSelectionData.personName = person?.personName || this.selectedPerson
      this.deviceSelectionData.availableDevices = mappings.map(mapping => {
        const device = this.devices.find(d => d.deviceId === mapping.deviceId)
        return {
          mapping,
          device,
          deviceId: mapping.deviceId,
          deviceName: device?.deviceName || mapping.deviceId,
          deviceType: this.getDeviceType(mapping.deviceId),
          mappingName: mapping.mappingName
        }
      })
      this.deviceSelectionData.selectedDevice = null

      // 显示对话框
      this.deviceSelectionDialogVisible = true
    },

    // 确认设备选择
    confirmDeviceSelection() {
      if (!this.deviceSelectionData.selectedDevice) {
        // this.$message.warning('请选择要监测的设备')
        return
      }

      const selectedDeviceData = this.deviceSelectionData.availableDevices.find(
        d => d.deviceId === this.deviceSelectionData.selectedDevice
      )

      if (selectedDeviceData) {
        this.goToMonitor(selectedDeviceData.mapping)
        this.deviceSelectionDialogVisible = false
      }
    },

    // 过滤处理
    handleFilter() {
      this.applyFilters()
    },

    // 分页处理
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchMappings()
    },

    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchMappings()
    },

    // 选择变化
    handleSelectionChange(val) {
      this.selectedMappings = val
    },

    // 切换视图模式
    toggleViewMode() {
      this.viewMode = this.viewMode === 'table' ? 'graph' : 'table'
    },

    // 显示新建对话框
    showCreateDialog() {
      this.createDialogVisible = true
    },

    // 显示多设备绑定对话框
    showMultiBindDialog() {
      this.multiBindDialogVisible = true
    },

    // 显示交换映射对话框
    showSwapDialog() {
      this.swapDialogVisible = true
    },

    // 创建映射关系
    async createMapping() {
      try {
        await this.$refs.createForm.validate()

        // 额外的数据验证
        const validation = this.validateMappingData([this.newMapping])
        if (!validation.isValid) {
          // this.$message.error(validation.message)
          return
        }

        await createPersonDeviceMapping(this.newMapping)
        // this.$message.success('创建映射关系成功')
        this.createDialogVisible = false
        this.fetchMappings()
        this.resetCreateForm()
      } catch (error) {
        if (error !== false) {
          console.error('创建映射关系失败:', error)
          // this.$message.error(error.message || '创建映射关系失败，请重试')
        }
      }
    },

    // 创建多设备绑定
    async createMultiBind() {
      try {
        await this.$refs.multiBindForm.validate()

        // Assuming createMultiDeviceMapping is defined elsewhere or will be added
        // For now, we'll just call createPersonDeviceMapping with an array of mappings
        // This might need adjustment based on the actual API for multi-device binding
        const multiMappings = this.multiBindData.deviceIds.map(deviceId => ({
          personId: this.multiBindData.personId,
          deviceId: deviceId,
          mappingName: this.multiBindData.mappingName
        }))

        await Promise.all(multiMappings.map(mapping => createPersonDeviceMapping(mapping)))
        // this.$message.success('多设备绑定成功')
        this.multiBindDialogVisible = false
        this.fetchMappings()
      } catch (error) {
        if (error !== false) {
          console.error('多设备绑定失败:', error)
          // this.$message.error('多设备绑定失败')
        }
      }
    },

    // 交换映射关系
    async swapMappings() {
      try {
        await this.$refs.swapForm.validate()

        if (this.swapData.mappingId1 === this.swapData.mappingId2) {
          // this.$message.warning('不能选择相同的映射关系')
          return
        }

        const mapping1 = this.activeMappings.find(m => m.id === this.swapData.mappingId1)
        const mapping2 = this.activeMappings.find(m => m.id === this.swapData.mappingId2)

        if (!mapping1 || !mapping2) {
          // this.$message.error('映射关系不存在')
          return
        }

        const preview = this.getSwapPreview()
        // await this.$confirm(
        //   `确定要交换以下映射关系吗？\n\n交换前：\n${preview.before.mapping1}\n${preview.before.mapping2}\n\n交换后：\n${preview.after.mapping1}\n${preview.after.mapping2}`,
        //   '确认交换',
        //   {
        //     confirmButtonText: '确定交换',
        //     cancelButtonText: '取消',
        //     type: 'warning'
        //   }
        // )

        // 使用新的API进行人员交换
        await swapPersons(mapping1.deviceId, mapping2.deviceId)

        // this.$message.success('交换映射关系成功')
        this.swapDialogVisible = false
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('交换映射关系失败:', error)
          // this.$message.error(error.message || '交换映射关系失败')
        }
      }
    },

    // 切换映射状态
    async toggleMappingStatus(mapping) {
      try {
        const action = mapping.isActive ? '停用' : '激活'
        // await this.$confirm(`确定要${action}此映射关系吗？`, '确认操作', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        if (mapping.isActive) {
          await deactivatePersonDeviceMapping(mapping.id)
        } else {
          await reactivatePersonDeviceMapping(mapping.id)
        }

        // this.$message.success(`${action}成功`)
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('切换映射状态失败:', error)
          // this.$message.error('操作失败')
        }
      }
    },

    // 编辑映射
    editMappingItem(mapping) {
      this.editMapping = { ...mapping }
      this.editDialogVisible = true
    },

    // 删除映射
    async deleteMappingItem(mapping) {
      try {
        // await this.$confirm('确定要删除此映射关系吗？删除后无法恢复！', '确认删除', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        const result = await deletePersonDeviceMapping(mapping.id)
        console.log('删除映射结果:', result)

        // this.$message.success('删除成功')
        // 刷新数据
        await this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除映射失败:', error)
          // 检查是否是网络错误或其他技术错误
          const errorMessage = error.message || '删除失败'
          // this.$message.error(errorMessage)
        }
      }
    },

    // 显示停用映射切换
    handleShowInactiveChange() {
      this.currentPage = 1
      this.fetchMappings()
    },

    // 数据验证辅助方法（使用新的验证工具）
    validateMappingData(mappings) {
      const result = validateAndFormatMappings(mappings)

      if (!result.success) {
        console.error('映射数据验证失败:', result.details)
        return {
          isValid: false,
          message: result.message,
          formattedData: null
        }
      }

      return {
        isValid: true,
        message: result.message,
        formattedData: result.data
      }
    },

    // 批量操作命令处理
    async handleBatchCommand(command) {
      switch (command) {
        case 'batchActivate':
          await this.batchActivateMappings()
          break
        case 'batchDeactivate':
          await this.batchDeactivateMappings()
          break
        case 'batchDelete':
          await this.batchDeleteMappings()
          break
        case 'cleanup':
          this.showCleanupDialog()
          break
      }
    },

    // 批量激活映射
    async batchActivateMappings() {
      try {
        const inactiveMappings = this.selectedMappings.filter(m => !m.isActive)
        if (inactiveMappings.length === 0) {
          // this.$message.warning('请选择需要激活的停用映射')
          return
        }

        // 数据验证和格式化
        const validation = this.validateMappingData(inactiveMappings)
        if (!validation.isValid) {
          // this.$message.error(validation.message)
          return
        }

        // await this.$confirm(`确定要激活选中的 ${inactiveMappings.length} 个映射关系吗？`, '确认操作', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        // 使用批量安全更新接口激活映射
        const mappingsToActivate = inactiveMappings.map(mapping => ({
          ...mapping,
          isActive: true
        }))
        await batchSafeUpdatePersonDeviceMappings(mappingsToActivate)
        // this.$message.success(`成功激活 ${inactiveMappings.length} 个映射关系`)
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量激活失败:', error)
          // this.$message.error(error.message || '批量激活失败，请重试')
        }
      }
    },

    // 批量停用映射
    async batchDeactivateMappings() {
      try {
        const activeMappings = this.selectedMappings.filter(m => m.isActive)
        if (activeMappings.length === 0) {
          // this.$message.warning('请选择需要停用的活跃映射')
          return
        }

        // 数据验证和格式化
        const validation = this.validateMappingData(activeMappings)
        if (!validation.isValid) {
          // this.$message.error(validation.message)
          return
        }

        // await this.$confirm(`确定要停用选中的 ${activeMappings.length} 个映射关系吗？`, '确认操作', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        // 使用批量安全更新接口停用映射
        const mappingsToDeactivate = activeMappings.map(mapping => ({
          ...mapping,
          isActive: false
        }))
        await batchSafeUpdatePersonDeviceMappings(mappingsToDeactivate)
        // this.$message.success(`成功停用 ${activeMappings.length} 个映射关系`)
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量停用失败:', error)
          // this.$message.error(error.message || '批量停用失败，请重试')
        }
      }
    },

    // 批量删除映射
    async batchDeleteMappings() {
      try {
        if (this.selectedMappings.length === 0) {
          // this.$message.warning('请选择需要删除的映射关系')
          return
        }

        // await this.$confirm(`确定要删除选中的 ${this.selectedMappings.length} 个映射关系吗？删除后无法恢复！`, '确认删除', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        const mappingIds = this.selectedMappings.map(m => m.id)
        await batchDeletePersonDeviceMappings(mappingIds)

        // this.$message.success(`成功删除 ${this.selectedMappings.length} 个映射关系`)
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error)
          // this.$message.error('批量删除失败')
        }
      }
    },

    // 简化的批量操作方法
    async batchDelete() {
      await this.batchDeleteMappings()
    },

    async batchActivate() {
      await this.batchActivateMappings()
    },

    async batchDeactivate() {
      await this.batchDeactivateMappings()
    },

    // 导出选中的映射数据
    exportSelected() {
      if (this.selectedMappings.length === 0) {
        // this.$message.warning('请选择要导出的映射关系')
        return
      }

      try {
        const dataToExport = this.selectedMappings.map(mapping => ({
          '人员工号': mapping.personId,
          '人员姓名': this.getPersonName(mapping.personId),
          '设备ID': mapping.deviceId,
          '设备名称': this.getDeviceName(mapping.deviceId),
          '设备类型': this.getDeviceType(mapping.deviceId),
          '映射名称': mapping.mappingName,
          '状态': mapping.isActive ? '激活' : '停用',
          '创建时间': this.formatDate(mapping.createdAt)
        }))

        // 创建CSV内容
        const headers = Object.keys(dataToExport[0] || {})
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n')

        // 下载文件
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `选中映射数据_${new Date().toISOString().slice(0, 10)}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // this.$message.success(`成功导出 ${this.selectedMappings.length} 条映射数据`)
      } catch (error) {
        console.error('导出失败:', error)
        // this.$message.error('导出失败，请重试')
      }
    },

    // 显示清理对话框
    showCleanupDialog() {
      this.cleanupDialogVisible = true
    },

    // 清理停用映射
    async cleanupInactiveMappingsAction() {
      try {
        // await this.$confirm(`确定要清理 ${this.cleanupConfig.daysOld} 天前的停用映射关系吗？此操作不可恢复！`, '确认清理', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // })

        const result = await cleanupInactiveMappings(this.cleanupConfig.daysOld)
        // this.$message.success(`清理完成，共清理了 ${result.data || 0} 条记录`)
        this.cleanupDialogVisible = false
        this.fetchMappings()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清理失败:', error)
          // this.$message.error('清理失败')
        }
      }
    },

    // 跳转到监测页面
    goToMonitor(mapping) {
      try {
        // 获取设备信息
        const device = this.devices.find(d => d.deviceId === mapping.deviceId)
        if (!device) {
          // this.$message.error('未找到对应的设备信息')
          return
        }

        // 获取人员信息
        const person = this.persons.find(p => p.personId === mapping.personId)
        if (!person) {
          // this.$message.error('未找到对应的人员信息')
          return
        }

        // 检查映射是否激活
        if (!mapping.isActive) {
          // this.$message.warning('该映射关系已停用，无法进行监测')
          return
        }

        // 根据设备类型确定跳转路径
        const typeRouteMap = {
          '人体位姿': '/monitor/posture',
          '呼吸心跳': '/monitor/vital',
          '心电': '/monitor/ecg',
          // 兼容其他可能的设备类型名称
          '人体雷达': '/monitor/posture',
          '呼吸雷达': '/monitor/vital',
          '心电雷达': '/monitor/ecg',
          // 兼容物理类型
          '室内型': '/monitor/vital', // 默认室内型设备为呼吸心跳监测
          '便携型': '/monitor/vital',
          '固定型': '/monitor/posture',
          // 兼容英文类型
          'vital': '/monitor/vital',
          'posture': '/monitor/posture',
          'ecg': '/monitor/ecg',
          'breath': '/monitor/vital',
          'pose': '/monitor/posture',
          'heart': '/monitor/ecg'
        }

        const deviceType = this.getDeviceType(device.deviceId)
        const routePath = typeRouteMap[deviceType]

        // 添加调试信息
        console.log('设备信息:', device)
        console.log('设备ID:', device.deviceId)
        console.log('设备原始type字段:', device.type)
        console.log('判断的监测类型:', deviceType)
        console.log('路由路径:', routePath)
        console.log('设备管理中的监测类型绑定:', {
          deviceId: device.deviceId,
          deviceType: device.type,
          mappedType: deviceType,
          isStandardType: ['人体位姿', '呼吸心跳', '心电'].includes(device.type)
        })

        if (!routePath) {
          console.error('设备类型映射失败:', {
            deviceId: device.deviceId,
            deviceType: deviceType,
            availableTypes: Object.keys(typeRouteMap)
          })
          // this.$message.error(`不支持的设备类型: ${deviceType}`)
          return
        }

        // 更新Vuex中的当前设备ID
        // this.$store.dispatch('device/setCurrentDevice', device.deviceId)

        // 跳转到监测页面
        this.$router.push({
          path: routePath,
          query: {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            deviceLocation: device.location,
            personId: person.personId,
            personName: person.personName,
            mappingName: mapping.mappingName
          }
        })

        // this.$message.success(`正在跳转到${person.personName}的${deviceType}监测页面`)
      } catch (error) {
        console.error('跳转监测页面失败:', error)
        // this.$message.error('跳转失败，请重试')
      }
    },

    // 刷新数据
    refreshData() {
      this.fetchData()
      // this.$message.success('数据已刷新')
    },

    // 重置表单
    resetCreateForm() {
      if (this.$refs.createForm) {
        this.$refs.createForm.resetFields()
      }
      this.newMapping = {
        personId: '',
        deviceId: '',
        mappingName: ''
      }
    },

    resetMultiBindForm() {
      if (this.$refs.multiBindForm) {
        this.$refs.multiBindForm.resetFields()
      }
      this.multiBindData = {
        personId: '',
        deviceIds: [],
        mappingName: ''
      }
    },

    resetSwapForm() {
      if (this.$refs.swapForm) {
        this.$refs.swapForm.resetFields()
      }
      this.swapData = {
        mappingId1: '',
        mappingId2: ''
      }
    },

    // 处理映射选择变化
    handleMappingSelection() {
      // 当选择发生变化时，可以在这里添加额外的逻辑
      this.$forceUpdate() // 强制更新预览
    },

    // 获取交换预览信息
    getSwapPreview() {
      if (!this.swapData.mappingId1 || !this.swapData.mappingId2) {
        return { before: {}, after: {} }
      }

      const mapping1 = this.activeMappings.find(m => m.id === this.swapData.mappingId1)
      const mapping2 = this.activeMappings.find(m => m.id === this.swapData.mappingId2)

      if (!mapping1 || !mapping2) {
        return { before: {}, after: {} }
      }

      const person1Name = this.getPersonName(mapping1.personId)
      const person2Name = this.getPersonName(mapping2.personId)
      const device1Name = this.getDeviceName(mapping1.deviceId)
      const device2Name = this.getDeviceName(mapping2.deviceId)

      return {
        before: {
          mapping1: `${person1Name} - ${device1Name}`,
          mapping2: `${person2Name} - ${device2Name}`
        },
        after: {
          mapping1: `${person1Name} - ${device2Name}`,
          mapping2: `${person2Name} - ${device1Name}`
        }
      }
    },

    resetEditForm() {
      if (this.$refs.editForm) {
        this.$refs.editForm.resetFields()
      }
      this.editMapping = {
        id: null,
        personId: '',
        deviceId: '',
        mappingName: '',
        isActive: true
      }
    },

    // 更新映射
    async updateMapping() {
      try {
        await this.$refs.editForm.validate()

        // 数据验证
        const validation = this.validateMappingData([this.editMapping])
        if (!validation.isValid) {
          // this.$message.error(validation.message)
          return
        }

        // 检查设备冲突（设备是否已被其他人员绑定）
        const deviceConflict = this.mappings.find(m => 
          m.deviceId === this.editMapping.deviceId && 
          m.personId !== this.editMapping.personId && 
          m.id !== this.editMapping.id &&
          m.isActive
        )
        
        if (deviceConflict) {
          const conflictPersonName = this.getPersonName(deviceConflict.personId)
          // await this.$confirm(
          //   `设备 ${this.getDeviceName(this.editMapping.deviceId)} 已被 ${conflictPersonName} 绑定，继续操作将自动处理设备冲突。是否继续？`,
          //   '设备冲突提醒',
          //   {
          //     confirmButtonText: '继续更新',
          //     cancelButtonText: '取消',
          //     type: 'warning'
          //   }
          // )
        }

        // 智能选择更新方法
        if (this.editMapping.id && this.apiSupport.singleUpdate) {
          console.log('✅ 使用单个映射更新API:', {
            id: this.editMapping.id,
            data: this.editMapping
          })
          await updateSingleMapping(this.editMapping.id, this.editMapping)
        } else if (this.apiSupport.batchSafe) {
          console.log('✅ 使用批量安全更新API:', [this.editMapping])
          await batchSafeUpdatePersonDeviceMappings([this.editMapping])
        } else {
          console.log('⚠️ 使用备用更新方法')
          // 备用方案：先删除后创建
          if (this.editMapping.id) {
            await deletePersonDeviceMapping(this.editMapping.id)
          }
          await createPersonDeviceMapping(this.editMapping)
        }
        
        // this.$message.success('更新映射成功')
        this.editDialogVisible = false
        this.fetchMappings()
      } catch (error) {
        if (error !== false) {
          console.error('更新映射失败:', error)
          const errorMessage = error.message || '更新映射失败，请重试'
          // this.$message.error(errorMessage)
        }
      }
    },

    // 辅助方法
    getPersonName(personId) {
      const person = this.persons.find(p => p.personId === personId)
      return person ? person.personName : personId
    },

    getDeviceName(deviceId) {
      const device = this.devices.find(d => d.deviceId === deviceId)
      return device ? device.deviceName : deviceId
    },

    getDeviceType(deviceId) {
      // 优先从设备管理中获取监测类型
      const device = this.devices.find(d => d.deviceId === deviceId)

      if (device && device.type) {
        // 如果设备的type字段是标准的监测类型，直接返回
        const standardTypes = ['人体位姿', '呼吸心跳', '心电']
        if (standardTypes.includes(device.type)) {
          return device.type
        }

        // 如果是其他类型，尝试映射到标准监测类型
        const typeMapping = {
          '室内型': '呼吸心跳',
          '便携型': '呼吸心跳',
          '固定型': '人体位姿',
          '人体雷达': '人体位姿',
          '呼吸雷达': '呼吸心跳',
          '心电雷达': '心电',
          'vital': '呼吸心跳',
          'posture': '人体位姿',
          'ecg': '心电',
          'breath': '呼吸心跳',
          'pose': '人体位姿',
          'heart': '心电'
        }

        if (typeMapping[device.type]) {
          return typeMapping[device.type]
        }
      }

      // 备用方案：根据设备ID判断监测类型
      if (deviceId.includes('R60')) return '呼吸心跳'
      if (deviceId.includes('R77')) return '人体位姿'
      // TI6843 vital设备是呼吸心跳监测，不是心电
      if (deviceId.includes('TI6843') && deviceId.includes('VITAL')) return '呼吸心跳'
      if (deviceId.includes('TI6843')) return '人体位姿' // TI6843其他类型默认为位姿
      if (deviceId.includes('TI') && deviceId.toLowerCase().includes('ecg')) return '心电' // 只有明确包含ECG的TI设备才是心电

      // 兼容其他可能的命名规则
      if (deviceId.toLowerCase().includes('vital') || deviceId.toLowerCase().includes('breath')) return '呼吸心跳'
      if (deviceId.toLowerCase().includes('posture') || deviceId.toLowerCase().includes('pose')) return '人体位姿'
      if (deviceId.toLowerCase().includes('ecg') || deviceId.toLowerCase().includes('heart')) return '心电'

      // 默认为呼吸心跳类型
      return '呼吸心跳'
    },

    getDeviceTypeColor(type) {
      const colorMap = {
        '人体位姿': 'success',
        '呼吸心跳': 'warning',
        '心电': 'danger'
      }
      return colorMap[type] || 'info'
    },

    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
</style>
