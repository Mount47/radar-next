<template>
  <div class="history">
    <header class="hero">
      <div>
        <p class="eyebrow">历史数据</p>
        <h1>跨模块一致的记录与追溯界面</h1>
        <p class="lede">
          通过统一配色、卡片布局与悬停动效，历史数据页可承载生命体征回放、设备事件与告警闭环记录，与实时监测及告警处理形成视觉一致的体验。
        </p>
      </div>
      <div class="pillars">
        <span class="pill">时间线</span>
        <span class="pill">过滤器</span>
        <span class="pill">导出</span>
      </div>
    </header>

    <section class="panel">
      <h3>设计要点</h3>
      <ul>
        <li>顶部筛选条对齐全局风格，使用圆角输入框和渐变主按钮。</li>
        <li>数据列表/图表置于柔色卡片内，行悬停高亮，支持批量操作。</li>
        <li>详情抽屉沿用导航色阶，展示指标、关联人员/设备与处理记录。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  padding: 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.12), rgba(94, 233, 255, 0.16));
  position: relative;
  overflow: hidden;
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
  max-width: 820px;
  line-height: 1.6;
}

.pillars {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.pill {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.6);
  font-weight: 600;
  color: var(--text-strong);
}

.panel {
  background: rgba(255, 255, 255, 0.9);
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
