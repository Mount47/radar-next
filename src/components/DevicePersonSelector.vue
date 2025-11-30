<template>
  <div class="device-person-selector">
    <!-- 设备选择器 -->
    <div class="selector-group">
      <label class="selector-label">
        <el-icon><Cpu /></el-icon>
        监测设备
      </label>
      <el-select
        v-model="selectedDeviceId"
        placeholder="选择设备"
        filterable
        @change="handleDeviceChange"
        class="selector-control"
        :loading="loadingDevices"
      >
        <el-option
          v-for="device in deviceOptions"
          :key="device.id"
          :label="device.label"
          :value="device.id"
        >
          <div class="device-option">
            <span class="device-name">{{ device.name }}</span>
            <el-tag 
              :type="getDeviceStatusType(device.status)" 
              size="small"
              effect="plain"
            >
              {{ device.status === 'online' ? '在线' : '离线' }}
            </el-tag>
            <span class="device-type">{{ device.type }}</span>
          </div>
        </el-option>
        <template #empty>
          <div class="empty-text">暂无设备数据</div>
        </template>
      </el-select>
    </div>

    <!-- 人员选择器 -->
    <div class="selector-group">
      <label class="selector-label">
        <el-icon><User /></el-icon>
        监测人员
      </label>
      <el-select
        v-model="selectedPersonId"
        placeholder="选择人员（可选）"
        filterable
        clearable
        @change="handlePersonChange"
        class="selector-control"
        :loading="loadingPersons"
        :disabled="!hasBindings"
      >
        <el-option
          v-for="person in personOptions"
          :key="person.id"
          :label="person.label"
          :value="person.id"
        >
          <div class="person-option">
            <span class="person-name">{{ person.name }}</span>
            <span class="person-id">ID: {{ person.id }}</span>
            <el-tag v-if="person.deviceId" size="small" type="info" effect="plain">
              {{ person.deviceName }}
            </el-tag>
          </div>
        </el-option>
        <template #empty>
          <div class="empty-text">
            {{ hasBindings ? '暂无人员数据' : '当前无人员实时数据' }}
          </div>
        </template>
      </el-select>
    </div>

    <!-- 状态指示器 -->
    <div class="status-indicator">
      <el-badge 
        :value="onlineDeviceCount" 
        :max="99"
        type="success"
        class="status-badge"
      >
        <el-button size="small" circle :icon="Monitor" />
      </el-badge>
      <span class="status-text">{{ onlineDeviceCount }} 设备在线</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { Cpu, User, Monitor } from '@element-plus/icons-vue'
import { getDevices } from '@/api/devices/device'
import { getPersons } from '@/api/persons/person'
import { getActivePersonDeviceMappings } from '@/api/sensors/r60abd1'
import { getDeviceType } from '@/utils/deviceConfig'
import dataManager from '@/utils/DataManager'

