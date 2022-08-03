const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const { Server } = require("socket.io");
const twilio = require("twilio");
const { disconnect } = require("process");

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
app.use(cors());
require('dotenv').config();

// =============================
//          Socket IO         //
//==============================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

   // ======Create New Room=====
  socket.on("new-room", (data) => {
    newRoomHandler(data, socket);
  });

  // ======Join Room=====
  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  // ======Send Message=====
  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  // ======Disconnect=====
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });

   // ======Connection Signal=====
   socket.on("connect-signal", (data) => {
    signalingHandler(data, socket);
  });

   // ======Connection Initialize=====
   socket.on("connect-init", (data) => {
    initializeConnectionHandler(data, socket);
  });

});


// =============================
//          MongoDB           //
//==============================

// Connceted with client server
app.get('/', (req, res) => {
  res.send("MeetRoom server is running")
})

server.listen(PORT, () => {
  console.log(`MeetRoom server is running on ${PORT}`);
});  