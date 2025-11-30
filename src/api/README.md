# API 目录结构说明

## 📁 目录组织

API 文件已按功能模块分类组织，便于维护和查找：

```
src/api/
├── core/                    # 核心模块
│   ├── config.js           # API 配置（BASE_URL, WebSocket配置等）
│   ├── user.js             # 用户认证相关 API
│   └── index.js            # 模块导出
├── devices/                 # 设备管理模块
│   ├── device.js           # 设备 CRUD 操作
│   └── index.js            # 模块导出
├── persons/                 # 人员管理模块
│   ├── person.js           # 人员 CRUD 操作
│   └── index.js            # 模块导出
├── sensors/                 # 传感器数据模块
│   ├── r60abd1.js          # R60ABD1 雷达传感器 API
│   ├── ti6843.js           # TI6843 传感器基础 API
│   ├── ti6843-vital.js     # TI6843 呼吸心跳数据 API
│   ├── ti6843-posture.js   # TI6843 人体位姿数据 API
│   ├── vital.js            # 通用生命体征数据 API
│   ├── posture.js          # 通用位姿数据 API
│   └── index.js            # 模块导出
├── alerts/                  # 警报管理模块
│   ├── fall-alert.js       # 跌倒警报 API
│   ├── vitals-alert.js     # 生命体征异常警报 API
│   └── index.js            # 模块导出
├── mappings/                # 设备人员映射模块
│   ├── person-device-mapping.js  # 设备人员绑定关系管理
│   └── index.js            # 模块导出
└── index.js                 # 总索引（导出所有模块）

```

## 📝 使用方式

### 方式一：从具体模块导入（推荐）

```javascript
// 从设备模块导入
import { getDevices, addDevice } from '@/api/devices/device'

// 从人员模块导入
import { getPersons, createPerson } from '@/api/persons/person'

// 从传感器模块导入
import { getActivePersonDeviceMappings } from '@/api/sensors/r60abd1'
import { getTI6843DeviceRealtimeData } from '@/api/sensors/ti6843-vital'

// 从警报模块导入
import { getActiveFallAlerts } from '@/api/alerts/fall-alert'
import { VITAL_ALERT_TYPE_MAP } from '@/api/alerts/vitals-alert'

// 从配置模块导入
import { API_CONFIG } from '@/api/core/config'
```

### 方式二：从模块索引导入

```javascript
// 从设备模块索引导入
import { getDevices, addDevice } from '@/api/devices'

// 从传感器模块索引导入
import { getActivePersonDeviceMappings, getTI6843DeviceRealtimeData } from '@/api/sensors'

// 从警报模块索引导入
import { getActiveFallAlerts, VITAL_ALERT_TYPE_MAP } from '@/api/alerts'
```

### 方式三：从总索引导入（适合小量导入）

```javascript
// 从总索引导入
import { API_CONFIG, getDevices, getPersons } from '@/api'
```

## 🔄 迁移指南

旧路径 → 新路径对照表：

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `@/api/config` | `@/api/core/config` | 核心配置 |
| `@/api/user` | `@/api/core/user` | 用户认证 |
| `@/api/device` | `@/api/devices/device` | 设备管理 |
| `@/api/person` | `@/api/persons/person` | 人员管理 |
| `@/api/r60abd1` | `@/api/sensors/r60abd1` | R60ABD1传感器 |
| `@/api/ti6843` | `@/api/sensors/ti6843` | TI6843传感器 |
| `@/api/ti6843-vital` | `@/api/sensors/ti6843-vital` | TI6843呼吸心跳 |
| `@/api/ti6843-posture` | `@/api/sensors/ti6843-posture` | TI6843位姿 |
| `@/api/vital` | `@/api/sensors/vital` | 生命体征 |
| `@/api/posture` | `@/api/sensors/posture` | 位姿数据 |
| `@/api/fall-alert` | `@/api/alerts/fall-alert` | 跌倒警报 |
| `@/api/vitals-alert` | `@/api/alerts/vitals-alert` | 体征警报 |
| `@/api/person-device-mapping` | `@/api/mappings/person-device-mapping` | 设备人员映射 |

## ✅ 优势

1. **清晰的模块划分**：相关功能集中在一起，易于查找和维护
2. **更好的代码组织**：避免单一目录文件过多
3. **便于扩展**：新增功能时可以明确归类
4. **降低耦合**：模块间界限清晰
5. **向后兼容**：通过索引文件保持灵活的导入方式

## 📌 注意事项

- 所有文件路径引用已自动更新
- 建议使用具体路径导入（方式一），更明确清晰
- 每个模块都有 index.js 作为统一导出点
- 内部引用（如传感器文件引用 config）已更新
