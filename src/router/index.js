import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/overview'
    },
    {
      path: '/overview',
      name: 'Overview',
      component: () => import('../views/overview/index.vue')
    },
    {
      path: '/person',
      name: 'Person',
      component: () => import('../views/person/index.vue')
    },
    {
      path: '/device',
      name: 'Device',
      component: () => import('../views/device/index.vue')
    },
    {
      path: '/mapping',
      name: 'Mapping',
      component: () => import('../views/mapping/index.vue')
    },
    {
      path: '/realtime/vital',
      name: 'RealtimeVital',
      component: () => import('../views/realtime/vital.vue')
    },
    {
      path: '/realtime/posture',
      name: 'RealtimePosture',
      component: () => import('../views/realtime/posture.vue')
    },
    {
      path: '/realtime/ecg',
      name: 'RealtimeECG',
      component: () => import('../views/realtime/ecg.vue')
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('../views/history/index.vue')
    },
    {
      path: '/alert/fall',
      name: 'FallAlert',
      component: () => import('../views/alert/fallAlert.vue')
    }
  ]
})

export default router
