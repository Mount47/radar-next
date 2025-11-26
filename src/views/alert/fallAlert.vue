<template>
  <div class="alert-page">
    <header class="hero">
      <div>
        <p class="eyebrow">告警处理</p>
        <h1>告警闭环与实时联动</h1>
        <p class="lede">统一的柔和渐变风格呈现告警流，支持跨模块跳转与处理反馈。</p>
      </div>
      <div class="status">处理中 · 响应 SLA 保障</div>
    </header>
    <section class="panel">
      <h3>设计要点</h3>
      <ul>
        <li>顶部导航入口统一，便于从实时监测/历史数据快速回到告警处理。</li>
        <li>列表与时间线使用圆角卡片与悬停高亮，操作按钮采用胶囊形态。</li>
        <li>右侧抽屉展示关联人员、设备、处理记录，保持与全局主题一致。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.alert-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  padding: 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.12), rgba(255, 158, 126, 0.16));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 12px;
  color: var(--text-soft);
  margin: 0 0 4px;
}

h1 {
  margin: 0 0 10px;
  font-size: 24px;
}

.lede {
  margin: 0;
  color: var(--text-soft);
  max-width: 760px;
  line-height: 1.6;
}

.status {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.6);
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
}

.panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
}

.panel h3 {
  margin: 0 0 10px;
}

.panel ul {
  margin: 0;
  padding-left: 20px;
  color: var(--text-soft);
  line-height: 1.6;
}
</style>
