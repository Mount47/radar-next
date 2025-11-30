/**
 * API 模块统一导出
 * 
 * 目录结构：
 * - core/       核心配置和用户认证
 * - devices/    设备管理
 * - persons/    人员管理
 * - sensors/    传感器数据（R60ABD1, TI6843等）
 * - alerts/     警报管理
 * - mappings/   设备人员映射
 */

// 核心模块
export * from './core'

// 设备模块
export * from './devices'

// 人员模块
export * from './persons'

// 传感器模块
export * from './sensors'

// 警报模块
export * from './alerts'

// 映射模块
export * from './mappings'
