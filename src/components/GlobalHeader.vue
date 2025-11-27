<template>
  <header class="global-header">
    <div class="brand" @click="goHome">
      <div class="logo-glow">
        <span class="logo-dot" />
      </div>
      <div class="brand-text">
        <span class="brand-title">毫米波雷达</span>
        <span class="brand-subtitle">集 成 监 测 系 统</span>
      </div>
    </div>

    <nav class="nav-links">
      <template v-for="item in navItems" :key="item.path">
        <!-- 带下拉菜单的导航项 -->
        <div 
          v-if="item.children" 
          class="nav-dropdown"
          @mouseenter="handleMouseEnter(item)"
          @mouseleave="handleMouseLeave"
        >
          <div
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-label">{{ item.label }}</span>
            <el-icon class="dropdown-icon" :class="{ rotate: activeDropdown === item.label }">
              <ArrowDown />
            </el-icon>
          </div>
          
          <!-- 下拉菜单 -->
          <transition name="dropdown">
            <div v-show="activeDropdown === item.label" class="dropdown-menu">
              <RouterLink
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                class="dropdown-item"
                @click="activeDropdown = null"
              >
                <el-icon class="item-icon">
                  <component :is="child.icon" />
                </el-icon>
                <span>{{ child.label }}</span>
              </RouterLink>
            </div>
          </transition>
        </div>

        <!-- 普通导航项 -->
        <RouterLink
          v-else
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="actions">
      <ElInput
        v-model="searchQuery"
        placeholder="搜索人员、设备或记录"
        clearable
        class="search"
        size="large"
        :prefix-icon="Search"
      />
      <ElBadge :value="3" class="badge" type="danger">
        <ElButton class="icon-button" :icon="BellFilled" circle />
      </ElBadge>
      <ElAvatar class="avatar" size="large" :icon="UserFilled" />
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { BellFilled, Search, UserFilled, ArrowDown, Monitor, User as UserIcon, VideoCameraFilled } from '@element-plus/icons-vue'
import { ElAvatar, ElBadge, ElButton, ElInput, ElIcon } from 'element-plus'

const route = useRoute()
const router = useRouter()

const navItems = [
  { label: '概览', path: '/overview' },
  { label: '人员', path: '/person' },
  { label: '设备', path: '/device' },
  { label: '人员雷达绑定', path: '/mapping' },
  { 
    label: '实时监测', 
    path: '/realtime',
    children: [
      { label: '呼吸心跳', path: '/realtime/vital'},
      { label: '人体位姿', path: '/realtime/posture'},
      { label: '心电监测', path: '/realtime/ecg'}
    ]
  },
  { label: '历史数据', path: '/history' },
  { label: '告警处理', path: '/alert/fall' }
]

const searchQuery = ref('')
const activeDropdown = ref(null)
let hideTimeout = null

const activePath = computed(() => route.path)

const isActive = path => activePath.value.startsWith(path)

const handleMouseEnter = (item) => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  activeDropdown.value = item.label
}

const handleMouseLeave = () => {
  hideTimeout = setTimeout(() => {
    activeDropdown.value = null
  }, 200)
}

const goHome = () => {
  router.push('/overview')
}
</script>

<style scoped>
.global-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 14px 28px;
  background: linear-gradient(120deg, rgba(132, 94, 247, 0.14), rgba(94, 233, 255, 0.14));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-glow {
  width: 44px;
  height: 44px;
  border-radius: 18px;
  background: radial-gradient(circle at 30% 30%, #fff, rgba(255, 255, 255, 0.6) 45%, rgba(255, 255, 255, 0) 65%),
    linear-gradient(135deg, var(--primary-500), var(--accent-500));
  box-shadow: 0 0 24px rgba(132, 94, 247, 0.55), 0 0 40px rgba(94, 233, 255, 0.4);
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
}

.logo-dot {
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.9);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-strong);
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-soft);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.nav-link {
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 600;
  color: var(--text-soft);
  text-decoration: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link:hover {
  color: var(--text-strong);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.nav-link.active {
  color: var(--text-strong);
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.22), rgba(94, 233, 255, 0.22));
  border: 1px solid rgba(132, 94, 247, 0.35);
  box-shadow: 0 10px 28px rgba(132, 94, 247, 0.25);
}

.nav-label {
  white-space: nowrap;
}

/* 下拉菜单容器 */
.nav-dropdown {
  position: relative;
}

.dropdown-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.dropdown-icon.rotate {
  transform: rotate(180deg);
}

/* 下拉菜单面板 */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 160px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(132, 94, 247, 0.2);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  padding: 8px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-soft);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dropdown-item:hover {
  color: var(--text-strong);
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.15), rgba(94, 233, 255, 0.15));
  transform: translateX(2px);
}

.item-icon {
  font-size: 16px;
  color: var(--primary-500);
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.25s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.search {
  width: 260px;
}

.badge :deep(.el-badge__content) {
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.8);
}

.icon-button {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: var(--primary-600);
}

.icon-button:hover {
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.2), rgba(94, 233, 255, 0.2));
  color: var(--primary-700);
}

.avatar {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.3), rgba(94, 233, 255, 0.3));
}

@media (max-width: 1100px) {
  .global-header {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    gap: 12px;
  }

  .nav-links {
    flex-wrap: wrap;
  }

  .actions {
    width: 100%;
  }

  .search {
    flex: 1;
  }
}
</style>
