const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const { Server } = require("socket.io");
const twilio = require("twilio");
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());

// //======Conncet with socket server property====
// const {Server} = require('socket.io');
// //====== Create socket object ====
// const io = new Server(server,{
//         cors: {
//           origin: "*",
//           methods: ["GET", "POST"],
//         }
// });

// // const io = require("socket.io")(server, {
// //     cors: {
// //       origin: "*",
// //       methods: ["GET", "POST"],
// //     },
// // });



// //====== Connect socket to client ====
// io.on('connection',(socket)=>{
//     console.log('New user connected');

//   setTimeout(()=>{
//    socket.send("Learning server to client")
// }, 10000)

//  socket.on('disconnect', function(){
//     console.log('New user disconnected');
//  })
//  })

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});


// connceted with client server
app.get('/', (req, res) => {
  res.send("MeetRoom server is running")
  // res.sendFile( --dirname + "/index.html")
})

server.listen(PORT, () => {
  console.log(`MeetRoom server is running on ${PORT}`);
});  