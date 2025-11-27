<template>
  <div class="historical-ecg-page">
    <!-- 搜索条件区域 -->
    <div class="search-section">
      <div class="search-card">
        <h3 class="section-title">
          <el-icon><Search /></el-icon>
          搜索条件
        </h3>
        
        <div class="search-form">
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">人员姓名</label>
              <el-select
                v-model="searchForm.personId"
                placeholder="请选择人员"
                clearable
                filterable
                class="form-input"
                disabled
              >
                <el-option label="功能开发中" value="" />
              </el-select>
            </div>
            
            <div class="form-item">
              <label class="form-label">人员ID</label>
              <el-input
                v-model="searchForm.personIdInput"
                placeholder="请输入人员ID"
                clearable
                class="form-input"
                disabled
              />
            </div>
            
            <div class="form-item">
              <label class="form-label">设备ID</label>
              <el-input
                v-model="searchForm.deviceId"
                placeholder="请输入设备ID"
                clearable
                class="form-input"
                disabled
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item time-picker-item">
              <label class="form-label">时间范围</label>
              <el-date-picker
                v-model="searchForm.timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                class="form-input"
                disabled
              />
            </div>
          </div>
          
          <div class="form-actions">
            <el-button type="primary" disabled>
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button disabled>
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 占位内容区域 -->
    <div class="placeholder-section">
      <div class="placeholder-card">
        <div class="placeholder-icon">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <h2 class="placeholder-title">心电历史数据</h2>
        <p class="placeholder-description">
          心电（ECG）历史数据查询与分析功能正在开发中
        </p>
        
        <div class="feature-preview">
          <h3 class="feature-title">即将推出的功能</h3>
          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="feature-content">
                <h4>心电波形展示</h4>
                <p>实时显示和回放历史心电波形数据</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><PieChart /></el-icon>
              </div>
              <div class="feature-content">
                <h4>心率变异性分析</h4>
                <p>HRV分析、频域分析等高级心电指标</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="feature-content">
                <h4>异常检测</h4>
                <p>自动识别心律失常、早搏等异常情况</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="feature-content">
                <h4>报告导出</h4>
                <p>生成专业的心电分析报告（PDF/Excel）</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="feature-content">
                <h4>时间段分析</h4>
                <p>按小时、天、周、月查看心电数据趋势</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon><Histogram /></el-icon>
              </div>
              <div class="feature-content">
                <h4>统计图表</h4>
                <p>心率分布、心电质量评估等可视化图表</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="placeholder-footer">
          <el-tag type="info" effect="plain" size="large">
            <el-icon><Clock /></el-icon>
            功能开发中，敬请期待
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 示例预览区域 -->
    <div class="preview-section">
      <div class="preview-card">
        <h3 class="section-title">
          <el-icon><View /></el-icon>
          功能预览
        </h3>
        
        <div class="preview-grid">
          <div class="preview-item">
            <div class="preview-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>心电波形</span>
            </div>
            <div class="preview-content ecg-preview">
              <svg viewBox="0 0 400 100" class="ecg-svg">
                <path
                  d="M 0 50 L 40 50 L 45 45 L 50 55 L 55 45 L 65 50 L 80 50 L 85 20 L 90 80 L 95 50 L 110 50 L 115 48 L 120 52 L 125 48 L 135 50 L 150 50 L 155 45 L 160 55 L 165 45 L 175 50 L 190 50 L 195 20 L 200 80 L 205 50 L 220 50 L 225 48 L 230 52 L 235 48 L 245 50 L 260 50 L 265 45 L 270 55 L 275 45 L 285 50 L 300 50 L 305 20 L 310 80 L 315 50 L 330 50 L 335 48 L 340 52 L 345 48 L 355 50 L 370 50 L 400 50"
                  stroke="#F56C6C"
                  stroke-width="2"
                  fill="none"
                />
              </svg>
              <div class="preview-label">标准心电图波形示例</div>
            </div>
          </div>
          
          <div class="preview-item">
            <div class="preview-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </div>
            <div class="preview-content stats-preview">
              <div class="stat-demo">
                <div class="stat-demo-label">平均心率</div>
                <div class="stat-demo-value">72 <span class="unit">bpm</span></div>
              </div>
              <div class="stat-demo">
                <div class="stat-demo-label">心率变异性</div>
                <div class="stat-demo-value">45 <span class="unit">ms</span></div>
              </div>
              <div class="stat-demo">
                <div class="stat-demo-label">数据质量</div>
                <div class="stat-demo-value">92 <span class="unit">%</span></div>
              </div>
            </div>
          </div>
          
          <div class="preview-item">
            <div class="preview-header">
              <el-icon><Warning /></el-icon>
              <span>异常告警</span>
            </div>
            <div class="preview-content alert-preview">
              <div class="alert-demo">
                <el-tag type="success" effect="light">正常心律</el-tag>
                <el-tag type="warning" effect="light">轻微心律不齐</el-tag>
                <el-tag type="danger" effect="light">严重异常</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { Search, RefreshLeft, DataAnalysis, PieChart, Warning, Document, Clock, Histogram, View } from '@element-plus/icons-vue'

// 搜索表单（占位）
const searchForm = reactive({
  personId: '',
  personIdInput: '',
  deviceId: '',
  timeRange: []
})
</script>

<style scoped>
.historical-ecg-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fb 0%, #e8ebf3 100%);
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
}

.search-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  opacity: 0.6;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-picker-item {
  grid-column: span 2;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.form-input {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 占位内容区域 */
.placeholder-section {
  margin-bottom: 24px;
}

.placeholder-card {
  background: linear-gradient(135deg, #fff 0%, #f9fafb 100%);
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.placeholder-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.1), rgba(94, 233, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  color: var(--primary-500);
  box-shadow: 0 8px 32px rgba(132, 94, 247, 0.2);
}

.placeholder-title {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 16px;
}

.placeholder-description {
  font-size: 16px;
  color: #606266;
  margin-bottom: 48px;
  line-height: 1.6;
}

.feature-preview {
  max-width: 1000px;
  margin: 0 auto 40px;
  text-align: left;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 24px;
  text-align: center;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.feature-item {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.1), rgba(94, 233, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--primary-500);
  flex-shrink: 0;
}

.feature-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.feature-content p {
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.placeholder-footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* 预览区域 */
.preview-section {
  margin-bottom: 24px;
}

.preview-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.preview-item {
  background: linear-gradient(135deg, #f9fafb 0%, #fff 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
}

.preview-header .el-icon {
  font-size: 20px;
  color: var(--primary-500);
}

.preview-content {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ecg-preview {
  background: linear-gradient(to bottom, #fafafa 0%, #fff 100%);
}

.ecg-svg {
  width: 100%;
  height: 100px;
  margin-bottom: 12px;
}

.preview-label {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.stats-preview {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.stat-demo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(132, 94, 247, 0.05), rgba(94, 233, 255, 0.05));
  border-radius: 8px;
}

.stat-demo-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stat-demo-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-demo-value .unit {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
  margin-left: 4px;
}

.alert-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.alert-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-demo .el-tag {
  width: 100%;
  justify-content: center;
  padding: 12px;
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 768px) {
  .placeholder-card {
    padding: 40px 20px;
  }
  
  .placeholder-icon {
    width: 80px;
    height: 80px;
    font-size: 40px;
  }
  
  .placeholder-title {
    font-size: 24px;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .time-picker-item {
    grid-column: span 1;
  }
}
</style>

