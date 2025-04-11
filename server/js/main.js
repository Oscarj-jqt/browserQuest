var yargs = require('yargs');
const net = require('net');
var config = require('../config.json');
var fs = require('fs'),
    Metrics = require('./metrics');
const WebSocket = require('ws');  
const util = require('util');
const readFile = util.promisify(fs.readFile);
const path = require('path');
const configPath = path.resolve(__dirname, '../config.json');

function main(config) {
    var WorldServer = require("./worldserver"),
        _ = require('underscore'),
        server = new WebSocket.Server({ port: config.port }), 
        metrics = config.metrics_enabled ? new Metrics(config) : null,
        worlds = [],
        lastTotalPlayers = 0;

    // Utilisation de console pour les messages de log
    console.info("Starting BrowserQuest game server...");

    // Mise à jour de la population des mondes
    var checkPopulationInterval = setInterval(function () {
        if (metrics && metrics.isReady) {
            metrics.getTotalPlayers(function (totalPlayers) {
                if (totalPlayers !== lastTotalPlayers) {
                    lastTotalPlayers = totalPlayers;
                    _.each(worlds, function (world) {
                        world.updatePopulation(totalPlayers);
                    });
                }
            });
        }
    }, 1000);

    // Correction ici : utilisation de 'connection' au lieu de 'onConnect'
    server.on('connection', function (connection) {
        var world, // Le monde dans lequel le joueur sera placé
            connect = function () {
                if (world) {
                    world.connect_callback(new Player(connection, world));
                }
            };

        if (metrics) {
            metrics.getOpenWorldCount(function (open_world_count) {
                // Choisir le monde le moins peuplé parmi les mondes ouverts
                world = _.min(_.first(worlds, open_world_count), function (w) {
                    return w.playerCount;
                });
                connect();
            });
        } else {
            // Remplir chaque monde séquentiellement jusqu'à ce qu'il soit plein
            world = _.detect(worlds, function (world) {
                return world.playerCount < config.nb_players_per_world;
            });
            world.updatePopulation();
            connect();
        }
    });

    server.on('error', function () {
        console.error("Error: " + Array.prototype.join.call(arguments, ", "));
    });

    var onPopulationChange = function () {
        metrics.updatePlayerCounters(worlds, function (totalPlayers) {
            _.each(worlds, function (world) {
                world.updatePopulation(totalPlayers);
            });
        });
        metrics.updateWorldDistribution(getWorldDistribution(worlds));
    };

    _.each(_.range(config.nb_worlds), function (i) {
        var world = new WorldServer('world' + (i + 1), config.nb_players_per_world, server);
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
        metrics.ready(function () {
            onPopulationChange(); // Initialiser tous les compteurs à 0 au démarrage du serveur
        });
    }

    process.on('uncaughtException', function (e) {
        console.error('uncaughtException: ' + e);
    });
}

function getWorldDistribution(worlds) {
    var distribution = [];

    _.each(worlds, function (world) {
        distribution.push(world.playerCount);
    });
    return distribution;
}

function getConfigFile(path, callback) {
    fs.readFile(path, 'utf8', function (err, json_string) {
        if (err) {
            console.error("Could not open config file:", err.path);
            callback(null);
        } else {
            callback(JSON.parse(json_string));
        }
    });
}

    const argv = yargs
    .option('port', {
        alias: 'p',
        description: 'Port sur lequel écouter',
        type: 'number'
    })
    .argv;

if (argv._.includes('--port') || argv._.includes('-p')) {
    console.log("Le paramètre '--port' est un argument de configuration, pas un fichier.");
    process.exit(1);
}

function findAvailablePort(start = 8000, end = 8004) {
    return new Promise((resolve) => {
        const tryPort = (port) => {
            if (port > end) return resolve(null);

            const server = net.createServer();
            server.once('error', () => tryPort(port + 1));
            server.once('listening', () => {
                server.close(() => resolve(port));
            });
            server.listen(port, 'localhost');
        };
        tryPort(start);
    });
}


getConfigFile(configPath, async function (localConfig) {
    let configToUse = localConfig;

    if (!configToUse) {
        console.error("Server cannot start without any configuration file.");
        process.exit(1);
    }

    if (argv.port) {
        configToUse.port = argv.port;
        main(configToUse);
    } else {
        const availablePort = await findAvailablePort(8000, 8004);
        if (!availablePort) {
            console.error("Aucun port disponible entre 8000 et 8004.");
            process.exit(1);
        }
        configToUse.port = availablePort;
        console.log(`Port disponible détecté : ${availablePort}`);
        main(configToUse);
    }
});
