// 全局错误提示控制
let errorShown = false
let errorTimer = null

export const showGlobalError = (vm, message, duration = 5000) => {
  if (!errorShown) {
    vm.$message.error(message)
    errorShown = true

    // 清除之前的定时器
    if (errorTimer) {
      clearTimeout(errorTimer)
    }

    // 设置新的定时器，在指定时间后允许再次显示错误
    errorTimer = setTimeout(() => {
      errorShown = false
    }, duration)
  }
}

export const resetErrorState = () => {
  errorShown = false
  if (errorTimer) {
    clearTimeout(errorTimer)
    errorTimer = null
  }
}
