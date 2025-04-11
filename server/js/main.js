var fs = require('fs'),
    Metrics = require('./metrics');
const WebSocket = require('ws');  // Importation correcte de WebSocket

function main(config) {
    var WorldServer = require("./worldserver"),
        _ = require('underscore'),
        server = new WebSocket.Server({ port: config.port }),  // Utilisation de WebSocket.Server
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

var configPaths = ['./server/config.json'];

configPaths.forEach(function (configPath) {
    getConfigFile(configPath, function (config) {
        if (config) {
            main(config);
        } else {
            console.error(`Failed to load configuration from ${configPath}`);
        }
    });
});
