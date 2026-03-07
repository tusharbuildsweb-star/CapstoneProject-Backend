const { Server } = require('socket.io');

const initSocket = (server, app) => {
    const io = new Server(server, {
        cors: {
            origin: [
                'https://tablereservation1.netlify.app',
                'http://localhost:5173'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        // Room joining logic for specific restaurants or admin dashboards
        socket.on('joinRestaurant', (restaurantId) => {
            socket.join(`restaurant_${restaurantId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
        });
    });

    // Make io accessible globally so any controller can emit events
    app.set('io', io);
    global.io = io;

    return io;
};

module.exports = initSocket;
