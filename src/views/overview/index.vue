<template>
  <div class="overview">
    <section class="hero">
      <div>
        <p class="eyebrow">主题与配色</p>
        <h1>柔和渐变的全局健康雷达中枢</h1>
        <p class="lede">
          以淡紫与冰蓝的线性渐变为主色，搭配卡片化布局、圆角与柔光阴影，贯穿概览、人员、设备、绑定、监测、历史与告警各模块，统一视觉与交互语系。
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

    <section class="grid">
      <div class="card">
        <h3>全局导航</h3>
        <p>顶部栏覆盖 Logo、概览、人员、设备、人员雷达绑定、实时监测、历史数据、告警处理，并在右侧提供搜索、通知、头像，点击即跳转对应页面。</p>
      </div>
      <div class="card">
        <h3>信息分层</h3>
        <p>页面采用“上方概要 + 下方数据”结构，指标卡与列表/图表保持一致的圆角、留白与柔色描边。</p>
      </div>
      <div class="card">
        <h3>交互反馈</h3>
        <p>导航高亮、按钮悬停微动效、搜索与通知即时反馈，延续全局主题光感。</p>
      </div>
    </section>
  </div>
</template>

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

.lede {
  margin: 0;
  color: var(--text-soft);
  max-width: 840px;
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

.card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.card h3 {
  margin: 0 0 8px;
}

.card p {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.55;
}
</style>
