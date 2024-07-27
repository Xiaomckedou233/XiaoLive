import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use(cors());

// 配置
interface Config {
  storageType: "memory" | "database";
  databaseUrl: string;
  adminToken: string;
  streamUrl: string;
}

// 接口定义
interface BanUserResponse {
  username: string;
  reason: string;
  executor: string;
}

interface ServerResponse {
  success: boolean;
  message: string;
}

const config: Config = {
  storageType: (process.env.STORAGE_TYPE as "memory" | "database") || "memory",
  databaseUrl: process.env.DATABASE_URL || "mongodb://localhost/livechat",
  adminToken: process.env.ADMIN_TOKEN || "your-secret-admin-token",
  streamUrl: process.env.STREAM_URL || "http://example.com/live/stream.flv",
};

// 接口定义
interface IMessage {
  id: string;
  content: string;
  sender: string;
  isAdmin: boolean;
  time: string | null;
  timestamp: Date;
  color: string | null;
  type: string | null;
}

interface IUser {
  username: string;
  isAdmin: boolean;
  mutedUntil: Date | null;
  ip: string;
  bannedReason: string | null;
}

// 数据库模型
const MessageSchema = new mongoose.Schema<IMessage>({
  id: String,
  content: String,
  sender: String,
  isAdmin: Boolean,
  time: String,
  timestamp: Date,
  color: String,
  type: String,
});

const UserSchema = new mongoose.Schema<IUser>({
  username: String,
  isAdmin: Boolean,
  mutedUntil: Date,
  ip: String,
});

const Message = mongoose.model<IMessage>("Message", MessageSchema);
const User = mongoose.model<IUser>("User", UserSchema);

// 内存存储
let memoryMessages: IMessage[] = [];
let memoryUsers: IUser[] = [];

// 存储接口
const storage = {
  async getMessages(limit: number = 20, before?: Date): Promise<IMessage[]> {
    let query = before ? { timestamp: { $lt: before } } : {};
    if (config.storageType === "database") {
      return await Message.find(query).sort("-timestamp").limit(limit);
    } else {
      let filteredMessages = before
        ? memoryMessages.filter((m) => m.timestamp < before)
        : memoryMessages;
      return filteredMessages.slice(-limit).reverse();
    }
  },

  async saveMessage(message: IMessage): Promise<IMessage> {
    if (config.storageType === "database") {
      const newMessage = new Message(message);
      await newMessage.save();
      return newMessage;
    } else {
      memoryMessages.push(message);
      return message;
    }
  },

  async getUser(username: string): Promise<IUser | null> {
    if (config.storageType === "database") {
      return await User.findOne({ username });
    } else {
      return memoryUsers.find((u) => u.username === username) || null;
    }
  },

  async saveUser(user: IUser): Promise<IUser> {
    if (config.storageType === "database") {
      const newUser = new User(user);
      await newUser.save();
      return newUser;
    } else {
      const existingUserIndex = memoryUsers.findIndex(
        (u) => u.username === user.username
      );
      if (existingUserIndex !== -1) {
        memoryUsers[existingUserIndex] = {
          ...memoryUsers[existingUserIndex],
          ...user,
        };
        return memoryUsers[existingUserIndex];
      } else {
        memoryUsers.push(user);
        return user;
      }
    }
  },

  async getUserByIp(ip: string): Promise<IUser | null> {
    if (config.storageType === "database") {
      return await User.findOne({ ip });
    } else {
      const user = memoryUsers.find((u) => u.ip === ip) || null;
      // console.log("通过IP找用户:" + user?.username);
      return user;
    }
  },

  async addAdmin(username: string, ip: string): Promise<IUser> {
    const user: IUser = {
      username,
      isAdmin: true,
      mutedUntil: null,
      ip,
      bannedReason: null,
    };

    if (config.storageType === "database") {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        existingUser.isAdmin = true;
        existingUser.ip = ip;
        await existingUser.save();
        return existingUser;
      } else {
        const newUser = new User(user);
        await newUser.save();
        return newUser;
      }
    } else {
      const existingUserIndex = memoryUsers.findIndex(
        (u) => u.username === username
      );
      if (existingUserIndex !== -1) {
        memoryUsers[existingUserIndex] = {
          ...memoryUsers[existingUserIndex],
          ...user,
        };
        return memoryUsers[existingUserIndex];
      } else {
        memoryUsers.push(user);
        return user;
      }
    }
  },

  async banUser(username: string, reason: string): Promise<IUser | null> {
    const user = await this.getUser(username);
    if (user) {
      user.bannedReason = reason;
      return await this.saveUser(user);
    }
    return null;
  },

  async checkBan(
    ip: string
  ): Promise<{ banned: boolean; reason: string | null }> {
    const user = await this.getUserByIp(ip);
    if (user && user.bannedReason) {
      return { banned: true, reason: user.bannedReason };
    }
    return { banned: false, reason: null };
  },
};

