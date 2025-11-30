<template>
  <div class="overview">
    <section class="hero">
      <div>
        <p class="eyebrow">概览中心</p>
        <h1>柔和渐变的全局健康雷达中枢</h1>
        <p class="lede">
          统一的视觉与交互语系贯穿概览、人员、设备、绑定、实时监测、历史数据与告警模块。
          通过卡片化与柔光阴影的布局，快速感知整体运行态势并进入下一步操作。
        </p>
        <div class="chips">
          <span class="chip">渐变主色</span>
          <span class="chip">卡片化</span>
          <span class="chip">柔光阴影</span>
          <span class="chip">高亮导航</span>
        </div>
      </div>
      <div class="glow"></div>
    </section>

    <section class="grid metrics">
      <div v-for="metric in metrics" :key="metric.title" class="card metric">
        <div class="metric-head">
          <span class="label">{{ metric.title }}</span>
          <span :class="['pill', metric.trend === 'up' ? 'positive' : 'negative']">{{ metric.delta }}</span>
        </div>
        <div class="metric-value">
          <span class="value">{{ metric.value }}</span>
          <span class="unit">{{ metric.unit }}</span>
        </div>
        <div class="meter">
          <div class="meter-fill" :style="{ width: `${metric.fill}%`, background: metric.tint }"></div>
        </div>
        <p class="meta">{{ metric.note }}</p>
      </div>
    </section>

    <section class="split">
      <div class="card large">
        <div class="section-head">
          <div>
            <p class="eyebrow">实时监测快照</p>
            <h3>最新检测与更新时间</h3>
          </div>
          <span class="pill subtle">最近更新 {{ lastUpdated }}</span>
        </div>
        <div class="sparkline">
          <div v-for="(bar, index) in sparkline" :key="index" class="bar" :style="{ height: `${bar}px` }"></div>
        </div>
        <div class="list">
          <div v-for="item in snapshots" :key="item.time" class="list-row">
            <div>
              <p class="strong">{{ item.title }}</p>
              <p class="muted">{{ item.detail }}</p>
            </div>
            <span class="pill subtle">{{ item.time }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="ghost">查看实时监测</button>
          <button class="primary">刷新数据</button>
        </div>
      </div>

      <div class="card large status">
        <div class="section-head">
          <div>
            <p class="eyebrow">设备与人员状态</p>
            <h3>在线/离线与活跃对象</h3>
          </div>
          <span class="pill positive">运行平稳</span>
        </div>
        <div class="status-grid">
          <div v-for="block in statusBlocks" :key="block.title" class="status-card" :style="{ background: block.background }">
            <p class="label">{{ block.title }}</p>
            <p class="status-value">{{ block.value }}</p>
            <p class="muted">{{ block.sub }}</p>
          </div>
        </div>
        <div class="list tight">
          <p class="eyebrow">Top 5 动态</p>
          <div v-for="item in topList" :key="item.name" class="list-row">
            <div>
              <p class="strong">{{ item.name }}</p>
              <p class="muted">{{ item.note }}</p>
            </div>
            <span :class="['pill', item.type === 'alert' ? 'negative' : 'subtle']">{{ item.tag }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="split">
      <div class="card large chart">
        <div class="section-head">
          <div>
            <p class="eyebrow">告警与历史趋势</p>
            <h3>近 24h 告警走势</h3>
          </div>
          <span class="pill subtle">面积图占位</span>
        </div>
        <div class="trend">
          <div class="trend-area"></div>
          <div class="trend-grid">
            <span v-for="hour in hours" :key="hour">{{ hour }}</span>
          </div>
        </div>
      </div>

      <div class="card large">
        <div class="section-head">
          <div>
            <p class="eyebrow">待处理告警</p>
            <h3>等级、来源与时间</h3>
          </div>
          <button class="ghost">查看全部</button>
        </div>
        <div class="list">
          <div v-for="alert in alerts" :key="alert.source" class="list-row">
            <span :class="['pill', alert.level === '高' ? 'negative' : 'warning']">{{ alert.level }}级</span>
            <div class="alert-body">
              <p class="strong">{{ alert.source }}</p>
              <p class="muted">{{ alert.time }}</p>
            </div>
            <button class="link">去处理</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card quick">
      <div class="section-head">
        <div>
          <p class="eyebrow">快捷入口</p>
          <h3>常用操作与导航</h3>
        </div>
      </div>
      <div class="chips">
        <button v-for="action in quickActions" :key="action.label" class="chip-button">
          <span>{{ action.label }}</span>
          <span class="muted">{{ action.note }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
const metrics = [
  {
    title: '今日监测人数',
    value: '1,248',
    unit: '人',
    delta: '+12.4% YoY',
    trend: 'up',
    fill: 78,
    tint: 'linear-gradient(90deg, #845ef7, #5ee9ff)',
    note: '较昨日提升，稳定覆盖主要人群。',
  },
  {
    title: '在线设备数',
    value: '132',
    unit: '台',
    delta: '+3.1%',
    trend: 'up',
    fill: 64,
    tint: 'linear-gradient(90deg, #5ee9ff, #4dabf7)',
    note: '在线率 91%，离线设备集中在南区机柜。',
  },
  {
    title: '活跃绑定数',
    value: '862',
    unit: '对',
    delta: '+1.6%',
    trend: 'up',
    fill: 54,
    tint: 'linear-gradient(90deg, #ffd666, #845ef7)',
    note: '人员与设备绑定保持平稳，新增 18 对。',
  },
  {
    title: '未处理告警',
    value: '7',
    unit: '条',
    delta: '-9.0%',
    trend: 'down',
    fill: 32,
    tint: 'linear-gradient(90deg, #ff6b6b, #ffd666)',
    note: '大部分为中低等级，持续跟进中。',
  },
];

const sparkline = [32, 24, 40, 26, 48, 34, 52, 30, 44, 28, 38, 46];

const snapshots = [
  { title: '心率 76 bpm · 血氧 98%', detail: '实时监测 - 北区工位 12', time: '09:30:12' },
  { title: '体表温度 36.6 ℃', detail: '设备 #A13 自动巡检', time: '09:29:50' },
  { title: '人员绑定同步', detail: '新增 3 人完成绑定校验', time: '09:27:18' },
];

const statusBlocks = [
  { title: '在线设备', value: '132', sub: '离线 12 台', background: 'linear-gradient(180deg, rgba(94, 233, 255, 0.32), rgba(132, 94, 247, 0.12))' },
  { title: '在岗人员', value: '842', sub: '离岗 38 人', background: 'linear-gradient(180deg, rgba(132, 94, 247, 0.22), rgba(255, 214, 102, 0.12))' },
  { title: '绑定完成率', value: '93%', sub: '今日新增 18 对', background: 'linear-gradient(180deg, rgba(255, 214, 102, 0.24), rgba(94, 233, 255, 0.14))' },
];

const topList = [
  { name: '设备 #302 心率异常', note: '自动降级为关注，待复核', tag: '待处理', type: 'alert' },
  { name: '人员 李晓 · 北区', note: '连续 3 次正常心率', tag: '稳定', type: 'info' },
  { name: '设备 #A13 维护完成', note: '已恢复在线监测', tag: '在线', type: 'info' },
  { name: '人员绑定同步完成', note: '3 人待确认', tag: '同步', type: 'info' },
  { name: '设备 #219 离线', note: '南区机柜网络波动', tag: '关注', type: 'alert' },
];

const hours = ['00', '04', '08', '12', '16', '20', '24'];

const alerts = [
  { level: '高', source: '设备 #302 心率异常', time: '09:24 · 来自实时监测' },
  { level: '中', source: '人员 张伟 绑定校验未通过', time: '09:12 · 来自绑定中心' },
  { level: '中', source: '设备 #219 离线超过 30 分钟', time: '08:58 · 来自设备监控' },
  { level: '低', source: '北区工位温度偏高', time: '08:40 · 来自环境巡检' },
];

const quickActions = [
  { label: '人员管理', note: '档案、分组与在岗状态' },
  { label: '设备管理', note: '在线/离线与维护' },
  { label: '人员雷达绑定', note: '绑定校验与同步' },
  { label: '实时监测', note: '最新检测与刷新' },
  { label: '历史数据', note: '趋势分析与导出' },
  { label: '告警处理', note: '等级筛选与闭环' },
];

const lastUpdated = '09:30:12';
</script>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  position: relative;
  padding: 26px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.15), rgba(94, 233, 255, 0.18));
  border-radius: 18px;
  overflow: hidden;
  color: var(--text-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.eyebrow {
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
  color: var(--text-soft);
  margin: 0 0 4px;
}

h1 {
  margin: 0 0 12px;
  font-size: 26px;
}

h3 {
  margin: 0;
}

.lede {
  margin: 0;
  color: var(--text-soft);
  max-width: 960px;
  line-height: 1.6;
}

.chips {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.chip {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: var(--text-strong);
  font-weight: 600;
}

.chip-button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: var(--text-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chip-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.chip-button .muted {
  text-align: left;
}

.glow {
  position: absolute;
  right: -40px;
  bottom: -60px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(94, 233, 255, 0.35), rgba(132, 94, 247, 0.15), transparent 65%);
  filter: blur(8px);
}

.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.metrics .card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.card h3 {
  margin: 0;
}

.card p {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.55;
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-weight: 600;
  color: var(--text-strong);
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-strong);
}

.unit {
  color: var(--text-soft);
}

.meter {
  width: 100%;
  height: 8px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 99px;
}

.meta {
  font-size: 13px;
  color: var(--text-soft);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 12px;
}

.pill.positive {
  background: rgba(94, 233, 255, 0.18);
  color: #0c8599;
}

.pill.negative {
  background: rgba(255, 107, 107, 0.16);
  color: #c92a2a;
}

.pill.warning {
  background: rgba(255, 214, 102, 0.24);
  color: #ad6800;
}

.pill.subtle {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-soft);
}

.split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.large {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sparkline {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  height: 120px;
  align-items: end;
}

.sparkline .bar {
  background: linear-gradient(180deg, rgba(132, 94, 247, 0.4), rgba(94, 233, 255, 0.65));
  border-radius: 8px 8px 4px 4px;
  box-shadow: 0 6px 16px rgba(94, 233, 255, 0.18);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list.tight {
  gap: 10px;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strong {
  color: var(--text-strong);
  margin: 0 0 2px;
}

.muted {
  color: var(--text-soft);
  font-size: 13px;
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  border: none;
  cursor: pointer;
  font-weight: 600;
}

button.primary {
  background: linear-gradient(135deg, #845ef7, #5ee9ff);
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(132, 94, 247, 0.25);
}

button.ghost {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-strong);
  padding: 10px 12px;
  border-radius: 12px;
}

button.link {
  background: transparent;
  color: #5b8def;
}

.status {
  gap: 16px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.status-card {
  padding: 12px;
  border-radius: 14px;
  color: var(--text-strong);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.status-value {
  font-size: 22px;
  font-weight: 700;
  margin: 6px 0 2px;
  color: var(--text-strong);
}

.chart .trend {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trend-area {
  height: 180px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(132, 94, 247, 0.28), rgba(94, 233, 255, 0.18));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  position: relative;
  overflow: hidden;
}

.trend-area::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.4), transparent 35%),
    radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.35), transparent 45%);
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  color: var(--text-soft);
  font-size: 12px;
}

.alert-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quick .chips {
  margin-top: 10px;
}

@media (max-width: 640px) {
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-row {
    align-items: flex-start;
  }
}
</style>
