var yargs = require('yargs');
const Log = require('log');
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
    const ws = require("./ws"),
          WorldServer = require("./worldserver"),
          server = new ws.socketIOServer(config.host, config.port),
        metrics = config.metrics_enabled ? new Metrics(config) : null,
        worlds = [],
        lastTotalPlayers = 0;

    const checkPopulationInterval = setInterval(function () {
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

    const log = new Log(console.log);

    console.log("Starting BrowserQuest game server...");

    server.on('request', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
    }
)
    server.onConnect(function(connection) {
        let world;
        
        const connect = () => {
            if (world) {
                world.connect_callback(new Player(connection, world));
            }
        };

        if (metrics) {
            metrics.getOpenWorldCount(async (open_world_count) => {
                // Choose the least populated world among open worlds
                world = _.min(_.first(worlds, open_world_count), (w) => w.playerCount);
                connect();
            });
        } else {
            // Fill each world sequentially until they are full
            world = _.find(worlds, (world) => world.playerCount < config.nb_players_per_world);
            world.updatePopulation();
            connect();
        }
    });

    server.onError(function() {
        console.log(Array.prototype.join.call(arguments, ", "));
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

    // server.on('requestStatus', function () {
    //     return JSON.stringify(getWorldDistribution(worlds));
    // });

    if (config.metrics_enabled) {
        metrics.ready(function () {
            onPopulationChange();
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
            server.listen(port, '0.0.0.0');

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

