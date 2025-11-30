# ECG心电监测系统 API 文档

## 概述

ECG心电监测系统提供完整的心电数据采集、存储、查询和实时推送功能。

**基础URL**: `/api/ecg/data`  
**WebSocket端点**: `ws://localhost:8080/ws/ecg`

---

## REST API 接口

### 1. 数据上传

#### 上传ECG数据
```
POST /api/ecg/data/data
```

**请求体示例**:
```json
{
  "deviceId": "ECG_001",
  "ecg_value": 0.85,
  "timestamp": "2025-11-30T14:30:00.123456",
  "sampling_rate": 250,
  "lead_type": "Lead_I",
  "signal_quality": 95
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "ECG数据上传成功",
  "data": {
    "id": 12345,
    "deviceId": "ECG_001",
    "personId": "P001",
    "ecgValue": 0.85,
    "heartRate": 75,
    "samplingRate": 250,
    "leadType": "Lead_I",
    "signalQuality": 95,
    "timestamp": "2025-11-30T14:30:00.123456",
    "createdAt": "2025-11-30T14:30:01"
  }
}
```

---

### 2. 实时数据查询（设备维度）

#### 获取设备最新实时数据
```
GET /api/ecg/data/realtime/{deviceId}
```

**说明**: 获取指定设备最新的50条ECG实时数据

**响应**: 返回 `List<ECGRealtimeData>`

---

#### 获取设备所有实时数据
```
GET /api/ecg/data/device/{deviceId}
```

**说明**: 获取指定设备的所有ECG实时数据

---

#### 查询设备指定时间范围数据
```
GET /api/ecg/data/device/{deviceId}/range?start={start}&end={end}
```

**参数**:
- `deviceId`: 设备ID
- `start`: 开始时间 (ISO 8601格式, 如: `2025-11-30T00:00:00`)
- `end`: 结束时间 (ISO 8601格式)

**示例**:
```
GET /api/ecg/data/device/ECG_001/range?start=2025-11-30T00:00:00&end=2025-11-30T23:59:59
```

---

### 3. 实时数据查询（人员维度）

#### 获取人员最新实时数据
```
GET /api/ecg/data/person/{personId}/latest
```

**说明**: 获取指定人员最新的ECG实时数据

---

#### 获取人员所有实时数据
```
GET /api/ecg/data/person/{personId}
```

---

#### 查询人员指定时间范围数据
```
GET /api/ecg/data/person/{personId}/range?start={start}&end={end}
```

---

### 4. 历史数据查询（分页）

#### 查询设备历史数据
```
GET /api/ecg/data/historical/device/{deviceId}?start={start}&end={end}&page={page}&size={size}
```

**参数**:
- `deviceId`: 设备ID
- `start`: 开始时间
- `end`: 结束时间
- `page`: 页码 (默认: 0)
- `size`: 每页数量 (默认: 20)

**响应示例**:
```json
{
  "content": [
    {
      "id": 12345,
      "deviceId": "ECG_001",
      "personId": "P001",
      "ecgValue": 0.85,
      "heartRate": 75,
      "samplingRate": 250,
      "leadType": "Lead_I",
      "signalQuality": 95,
      "timestamp": "2025-11-30T14:30:00.123456",
      "createdAt": "2025-11-30T14:30:01",
      "archivedAt": "2025-12-01T02:00:00"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 1250,
  "totalPages": 63,
  "last": false,
  "first": true
}
```

---

#### 查询人员历史数据
```
GET /api/ecg/data/historical/person/{personId}?start={start}&end={end}&page={page}&size={size}
```

---

### 5. 统计分析

#### 获取设备统计信息
```
GET /api/ecg/data/statistics/device/{deviceId}?start={start}&end={end}
```

**响应示例**:
```json
{
  "deviceId": "ECG_001",
  "timeRange": {
    "start": "2025-11-30T00:00:00",
    "end": "2025-11-30T23:59:59"
  },
  "realtimeDataCount": 500,
  "historicalDataCount": 2000,
  "totalDataCount": 2500,
  "averageHeartRate": 72.5,
  "maxHeartRate": 95,
  "minHeartRate": 58,
  "averageSignalQuality": 88.3
}
```

---

#### 获取人员统计信息
```
GET /api/ecg/data/statistics/person/{personId}?start={start}&end={end}
```

---

### 6. 健康检查

#### 服务健康检查
```
GET /api/ecg/data/health
```

**响应示例**:
```json
{
  "status": "UP",
  "service": "ECG Data Service",
  "timestamp": "2025-11-30T15:30:00"
}
```

---

## WebSocket 实时推送

### 连接地址
```
ws://localhost:8080/ws/ecg
```

### 连接建立