// 初始化存储
async function initializeStorage(): Promise<void> {
  if (config.storageType === "database") {
    await mongoose.connect(config.databaseUrl);
    console.log("Connected to database");
  } else {
    console.log("Using in-memory storage");
  }
}

// Danmaku  GET API
app.get("/api/v3/", async (req, res) => {
  try {
    const messages = await storage.getMessages(1000); // Limit to 1000 messages for danmaku
    const danmakuMessages = messages
      .filter((msg) => msg.time !== null)
      .map((msg) => ({
        text: msg.content,
        color: msg.color || "16777215",
        type: msg.type || "0",
        time: msg.time,
      }));
    res.json({
      code: 0,
      data: danmakuMessages,
    });
  } catch (error) {
    res.status(500).json({ code: 1, msg: "Failed to fetch danmaku messages" });
  }
});

// Danmaku POST API
app.post("/api/v3", async (req, res) => {
  try {
    const ip: string = req.ip as string;
    const userByIp = await storage.getUserByIp(ip);
    const { id, author, time, text, color, type } = req.body;
    const message: IMessage = {
      id,
      sender: userByIp ? userByIp.username : author,
      content: text,
      color,
      type,
      time,
      timestamp: new Date(),
      isAdmin: userByIp?.isAdmin || false,
    };

    await storage.saveMessage(message);

    // Emit the new message to all connected clients
    io.emit("newMessage", message);

    res.json({ code: 0, data: { message: "Danmaku sent successfully" } });
  } catch (error) {
    res.status(500).json({ code: 1, msg: "Failed to send danmaku" });
  }
});

//Admin API
app.post("/api/addAdmin", async (req, res) => {
  const { token, username } = req.body;
  const ip = req.ip;

  if (token !== config.adminToken) {
    return res.status(403).json({ error: "Invalid token" });
  }

  try {
    const admin = await storage.addAdmin(username, ip || "");
    res.json({ success: true, message: "Admin added successfully", admin });
  } catch (error) {
    res.status(500).json({ error: "Failed to add admin" });
  }
});

