const fs = require('fs');
const metrics = require('./metrics');
const WebSocket = require('ws');
const WorldServer = require("./worldserver");
const Log = require('log');
const _ = require('underscore');

function main(config) {
    const server = new WebSocket.Server({ port: config.port });
    console.log("Server started on port", config.port);
    const metricsInstance = config.metrics_enabled ? new metrics(config) : null;
    const worlds = [];
    let lastTotalPlayers = 0;

    let LogInstance;
    switch (config.debug_level) {
        case "error":
            LogInstance = new Log(Log.error); break;
        case "debug":
            LogInstance = new Log(Log.debug); break;
        case "info":
            LogInstance = new Log(Log.info); break;
        default:
            LogInstance = new Log(Log.info); break;
    }

    console.info("Démarrage du serveur BrowserQuest...");

    server.on('connection', (ws) => {
        let world;
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(ws, world));
            }
        };

        if (metricsInstance) {
            metricsInstance.getOpenWorldCount((open_world_count) => {
                world = _.min(_.first(worlds, open_world_count), (w) => w.playerCount);
                connect();
            });
        } else {
            world = _.detect(worlds, (world) => world.playerCount < config.nb_players_per_world);
            world.updatePopulation();
            connect();
        }

        ws.on('message', (message) => {
            console.log('Received:', message);

            if (message === 'requestStatus') {
                const status = getWorldDistribution(worlds);  
                ws.send(JSON.stringify(status));  
            }
        });

        ws.on('error', (error) => {
            console.error("WebSocket error:", error);
        });

        ws.on('close', () => {
            console.info("Connection closed");
        });
    });

    const onPopulationChange = () => {
        metricsInstance.updatePlayerCounters(worlds, (totalPlayers) => {
            _.each(worlds, (world) => {
                if (world.playerCount !== totalPlayers) {
                    world.updatePopulation(totalPlayers);
                }
            });
        });
        metricsInstance.updateWorldDistribution(getWorldDistribution(worlds));
    };

    _.each(_.range(config.nb_worlds), (i) => {
        const world = new WorldServer('world' + (i + 1), config.nb_players_per_world, server);
        world.run(config.map_filepath);
        worlds.push(world);
        if (metricsInstance) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    });


    if (config.metrics_enabled) {
        metricsInstance.ready(() => {
            onPopulationChange();
        });
    }

    process.on('uncaughtException', (e) => {
        console.error('uncaughtException: ' + e);
    });
}

function getWorldDistribution(worlds) {
    return worlds.map((world) => world.playerCount);
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

const defaultConfigPath = './server/config.json';
let customConfigPath = './server/config_local.json';

process.argv.forEach((val, index) => {
    if (index === 2) {
        customConfigPath = val;
    }
});

getConfigFile(defaultConfigPath, (defaultConfig) => {
    getConfigFile(customConfigPath, (localConfig) => {
        if (localConfig) {
            main(localConfig);
        } else if (defaultConfig) {
            main(defaultConfig);
        } else {
            console.error("Problème de configuration lors du démarrage du serveur.");
            process.exit(1);
        }
    });
});
