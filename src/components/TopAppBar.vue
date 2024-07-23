<template>
  <div style="position: relative; overflow: hidden" class="mdui-theme-auto">
    <mdui-top-app-bar>
      <mdui-top-app-bar-title>XiaoLive</mdui-top-app-bar-title>
      <mdui-spacer></mdui-spacer>
      <mdui-button v-if="!user" @click="openDialog">登录</mdui-button>
      <mdui-dropdown v-else>
        <mdui-avatar slot="trigger">{{ user.charAt(0).toUpperCase() }}</mdui-avatar>
        <mdui-menu>
          <mdui-menu-item disabled>{{ user }}</mdui-menu-item>
          <mdui-menu-item @click="logout">退出登录</mdui-menu-item>
        </mdui-menu>
      </mdui-dropdown>
    </mdui-top-app-bar>

    <mdui-dialog
      headline="登录"
      description="请输入您的用户名"
      close-on-overlay-click
      :open="dialogOpen"
      @close="closeDialog"
    >
      <mdui-text-field
        v-model="username"
        placeholder="用户名"
        @keyup.enter="login"
      ></mdui-text-field>
      <mdui-button class="mdui-float-right" @click="login">登录</mdui-button>
    </mdui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import 'mdui/mdui.css'
import 'mdui/components/dialog.js'
import 'mdui/components/avatar.js'
import 'mdui/components/dropdown.js'

import '@mdui/icons/more-vert.js'
import '@mdui/icons/menu.js'
import logoutBus, { appLogoutBus } from '@/utils/mitt'
import { loginBus } from '@/utils/mitt'

let dialogOpen = ref(false)
let username = ref('')
let user = ref('')

const openDialog = () => {
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
}

const login = () => {
  if (username.value.trim() !== '') {
    user.value = username.value
    console.log(username.value)
    document.cookie = `user=${username.value}; path=/; max-age=2592000;` // 30 days
    loginBus.emit('loginUser', username.value)
    closeDialog()
  }
}

const logout = () => {
  user.value = ''
  console.log(username.value)
  logoutBus.emit('logoutUser', username.value)
  document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
}

onMounted(() => {
  const cookies = document.cookie.split(';')
  const userCookie = cookies.find((cookie) => cookie.trim().startsWith('user='))
  if (userCookie) {
    user.value = userCookie.split('=')[1]
  }
})

appLogoutBus.on('logoutUser', () => {
  logout()
})
</script>

<style scoped>
mdui-top-app-bar-title {
  margin-left: 20px;
}
mdui-top-app-bar {
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
}
</style>
