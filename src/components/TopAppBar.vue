<template>
  <div style="position: relative; overflow: hidden">
    <mdui-top-app-bar>
      <mdui-top-app-bar-title>XiaoLive</mdui-top-app-bar-title>
      <mdui-spacer></mdui-spacer>
      <mdui-button @click="openDialog">登录</mdui-button>
    </mdui-top-app-bar>

    <mdui-dialog
      headline="登录"
      description="您可以通过XiaoAuth登录XiaoLive来观看直播哦!"
      close-on-overlay-click
      :open="dialogOpen"
      @close="closeDialog"
    >
      <mdui-button class="mdui-float-right" @click="redirectToOAuth">通过XiaoAuth登录</mdui-button>
    </mdui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import 'mdui/mdui.css'
import 'mdui/components/dialog.js'

import '@mdui/icons/more-vert.js'
import '@mdui/icons/menu.js'

let dialogOpen = ref(false)

const openDialog = () => {
  dialogOpen.value = true
}

const closeDialog = () => {
  dialogOpen.value = false
}

const redirectToOAuth = () => {
  // 这里添加跳转到第三方 OAuth2 的代码
}
</script>

<style scoped>
mdui-top-app-bar-title {
  margin-left: 20px;
}
mdui-top-app-bar {
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
}
</style>
