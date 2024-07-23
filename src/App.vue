<template>
  <mdui-layout class="mdui-theme-auto layout">
    <mdui-layout-header class="mdui-theme-auto">
      <TopAppBar />
    </mdui-layout-header>
    <mdui-layout-main class="main-content mdui-theme-auto">
      <div class="live-container mdui-theme-auto">
        <div class="player-container mdui-theme-auto">
          <LivePlayer />
        </div>
        <div class="chat-container mdui-theme-auto">
          <ChatBar />
        </div>
      </div>
    </mdui-layout-main>
  </mdui-layout>
</template>

<script setup lang="ts">
import TopAppBar from './components/TopAppBar.vue'
import { setColorScheme } from 'mdui/functions/setColorScheme.js'
import ChatBar from './components/ChatBar.vue'
import LivePlayer from './components/LivePlayer.vue'
import 'mdui/mdui.css'
import 'mdui'

setColorScheme('#5cabff')
</script>

<style scoped>
.main-content {
  height: calc(100vh - 64px);
  overflow: hidden;
}

.live-container {
  display: flex;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.player-container {
  flex: 1;
  min-width: 0;
  margin-right: 20px;
}

.chat-container {
  width: 300px;
}

@media (max-width: 959px) {
  .live-container {
    flex-direction: column;
    padding: 10px;
  }

  .player-container {
    margin-right: 0;
    margin-bottom: 10px;
  }

  .chat-container {
    width: 100%;
    flex: 1;
  }
}
</style>
