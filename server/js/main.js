const fs = require('fs');
const WebSocket = require('ws');
const Metrics = require('./metrics');
const _ = require('underscore');

// 🔐 Antiflood : suivi des connexions
const connectionAttempts = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    if (!connectionAttempts.has(ip)) {
        connectionAttempts.set(ip, []);
    }

    const recentAttempts = connectionAttempts.get(ip).filter(t => now - t < 15 * 60 * 1000);
    connectionAttempts.set(ip, recentAttempts);

    if (recentAttempts.length >= 100) {
        return true;
    }

    connectionAttempts.get(ip).push(now);
    return false;
}

function main(config) {
    const WorldServer = require("./worldserver");
    const Player = require("./player");

    const server = new WebSocket.Server({ port: config.port });
    const metrics = config.metrics_enabled ? new Metrics(config) : null;
    const worlds = [];
    let lastTotalPlayers = 0;

    console.info("🚀 Starting BrowserQuest game server on port " + config.port + "...");

    const checkPopulationInterval = setInterval(() => {
        if (metrics && metrics.isReady) {
            metrics.getTotalPlayers((totalPlayers) => {
                if (totalPlayers !== lastTotalPlayers) {
                    lastTotalPlayers = totalPlayers;
                    worlds.forEach(world => {
                        world.updatePopulation(totalPlayers);
                    });
                }
            });
        }
    }, 1000);

    server.on('connection', function (connection, req) {
        const ip = req.socket.remoteAddress;
        console.log(`[${new Date().toISOString()}] ➕ Connexion depuis ${ip}`);

        if (isRateLimited(ip)) {
            console.warn(`⛔ IP ${ip} bloquée pour flood de connexions.`);
            connection.close(4001, 'Trop de connexions. Réessaie plus tard.');
            return;
        }

        let world;
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(connection, world));
            }
        };

        if (metrics) {
            metrics.getOpenWorldCount((open_world_count) => {
                world = _.min(_.first(worlds, open_world_count), w => w.playerCount);
                connect();
            });
        } else {
            world = _.detect(worlds, world => world.playerCount < config.nb_players_per_world);
            world.updatePopulation();
            connect();
        }
    });

    server.on('error', function () {
        console.error("❌ Error: " + Array.prototype.join.call(arguments, ", "));
    });

    const onPopulationChange = function () {
        metrics.updatePlayerCounters(worlds, function (totalPlayers) {
            worlds.forEach(world => {
                world.updatePopulation(totalPlayers);
            });
        });
        metrics.updateWorldDistribution(getWorldDistribution(worlds));
    };

    _.range(config.nb_worlds).forEach(i => {
        const world = new WorldServer('world' + (i + 1), config.nb_players_per_world, server);
        world.run(config.map_filepath);
        worlds.push(world);

        if (metrics) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    });

    server.on('requestStatus', function () {
        return JSON.stringify(getWorldDistribution(worlds));
    });

    if (config.metrics_enabled) {
        metrics.ready(() => {
            onPopulationChange(); // Init counters
        });
    }

    process.on('uncaughtException', function (e) {
        console.error('⚠️ uncaughtException:', e);
    });
}

function getWorldDistribution(worlds) {
    return worlds.map(world => world.playerCount);
}

function getConfigFile(path, callback) {
    fs.readFile(path, 'utf8', (err, json_string) => {
        if (err) {
            console.error("Could not open config file:", err.path);
            callback(null);
        } else {
            callback(JSON.parse(json_string));
        }
    });
}

// 📦 Charger la config et démarrer
const configPath = './server/config.json';
getConfigFile(configPath, function (config) {
    if (config) {
        main(config);
    } else {
        console.error(`Failed to load configuration from ${configPath}`);
    }
});