app.post("/api/unbanUser", async (req, res) => {
  const { token, username } = req.body;

  if (token !== config.adminToken) {
    return res.status(403).json({ error: "Invalid token" });
  }

  try {
    const user = await storage.getUser(username);
    if (user) {
      user.bannedReason = null;
      await storage.saveUser(user);
      res.json({ success: true, message: "User unbanned successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to unban user" });
  }
});

// app.get("/api/stream-config", async (req, res) => {
//   res.json({ url: config.streamUrl });
// });

io.on("connection", (socket) => {
  console.log("New client connected IP:" + socket.handshake.address);

  socket.emit("connect_success", { message: "连接成功" });

  socket.on("getMessage", async (data: { before?: string }, callback) => {
    try {
      const ip = socket.handshake.address;
      const banStatus = await storage.checkBan(ip);

      if (banStatus.banned) {
        callback({
          success: false,
          message: "你已被封禁",
        });
        return;
      }

      const before = data.before ? new Date(data.before) : undefined;
      const messages = await storage.getMessages(20, before);
      socket.emit("messages", messages);
      callback({ success: true, message: "Messages retrieved successfully" });
    } catch (error) {
      console.error("Failed to get messages:", error);
      callback({ success: false, message: "Failed to retrieve messages" });
    }
  });

  socket.on(
    "sendMessage",
    async (
      data: { content: string; sender: string; color: string; type: string },
      callback
    ) => {
      try {
        const user = await storage.getUser(data.sender);
        if (user && user.bannedReason) {
          callback({ success: false, message: "你已被封禁" });
          return;
        }

        if (user && user.mutedUntil && user.mutedUntil > new Date()) {
          callback({ success: false, message: "你已被禁言" });
          return;
        }

        const message = await storage.saveMessage({
          id: Date.now().toString(),
          content: data.content,
          sender: data.sender,
          time: null,
          timestamp: new Date(),
          isAdmin: user ? user.isAdmin : false,
          color: data.color,
          type: data.type,
        });

        io.emit("newMessage", message);
        callback({ success: true, message: "Message sent successfully" });
      } catch (error) {
        callback({ success: false, message: "Failed to send message" });
      }
    }
  );

  socket.on(
    "muteUser",
    async (
      data: { executor: string; username: string; duration: number },
      callback
    ) => {
      const admin = await storage.getUser(data.executor);
      if (!admin || !admin.isAdmin) {
        callback({ success: false, message: "未认证" });
        return;
      }

      const user = await storage.getUser(data.username);
      if (user) {
        user.mutedUntil = new Date(
          Date.now() + data.duration * 10 * 365 * 24 * 60 * 60 * 1000
        );
        await storage.saveUser(user);
        callback({ success: true, message: "User muted successfully" });
      } else {
        callback({ success: false, message: "User not found" });
      }
    }
  );

  socket.on(
    "checkAdminStatus",
    async (data: { username: string }, callback) => {
      try {
        const user = await storage.getUser(data.username);
        const ip = socket.handshake.address;
        const userByIp = await storage.getUserByIp(ip);

        if (user && userByIp && user.username === userByIp.username) {
          callback({ isAdmin: user.isAdmin });
        } else {
          callback({ isAdmin: false });
        }
      } catch (error) {
        callback({ isAdmin: false });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("loginUser", async (data: { username: string }, callback) => {
    const username = data.username;
    const ip = socket.handshake.address;
    const banStatus = await storage.checkBan(ip);

    if (banStatus.banned) {
      callback({
        success: false,
        message: "你已被封禁",
      });
      return;
    }

    const existingUser = await storage.getUser(username);
    if (existingUser) {
      if (existingUser.bannedReason) {
        callback({
          success: false,
          message: "你已被封禁",
        });
        return;
      }

      if (existingUser.ip && existingUser.ip !== ip) {
        callback({
          success: false,
          message: "用户名已被其他IP使用",
        });
        return;
      }
      existingUser.ip = ip;
      await storage.saveUser(existingUser);
    } else {
      const newUser: IUser = {
        username,
        isAdmin: false,
        mutedUntil: null,
        ip,
        bannedReason: null,
      };
      await storage.saveUser(newUser);
    }
    callback({ success: true, message: "User logged in successfully" });
  });

  socket.on("banUser", async (data: BanUserResponse, callback) => {
    try {
      const admin = await storage.getUser(data.executor);
      if (!admin || !admin.isAdmin) {
        callback({ success: false, message: "未认证" });
        return;
      }

      const bannedUser = await storage.banUser(data.username, data.reason);
      const mutedUser = await storage.getUser(data.username);
      if (bannedUser) {
        io.emit("banUserResponse", {
          success: true,
          username: data.username,
          reason: data.reason,
          // executor: data.executor,
        });
        callback({
          success: true,
          message: "User banned successfully",
        });
      } else {
        callback({
          success: false,
          message: "User not found",
        });
      }
    } catch (error) {
      console.error("Error banning user:", error);
      callback({ success: false, message: "Failed to ban user" });
    }
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeStorage();
    server.listen(PORT, () =>
      console.log(
        `高いパフォーマンス! XiaoLive server listening on port ${PORT} `
      )
    );
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();
