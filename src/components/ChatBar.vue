<template>
  <mdui-card class="chat-bar">
    <mdui-card-content class="messages" :style="{ paddingTop: chatPaddingTop + 'px' }">
      <div v-for="(message, index) in messages" :key="message.id">
        <div>{{ message.sender }}: {{ message.content }}</div>
        <mdui-divider v-if="index < messages.length - 1" />
      </div>
    </mdui-card-content>
    <mdui-card-actions class="input-area">
      <mdui-text-field v-model="inputMessage" @keyup.enter="sendMessage" placeholder="输入消息" />
      <mdui-button-icon @click="sendMessage">
        <mdui-icon-send></mdui-icon-send>
      </mdui-button-icon>
    </mdui-card-actions>
  </mdui-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import io from 'socket.io-client'
import '@mdui/icons/send.js'

const socket = io('http://localhost:3000')

interface Message {
  id: string
  sender: string
  content: string
  menuOpen: boolean
}

let messages = ref<Message[]>([])
let inputMessage = ref('')
let chatPaddingTop = ref(20) // 可以根据需要调整这个值

onMounted(() => {
  socket.emit('getMessage')

  socket.on('messages', (serverMessages) => {
    messages.value = serverMessages.map((msg: Message) => ({ ...msg, menuOpen: false }))
  })

  socket.on('newMessage', (message) => {
    messages.value.push({ ...message, menuOpen: false })
  })
})

const sendMessage = () => {
  if (inputMessage.value.trim() === '') return
  socket.emit('sendMessage', { content: inputMessage.value, sender: 'User' }) // 替换 'User' 为实际的用户名
  inputMessage.value = ''
}
</script>

<style scoped>
.chat-bar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages {
  flex-grow: 1;
  overflow-y: auto;
}

.input-area {
  display: flex;
  padding: 8px;
}

.input-area mdui-text-field {
  flex-grow: 1;
  margin-right: 8px;
}
</style>
