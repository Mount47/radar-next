<script setup>
import { RouterView } from 'vue-router'
import GlobalHeader from './components/GlobalHeader.vue'
</script>

<template>
  <div class="app-shell">
    <GlobalHeader />
    <main class="app-main">
      <div class="content-surface">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --primary-500: #845ef7;
  --primary-600: #734bd3;
  --primary-700: #5f3dc4;
  --accent-500: #5ee9ff;
  --accent-600: #35d1ff;
  --bg-soft: #f5f7fb;
  --panel: rgba(255, 255, 255, 0.92);
  --text-strong: #1f2937;
  --text-soft: #5b6475;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background: radial-gradient(circle at 10% 20%, rgba(132, 94, 247, 0.06), transparent 32%),
    radial-gradient(circle at 90% 10%, rgba(94, 233, 255, 0.08), transparent 30%),
    radial-gradient(circle at 50% 90%, rgba(132, 94, 247, 0.05), transparent 40%),
    var(--bg-soft);
}

.app-shell {
  min-height: 100vh;
  color: var(--text-strong);
}

.app-main {
  padding: 18px 24px 32px;
}

.content-surface {
  background: var(--panel);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.06);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.6);
}
</style>
