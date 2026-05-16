import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = [
          "https://paas-1.vercel.app",
          "https://deployflow-web.onrender.com", 
          "https://bejewelled-griffin-055a6f.netlify.app",
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173"
        ];
        
        const isAllowed = !origin || 
                         allowedOrigins.includes(origin) || 
                         origin.endsWith('.vercel.app') || 
                         origin.endsWith('.onrender.com');

        if (isAllowed) {
          // IMPORTANT: If credentials is true, origin cannot be '*'
          // We must return the exact origin or the first allowed one
          callback(null, origin || allowedOrigins[0]);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    socket.on('join:deployment', (deploymentId) => {
      socket.join(`deployment:${deploymentId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
