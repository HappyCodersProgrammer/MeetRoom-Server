const express = require("express");
require('dotenv').config();
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const { Server } = require("socket.io");
const twilio = require("twilio");
const { disconnect } = require("process");

const { MongoClient, ServerApiVersion } = require('mongodb');

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());


// =============================
//          Socket IO         //
//==============================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// =======Inisitialize=======
let connectedUsers = [];
let rooms = [];

// ========create route to check if room exists=======
app.get("/api/room-exists/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.find((room) => room.id === roomId);

  if (room) {
    // send reponse that room exists
    if (room.connectedUsers.length > 3) {
      return res.send({ roomExists: true, full: true });
    } else {
      return res.send({ roomExists: true, full: false });
    }
  } else {
    // send response that room does not exists
    return res.send({ roomExists: false });
  }
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

//===========socket.io handlers===========

const createNewRoomHandler = (data, socket) => {
  console.log("host is creating new room");
  console.log(data);
  const { identity, onlyAudio } = data;

  const roomId = uuidv4();

  // create new user
  const newUser = {
    identity,
    id: uuidv4(),
    socketId: socket.id,
    roomId,
    onlyAudio,
  };

  // push that user to connectedUsers
  connectedUsers = [...connectedUsers, newUser];

  //create new room
  const newRoom = {
    id: roomId,
    connectedUsers: [newUser],
  };
  // join socket.io room
  socket.join(roomId);

  rooms = [...rooms, newRoom];

  // emit to that client which created that room roomId
  socket.emit("room-id", { roomId });

  // emit an event to all users connected
  // to that room about new users which are right in this room
  socket.emit("room-update", { connectedUsers: newRoom.connectedUsers });
};

const joinRoomHandler = (data, socket) => {
  const { identity, roomId, onlyAudio } = data;

  const newUser = {
    identity,
    id: uuidv4(),
    socketId: socket.id,
    roomId,
    onlyAudio,
  };

  // join room as user which just is trying to join room passing room id
  const room = rooms.find((room) => room.id === roomId);
  room.connectedUsers = [...room.connectedUsers, newUser];

  // join socket.io room
  socket.join(roomId);

  // add new user to connected users array
  connectedUsers = [...connectedUsers, newUser];

  // emit to all users which are already in this room to prepare peer connection
  room.connectedUsers.forEach((user) => {
    if (user.socketId !== socket.id) {
      const data = {
        connUserSocketId: socket.id,
      };

      io.to(user.socketId).emit("conn-prepare", data);
    }
  });

  io.to(roomId).emit("room-update", { connectedUsers: room.connectedUsers });
};

const disconnectHandler = (socket) => {
  // find if user has been registered - if yes remove him from room and connected users array
  const user = connectedUsers.find((user) => user.socketId === socket.id);

  if (user) {
    // remove user from room in server
    const room = rooms.find((room) => room.id === user.roomId);

    room.connectedUsers = room.connectedUsers.filter(
      (user) => user.socketId !== socket.id
    );

    // leave socket io room
    socket.leave(user.roomId);

    // close the room if amount of the users which will stay in room will be 0
    if (room.connectedUsers.length > 0) {
      // emit to all users which are still in the room that user disconnected
      io.to(room.id).emit("user-disconnected", { socketId: socket.id });

      // emit an event to rest of the users which left in the toom new connectedUsers in room
      io.to(room.id).emit("room-update", {
        connectedUsers: room.connectedUsers,
      });
    } else {
      rooms = rooms.filter((r) => r.id !== room.id);
    }
  }
};

const signalingHandler = (data, socket) => {
  const { connUserSocketId, signal } = data;

  const signalingData = { signal, connUserSocketId: socket.id };
  io.to(connUserSocketId).emit("connect-signal", signalingData);
};

// information from clients which are already in room that They have preapred for incoming connection
const initializeConnectionHandler = (data, socket) => {
  const { connUserSocketId } = data;

  const initData = { connUserSocketId: socket.id };
  io.to(connUserSocketId).emit("connect-init", initData);
};



// =============================
//          MongoDB           //
//==============================

const uri = "mongodb+srv://meetroom:meetroom12345@cluster0.cgs9b.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// ======Main Function ========
async function run () {
  try {
    client.connect();
    console.log('Connected Successfuly');
    const scheduleCollection = client.db('MeetRoom').collection('meeting-slots');

    app.post('/schedule', async (req, res) => {
      const newProduct = req.body;
      const result = await scheduleCollection.insertOne(newProduct);
      res.send(result);
    });



    app.get('/schedule', async (req, res) => {
      const query = {};
      const cursor = scheduleCollection.find(query);
      const products = await cursor.toArray();
      res.send(products)
    });
  }
  finally{}
}
run().catch(console.dir);


// Connceted with client server
app.get('/', (req, res) => {
  res.send("MeetRoom server is running")
})

server.listen(PORT, () => {
  console.log(`MeetRoom server is running on ${PORT}`);
});  