export default {
  name: 'DevicePersonSelector',
  components: {
    Cpu,
    User,
    Monitor
  },
  props: {
    // 当前选中的设备ID
    modelValue: {
      type: String,
      default: ''
    },
    // 当前选中的人员ID（可选）
    personId: {
      type: String,
      default: ''
    },
    // 设备类型过滤（如：只显示vital类型或posture类型）
    deviceTypeFilter: {
      type: String,
      default: '' // 'vital', 'posture', '' (全部)
    }
  },
  emits: ['update:modelValue', 'update:personId', 'device-change', 'person-change'],
  setup(props, { emit }) {
    const selectedDeviceId = ref(props.modelValue)
    const selectedPersonId = ref(props.personId)
    const loadingDevices = ref(false)
    const loadingPersons = ref(false)
    
    const deviceList = ref([])
    const personList = ref([])
    const mappingList = ref([])
    const deviceDataCache = ref({}) // 缓存每个设备的最新数据

    // 设备选项
    const deviceOptions = computed(() => {
      // 合并API设备列表和WebSocket数据缓存中的设备
      const allDeviceIds = new Set([
        ...deviceList.value.map(d => d.id),
        ...Object.keys(deviceDataCache.value)
      ])

      let devices = Array.from(allDeviceIds).map(deviceId => {
        const apiDevice = deviceList.value.find(d => d.id === deviceId)
        const cache = deviceDataCache.value[deviceId]
        
        // 优先使用API设备信息，如果不存在则从缓存创建
        return {
          id: deviceId,
          name: apiDevice?.name || apiDevice?.deviceName || cache?.deviceName || deviceId,
          location: apiDevice?.location || cache?.location || '未知位置',
          status: cache?.status === 'online' ? 'online' : (apiDevice?.status || 'offline'),
          lastUpdate: cache?.timestamp || apiDevice?.lastUpdate
        }
      })

      // 根据设备类型过滤
      if (props.deviceTypeFilter) {
        devices = devices.filter(device => {
          const type = getDeviceType(device.id)
          if (props.deviceTypeFilter === 'vital') {
            // 呼吸心跳类型：R60ABD1 或 TI6843_VITAL
            return type === 'R60ABD1' || (type === 'TI6843' && device.id.toUpperCase().includes('VITAL'))
          } else if (props.deviceTypeFilter === 'posture') {
            // 位姿类型：TI6843_POSTURE
            return type === 'TI6843' && device.id.toUpperCase().includes('POSTURE')
          }
          return true
        })
      }

      return devices.map(device => {
        const type = getDeviceType(device.id)
        const cache = deviceDataCache.value[device.id]
        const isOnline = cache?.status === 'online' || device.status === 'online'
        
        return {
          id: device.id,
          name: device.name || device.id,
          location: device.location || '未知位置',
          type: type,
          status: isOnline ? 'online' : 'offline',
          label: `${device.name || device.id} - ${device.location || '未知位置'}`,
          lastUpdate: cache?.timestamp || device.lastUpdate
        }
      })
    })

    // 人员选项（只显示有实时数据的人员）
    const personOptions = computed(() => {
      // 从WebSocket数据缓存中提取所有有数据的personId
      const activePersonIds = new Set()
      Object.values(deviceDataCache.value).forEach(cache => {
        if (cache.personId && cache.personId.trim() !== '') {
          activePersonIds.add(cache.personId)
        }
      })

      // 只返回有实时数据的人员
      const activePersons = personList.value.filter(person => 
        activePersonIds.has(person.id)
      )

      return activePersons.map(person => {
        // 查找该人员的绑定关系
        const mapping = mappingList.value.find(m => m.personId === person.id)
        const device = deviceList.value.find(d => d.id === mapping?.deviceId)
        
        // 优先使用 person.name，其次 person.personName，最后使用 person.id
        const personName = person.name || person.personName || `人员-${person.id}`
        const deviceName = device?.name || device?.deviceName || mapping?.deviceId || '未知设备'
        
        return {
          id: person.id,
          name: personName,
          deviceId: mapping?.deviceId,
          deviceName: deviceName,
          label: `${personName}${device ? ` (${device.name || device.id})` : ''}`
        }
      })
    })

    // 在线设备数量
    const onlineDeviceCount = computed(() => {
      return deviceOptions.value.filter(d => d.status === 'online').length
    })

    // 是否有绑定关系（基于实际有数据的人员）
    const hasBindings = computed(() => {
      return personOptions.value.length > 0
    })

    // 获取设备状态类型
    const getDeviceStatusType = (status) => {
      return status === 'online' ? 'success' : 'info'
    }

    // 获取设备列表
    const fetchDevices = async () => {
      try {
        loadingDevices.value = true
        const { data } = await getDevices({ page: 0, size: 100 })
        deviceList.value = data || []
        console.log('✅ 获取设备列表:', deviceList.value)
      } catch (error) {
        console.error('❌ 获取设备列表失败:', error)
        deviceList.value = []
      } finally {
        loadingDevices.value = false
      }
    }

    // 获取人员列表
    const fetchPersons = async () => {
      try {
        loadingPersons.value = true
        const response = await getPersons({ page: 0, size: 100 })
        // 处理分页和数组两种格式
        personList.value = response.data?.content || response.data || []
        console.log('✅ 获取人员列表:', personList.value)
      } catch (error) {
        console.error('❌ 获取人员列表失败:', error)
        personList.value = []
      } finally {
        loadingPersons.value = false
      }
    }

    // 获取绑定关系
    const fetchMappings = async () => {
      try {
        const response = await getActivePersonDeviceMappings()
        // 处理分页和数组两种格式
        mappingList.value = response.data?.content || response.data || []
        console.log('✅ 获取绑定关系:', mappingList.value)
      } catch (error) {
        console.error('❌ 获取绑定关系失败:', error)
        mappingList.value = []
      }
    }

    // 处理设备切换
    const handleDeviceChange = (deviceId) => {
      console.log('🔄 切换设备:', deviceId)
      emit('update:modelValue', deviceId)
      
      // 查找该设备的绑定人员
      const mapping = mappingList.value.find(m => m.deviceId === deviceId)
      if (mapping) {
        selectedPersonId.value = mapping.personId
        emit('update:personId', mapping.personId)
      } else {
        // 设备未绑定人员
        selectedPersonId.value = ''
        emit('update:personId', '')
      }
      
      const device = deviceOptions.value.find(d => d.id === deviceId)
      emit('device-change', {
        deviceId,
        device,
        personId: selectedPersonId.value
      })
    }

    // 处理人员切换
    const handlePersonChange = (personId) => {
      console.log('🔄 切换人员:', personId)
      emit('update:personId', personId)
      
      if (personId) {
        // 切换到该人员绑定的设备
        const mapping = mappingList.value.find(m => m.personId === personId)
        if (mapping && mapping.deviceId !== selectedDeviceId.value) {
          selectedDeviceId.value = mapping.deviceId
          emit('update:modelValue', mapping.deviceId)
        }
      }
      
      const person = personOptions.value.find(p => p.id === personId)
      emit('person-change', {
        personId,
        person,
        deviceId: selectedDeviceId.value
      })
    }

    // 监听DataManager的数据更新，更新设备状态
    const handleDataUpdate = (data) => {
      if (data.deviceId) {
        deviceDataCache.value[data.deviceId] = {
          ...data,
          status: 'online',
          timestamp: data.timestamp || new Date().toISOString()
        }
      }
    }

    // 刷新设备列表
    const refreshDeviceList = async () => {
      console.log('🔄 刷新设备列表...')
      await Promise.all([
        fetchDevices(),
        fetchPersons(),
        fetchMappings()
      ])
      console.log('✅ 设备列表刷新完成')
    }

    // 初始化
    onMounted(async () => {
      // 先监听数据更新，这样可以捕获早期的数据
      dataManager.on('dataUpdate', handleDataUpdate)
      
      // 监听刷新设备列表事件
      const currentInstance = getCurrentInstance()
      if (currentInstance) {
        currentInstance.appContext.config.globalProperties.$root.$on('refresh-device-list', refreshDeviceList)
      }
      
      await Promise.all([
        fetchDevices(),
        fetchPersons(),
        fetchMappings()
      ])

      // 等待一小段时间让WebSocket数据到达
      await new Promise(resolve => setTimeout(resolve, 500))

      // 如果没有选中设备，自动选中第一个有数据的设备
      if (!selectedDeviceId.value && deviceOptions.value.length > 0) {
        // 优先选择有数据缓存的在线设备
        const devicesWithData = deviceOptions.value.filter(d => 
          deviceDataCache.value[d.id] && d.status === 'online'
        )
        const firstOnline = devicesWithData[0] || deviceOptions.value.find(d => d.status === 'online')
        const firstDevice = firstOnline || deviceOptions.value[0]
        
        if (firstDevice) {
          console.log('🎯 自动选择设备:', firstDevice.id, '状态:', firstDevice.status)
          selectedDeviceId.value = firstDevice.id
          handleDeviceChange(firstDevice.id)
        }
      }
    })

    // 监听props变化
    watch(() => props.modelValue, (newVal) => {
      if (newVal !== selectedDeviceId.value) {
        selectedDeviceId.value = newVal
      }
    })

    watch(() => props.personId, (newVal) => {
      if (newVal !== selectedPersonId.value) {
        selectedPersonId.value = newVal
      }
    })

    return {
      selectedDeviceId,
      selectedPersonId,
      loadingDevices,
      loadingPersons,
      deviceOptions,
      personOptions,
      onlineDeviceCount,
      hasBindings,
      getDeviceStatusType,
      handleDeviceChange,
      handlePersonChange
    }
  }
}
</script>

<style scoped>
.device-person-selector {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.selector-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.selector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.selector-control {
  min-width: 250px;
  flex: 1;
}

.device-option,
.person-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
}

.device-name,
.person-name {
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.device-type {
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 4px;
}

.person-id {
  font-size: 12px;
  color: #9ca3af;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px solid #e5e7eb;
}

.status-badge {
  --el-badge-size: 18px;
}

.status-text {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.empty-text {
  padding: 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .device-person-selector {
    flex-wrap: wrap;
  }
  
  .selector-group {
    min-width: 100%;
  }
  
  .status-indicator {
    border-left: none;
    padding-left: 0;
    width: 100%;
    justify-content: center;
  }
}
</style>
