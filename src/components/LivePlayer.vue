<template>
  <div ref="playerContainer" class="player"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DPlayer from 'dplayer'

let playerContainer = ref(null)

onMounted(() => {
  const dp = new DPlayer({
    container: playerContainer.value,
    live: true,
    video: {
      url: 'http://example.com/live/stream.flv', // 更新为实际的直播流 URL
      pic: '/nosource.jpg',
      type: 'flv'
    },
    danmaku: {
      id: 'chat-bar',
      api: 'http://192.168.1.2:3000/api/', // 更新为实际的地址
      maximum: 1000,
      user: 'DPlayer',
      bottom: '15%',
      unlimited: true
    }
  })
})
</script>

<style scoped>
.player {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
}
</style>
