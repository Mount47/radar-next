import { defineStore } from 'pinia'
import { login, logout, getInfo } from '@/api/core/user'
import { getToken, setToken, removeToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    name: '',
    avatar: ''
  }),

  getters: {
    isLoggedIn: (state) => !!state.token
  },

  actions: {
    // 登录
    login(userInfo) {
      const { username, password } = userInfo
      return new Promise((resolve, reject) => {
        login({ username: username.trim(), password: password }).then(response => {
          const { data } = response
          this.token = data.token
          setToken(data.token)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 获取用户信息
    getInfo() {
      return new Promise((resolve, reject) => {
        getInfo(this.token).then(response => {
          const { data } = response

          if (!data) {
            return reject('Verification failed, please Login again.')
          }

          const { name, avatar } = data

          this.name = name
          this.avatar = avatar
          resolve(data)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 登出
    logout() {
      return new Promise((resolve, reject) => {
        logout(this.token).then(() => {
          removeToken() // must remove  token  first
          this.token = ''
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 重置 Token
    resetToken() {
      return new Promise(resolve => {
        removeToken() // must remove  token  first
        this.token = ''
        resolve()
      })
    }
  }
})

