<template>
  <div class="chat-bar mdui-theme-auto">
    <div class="messages mdui-theme-auto" ref="messagesContainer">
      <div v-for="message in messages" :key="message.id" class="message-wrapper">
        <mdui-dropdown trigger="contextmenu" :disabled="!isAdmin">
          <mdui-card class="message-card mdui-theme-auto" slot="trigger">
            <div class="message-bubble" :class="{ 'admin-message': message.isAdmin }">
              <div class="message-sender">
                <strong>{{ message.isAdmin ? '[Admin] ' : '' }}{{ message.sender }}:</strong>
              </div>
              <div class="message-content">
                {{ message.content }}
              </div>
            </div>
          </mdui-card>
          <mdui-menu v-if="isAdmin">
            <mdui-menu-item @click="muteUser(message)">禁言用户</mdui-menu-item>
            <mdui-menu-item @click="openBanDialog(message)">封禁用户</mdui-menu-item>
          </mdui-menu>
        </mdui-dropdown>
      </div>
    </div>
    <div class="input-area">
      <mdui-text-field v-model="inputMessage" @keyup.enter="sendMessage" placeholder="输入消息" />
      <mdui-button-icon @click="sendMessage">
        <mdui-icon-send></mdui-icon-send>
      </mdui-button-icon>
    </div>
  </div>

  <mdui-snackbar
    :open="snackbarOpen"
    @close="closeSnackbar"
    close-on-outside-click
    class="mdui-theme-auto"
    closeable
    @close-click="refreshConnection"
  >
    {{ snackbarMessage }}
  </mdui-snackbar>
  <mdui-dialog
    :open="banDialogOpen"
    headline="封禁用户"
    description="请输入封禁理由"
    close-on-overlay-click
  >
    <mdui-text-field v-model="banReason" placeholder="封禁理由"></mdui-text-field>
    <mdui-button class="mdui-float-right" @click="banUser">确认封禁</mdui-button>
  </mdui-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import io, { Socket } from 'socket.io-client'
import '@mdui/icons/send.js'
import '@mdui/icons/refresh.js'
import 'mdui/components/dropdown.js'
import logoutBus, { appLogoutBus } from '@/utils/mitt'
import { loginBus } from '@/utils/mitt'
import { alert } from 'mdui/functions/alert.js'

interface Message {
  id: string
  sender: string
  content: string
  isAdmin: boolean
  userStatus: string
}

interface ServerResponse {
  success: boolean
  message: string
}

interface BanUserResponse {
  success: boolean
  username: string
  reason: string
}

let socket: Socket

const initSocket = () => {
  socket = io('http://192.168.1.2:3000')

  socket.on('connect', () => {
    showSnackbar('连接成功')
    getMessages()
  })

  socket.on('connect_error', () => {
    showSnackbar('连接失败')
  })

  socket.on('messages', (serverMessages: Message[]) => {
    messages.value = serverMessages
    scrollToBottom()
  })

  socket.on('newMessage', (message: Message) => {
    messages.value.push(message)
    scrollToBottom()
  })

  socket.on('muteUserResponse', (response: ServerResponse) => {
    if (response.success) {
      showSnackbar(`已禁言用户 ${response.message} 5分钟`)
    } else {
      showSnackbar(`禁言用户失败: ${response.message}`)
    }
  })

  socket.on('banUserResponse', (response: BanUserResponse) => {
    const user = getCookie('user')
    console.log(response)
    if (response.username == user) {
      alert({
        headline: '你被封禁啦!',
        description: '原因: ' + response.reason,
        confirmText: '啊???'
      })
      appLogoutBus.emit('logoutUser', user)
    }
  })
}

let messages = ref<Message[]>([])
let inputMessage = ref('')
let snackbarOpen = ref(false)
let snackbarMessage = ref('')
let isAdmin = ref(false)
const banDialogOpen = ref(false)
const banReason = ref('')
let userToBan = ref('')

const openBanDialog = (message: Message) => {
  userToBan.value = message.sender
  banDialogOpen.value = true
}

