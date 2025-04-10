const net = require('net');

const servers = [
    { host: 'localhost', port: 8000 },
    { host: 'localhost', port: 8001 },
    { host: 'localhost', port: 8002 },
    { host: 'localhost', port: 8003 },
    { host: 'localhost', port: 8004 },
];

function checkServerAvailability(server) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000); 

        socket.on('connect', () => {
            console.log(`Serveur disponible : ${server.host}:${server.port}`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`Timeout sur ${server.host}:${server.port}`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            console.log(`Serveur indisponible : ${server.host}:${server.port}`);
            resolve(false);
        });

        socket.connect(server.port, server.host);
    });
}

async function failover() {
    console.log("Vérification des serveurs...");
    for (const server of servers) {
        const isAvailable = await checkServerAvailability(server);
        if (isAvailable) {
            console.log(`Redirection possible vers ${server.host}:${server.port}`);
            return;
        }
    }
    console.log("Aucun serveur disponible !");
}

setInterval(failover, 5000);
