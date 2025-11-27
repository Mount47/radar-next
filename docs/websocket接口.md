R60ABD1 呼吸心跳数据 (实时)
WebSocket URL: ws://<host>:<port>/ws/r60abd1
用途: 接收 R60ABD1 传感器的实时呼吸、心跳、体动等数据。
消息格式 (Server -> Client):
{
  "type": "r60abd1_realtime",
  "deviceId": "R60ABD1_COM3",
  "personId": "PERSON_001",
  "timestamp": "2023-11-27T10:00:00.123",
  "data": {
    "id": 12345,
    "deviceId": "R60ABD1_COM3",
    "personId": "PERSON_001",
    "presence": 1,          // 0:无人, 1:有人
    "motion": 2,            // 运动等级
    "heartRate": 75.5,      // 心率
    "respiration": 18.2,    // 呼吸率
    "bodyMovement": 5,      // 体动参数 (0-100)
    "sleep": 0,             // 睡眠状态 (0:清醒, 1:浅睡, 2:深睡)
    "timestamp": "2023-11-27T10:00:00.123",
    "status": "active",
    "presenceStatus": "有人",
    "motionStatus": "静止",
    "sleepStatus": "清醒"
  }
}

TI6843 呼吸心跳数据 (实时)
WebSocket URL: ws://<host>:<port>/ws/ti6843-vital
用途: 接收 TI6843 传感器的实时呼吸、心跳数据。
消息格式 (Server -> Client):

{
  "type": "ti6843_vital_realtime",
  "deviceId": "TI6843_VITAL_01",
  "personId": "PERSON_002",
  "timestamp": "2023-11-27T10:00:00.123",
  "data": {
    "deviceId": "TI6843_VITAL_01",
    "personId": "PERSON_002",
    "time": 123.45,         // 相对时间戳
    "breathRate": 16.5,     // 呼吸率
    "heartRate": 72.0,      // 心率
    "status": "normal",
    "timestamp": "2023-11-27T10:00:00.123",
    "createdAt": "2023-11-27T10:00:00.123",
    "isPersonBound": true
  }
}

TI6843 人体位姿数据 (实时)
WebSocket URL: ws://<host>:<port>/ws/ti6843-posture
用途: 接收 TI6843 传感器的实时点云和关键点数据，用于位姿展示。
消息格式 (Server -> Client):

{
  "type": "ti6843_posture_data",
  "timestamp": "2023-11-27 10:00:00",
  "data": {
    "id": 67890,
    "deviceId": "TI6843_POSTURE_01",
    "personId": "PERSON_003",
    "pointClouds": [        // 点云数组
      {"x": 1.2, "y": 0.5, "z": 1.8, "doppler": 0.1, "noise": 0.05},
      {"x": 1.3, "y": 0.6, "z": 1.7, "doppler": 0.2, "noise": 0.06}
    ],
    "keypoints": [          // 关键点数组 (如果有)
      {"id": 0, "x": 1.2, "y": 0.5, "z": 1.8, "confidence": 0.9}
    ],
    "postureState": "standing", // standing, sitting, lying, fall
    "timestamp": "2023-11-27T10:00:00.123"
  }
}

跌倒警报 (实时)
WebSocket URL: ws://<host>:<port>/ws/fall-alert
用途: 接收实时的跌倒检测警报。
消息格式 (Server -> Client):
类型 1: 新警报
{
  "type": "fall_alert",
  "timestamp": "2023-11-27 10:00:00",
  "data": {
    "id": 101,
    "deviceId": "TI6843_POSTURE_01",
    "personId": "PERSON_003",
    "personName": "张三",
    "alertTime": "2023-11-27T10:00:00",
    "alertStatus": "new",   // new, confirmed, false_alarm, resolved
    "confidence": 0.95,
    "location": "卧室"
  }
}

类型 2: 警报状态更新

{
  "type": "alert_status_update",
  "timestamp": "2023-11-27 10:05:00",
  "data": {
    "id": 101,
    "alertStatus": "resolved",
    // ...其他字段同上
  }
}

生命体征异常警报 (实时)
WebSocket URL: ws://<host>:<port>/ws/vitals-alert
用途: 接收心率过高/过低、呼吸异常等警报。
消息格式 (Server -> Client):

{
  "type": "vitals_alert",
  "timestamp": "2023-11-27T10:00:00.123",
  "data": {
    "id": 202,
    "deviceId": "R60ABD1_COM3",
    "personId": "PERSON_001",
    "alertType": "HEART_RATE_HIGH", // HEART_RATE_HIGH, BREATH_RATE_LOW 等
    "value": 130.0,
    "threshold": 120.0,
    "message": "心率过高: 130.0 bpm",
    "severity": "high",     // high, medium, low
    "timestamp": "2023-11-27T10:00:00.123"
  }
}

6. 设备状态通知
WebSocket URL: ws://<host>:<port>/ws/device-status
用途: 接收设备上线、下线及状态变更通知。
消息格式 (Server -> Client):
类型 1: 状态变更

{
  "type": "device_status_change",
  "deviceId": "R60ABD1_COM3",
  "oldStatus": "offline",
  "newStatus": "online",
  "timestamp": "2023-11-27T10:00:00.123",
  "message": "设备 R60ABD1_COM3 状态从 offline 变更为 online"
}

类型 2: 上下线通知

{
  "type": "device_online_status",
  "deviceId": "R60ABD1_COM3",
  "isOnline": true,
  "status": "online",
  "timestamp": "2023-11-27T10:00:00.123",
  "message": "设备 R60ABD1_COM3 设备上线"
}