客户端连接成功后会收到欢迎消息：

```json
{
  "type": "connection_established",
  "service": "ECG心电监测WebSocket",
  "message": "连接建立成功，可以订阅设备或人员的ECG数据",
  "subscriptionFormat": {
    "subscribe": "{\"action\":\"subscribe\",\"type\":\"device|person\",\"id\":\"xxx\"}",
    "unsubscribe": "{\"action\":\"unsubscribe\",\"type\":\"device|person\",\"id\":\"xxx\"}"
  },
  "timestamp": "2025-11-30T15:30:00",
  "sessionId": "abc123"
}
```

---

### 订阅设备数据

**发送消息**:
```json
{
  "action": "subscribe",
  "type": "device",
  "id": "ECG_001"
}
```

**确认消息**:
```json
{
  "type": "subscription_confirmation",
  "subscriptionType": "device",
  "subscriptionId": "ECG_001",
  "subscribed": true,
  "message": "订阅成功",
  "timestamp": "2025-11-30T15:30:01"
}
```

---

### 订阅人员数据

**发送消息**:
```json
{
  "action": "subscribe",
  "type": "person",
  "id": "P001"
}
```

---

### 取消订阅

**发送消息**:
```json
{
  "action": "unsubscribe",
  "type": "device",
  "id": "ECG_001"
}
```

---

### 心跳检测

**发送心跳**:
```json
{
  "action": "ping"
}
```

**心跳响应**:
```json
{
  "type": "pong",
  "timestamp": "2025-11-30T15:30:05"
}
```

---

### 接收实时数据

#### 广播消息（所有连接客户端）
```json
{
  "type": "ecg_realtime_data",
  "deviceId": "ECG_001",
  "personId": "P001",
  "data": {
    "id": 12345,
    "deviceId": "ECG_001",
    "deviceName": "ECG监测仪-01",
    "personId": "P001",
    "personName": "张三",
    "ecgValue": 0.85,
    "heartRate": 75,
    "samplingRate": 250,
    "leadType": "Lead_I",
    "signalQuality": 95,
    "signalQualityStatus": "优秀",
    "timestamp": "2025-11-30T14:30:00.123456",
    "createdAt": "2025-11-30T14:30:01"
  },
  "timestamp": "2025-11-30T14:30:01"
}
```

#### 设备订阅消息
```json
{
  "type": "ecg_device_data",
  "deviceId": "ECG_001",
  "data": { /* ECGRealtimeDTO */ },
  "timestamp": "2025-11-30T14:30:01"
}
```

#### 人员订阅消息
```json
{
  "type": "ecg_person_data",
  "personId": "P001",
  "data": { /* ECGRealtimeDTO */ },
  "timestamp": "2025-11-30T14:30:01"
}
```

---

## 数据归档

系统会自动将超过24小时的实时数据归档到历史库：

- **触发时间**: 每天凌晨2点
- **归档条件**: 数据时间戳 < (当前时间 - 24小时)
- **批次大小**: 每批1000条
- **自动清理**: 归档后自动删除实时库数据

---

## 配置参数

在 `application.properties` 中配置：

```properties
# ECG归档配置
ecg.archive.retention-hours=24
ecg.archive.cron-expression=0 0 2 * * ?
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误或数据验证失败 |
| 500 | 服务器内部错误 |

---

## 前端集成示例

### REST API 调用
```javascript
// 上传ECG数据
const uploadECGData = async (data) => {
  const response = await fetch('/api/ecg/data/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// 查询设备实时数据
const getDeviceRealtimeData = async (deviceId) => {
  const response = await fetch(`/api/ecg/data/realtime/${deviceId}`);
  return response.json();
};

// 查询设备统计信息
const getDeviceStats = async (deviceId, start, end) => {
  const url = `/api/ecg/data/statistics/device/${deviceId}?start=${start}&end=${end}`;
  const response = await fetch(url);
  return response.json();
};
```

### WebSocket 连接
```javascript
// 建立WebSocket连接
const ws = new WebSocket('ws://localhost:8080/ws/ecg');

ws.onopen = () => {
  console.log('ECG WebSocket连接建立');
  
  // 订阅设备数据
  ws.send(JSON.stringify({
    action: 'subscribe',
    type: 'device',
    id: 'ECG_001'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'connection_established':
      console.log('连接确认:', message);
      break;
    case 'ecg_realtime_data':
      console.log('收到ECG数据:', message.data);
      updateChart(message.data);  // 更新图表
      break;
    case 'subscription_confirmation':
      console.log('订阅确认:', message);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket连接关闭');
};

// 心跳检测
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'ping' }));
  }
}, 30000);
```

---

**文档版本**: v1.0  
**最后更新**: 2025-11-30