const banUser = () => {
  const user = getCookie('user')
  if (socket) {
    socket.emit(
      'banUser',
      { username: userToBan.value, reason: banReason.value, executor: user },
      (response: ServerResponse) => {
        if (response.success) {
          showSnackbar('用户已被封禁')
        } else {
          showSnackbar(response.message || '封禁用户失败')
        }
      }
    )
  }
  banDialogOpen.value = false
  banReason.value = ''
}
const messagesContainer = ref<HTMLElement | null>(null)

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
}

const checkAdminStatus = () => {
  const user = getCookie('user')
  if (user && socket) {
    socket.emit('checkAdminStatus', { username: user }, (response: { isAdmin: boolean }) => {
      isAdmin.value = response.isAdmin
      console.log('Admin status:', isAdmin.value)
    })
  } else {
    isAdmin.value = false
  }
}

watch(
  () => getCookie('user'),
  (newUser, oldUser) => {
    if (newUser !== oldUser) {
      checkAdminStatus()
    }
  },
  { immediate: true }
)

onMounted(() => {
  initSocket()
  checkAdminStatus()
})

const getMessages = () => {
  if (socket) {
    socket.emit('getMessage', (response: ServerResponse) => {
      console.log(response)
      if (!response.success) {
        alert({
          headline: '你好像被封禁啦!',
          description: '后端发现你的IP已经被封了,所以你也看不到信息,知道了吗?',
          confirmText: '好吧.......'
        })
      }
    })
  }
}

const sendMessage = () => {
  if (inputMessage.value.trim() === '') return
  const user = getCookie('user')
  if (!user) {
    showSnackbar('请先登录')
    return
  }
  if (socket) {
    socket.emit(
      'sendMessage',
      { content: inputMessage.value, sender: user },
      (response: ServerResponse) => {
        if (response.success) {
          inputMessage.value = ''
          scrollToBottom()
        } else {
          showSnackbar(response.message || '发送失败')
        }
      }
    )
  }
}

const muteUser = (message: Message) => {
  const user = getCookie('user')
  if (isAdmin.value && socket && user) {
    socket.emit(
      'muteUser',
      { username: message.sender, duration: 5, executor: user },
      (response: ServerResponse) => {
        if (response.success) {
          showSnackbar(`已禁言用户 ${message.sender} 5分钟`)
        } else {
          showSnackbar(`禁言用户失败: ${response.message}`)
        }
      }
    )
  }
}

const showSnackbar = (message: string) => {
  snackbarMessage.value = message
  snackbarOpen.value = true
}

const closeSnackbar = () => {
  snackbarOpen.value = false
}

const refreshConnection = () => {
  if (socket) {
    socket.disconnect()
  }
  initSocket()
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

logoutBus.on('logoutUser', () => {
  checkAdminStatus()
})

loginBus.on('loginUser', (username: String) => {
  socket.emit('loginUser', { username }, (response: ServerResponse) => {
    if (response.success) {
      showSnackbar('登录成功')
    } else {
      showSnackbar(response.message || '登录失败')
      appLogoutBus.emit('logoutUser', username)
    }
  })
  checkAdminStatus()
})
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
  padding: 16px;
  -webkit-overflow-scrolling: touch; /* 为 iOS 设备添加惯性滚动 */
}

.input-area {
  display: flex;
  padding: 8px;
}

.input-area mdui-text-field {
  flex-grow: 1;
  margin-right: 8px;
}

.message-wrapper {
  margin-bottom: 16px;
}

.message-card {
  flex-grow: 1;
  overflow-y: auto;
}

.message-bubble {
  background-color: rgba(208, 188, 255, 0.171);
  color: var(--mdui-color-on-surface);
  border-radius: 18px;
  padding: 8px;
  display: inline-block;
}

.message-sender {
  margin-bottom: 4px;
}

.message-content {
  white-space: pre-wrap; /* 或者使用 word-break: break-word; */
}

.admin-message {
  background-color: rgba(91, 192, 222, 0.3);
  color: var(--mdui-color-on-surface);
}

/* 暗黑模式下的消息配色 */
@media (prefers-color-scheme: dark) {
  .message-bubble {
    background-color: #909daa;
    color: var(--mdui-color-on-surface);
  }

  .admin-message {
    background-color: rgba(91, 192, 222, 0.5);
    color: var(--mdui-color-on-surface);
  }
}
</style>
