var yargs = require('yargs');
const net = require('net');
var config = require('../config.json');
var fs = require('fs'),
    Metrics = require('./metrics');
 

function main(config) {
    var ws = require("./ws"),
        WorldServer = require("./worldserver"),
        Log = require('log'),
        _ = require('underscore'),
        server = new ws.socketIOServer(config.host, config.port),
        metrics = config.metrics_enabled ? new Metrics(config) : null;
        worlds = [],
        lastTotalPlayers = 0,
        checkPopulationInterval = setInterval(function() {
            if(metrics && metrics.isReady) {
                metrics.getTotalPlayers(function(totalPlayers) {
                    if(totalPlayers !== lastTotalPlayers) {
                        lastTotalPlayers = totalPlayers;
                        _.each(worlds, function(world) {
                            world.updatePopulation(totalPlayers);
                        });
                    }
                });
            }
        }, 1000);
    
    switch(config.debug_level) {
        case "error":
            log = new Log(console.log); break;
        case "debug":
            log = new Log(console.log); break;
        case "info":
            log = new Log(console.log); break;
    };
    
    console.log("Starting BrowserQuest game server...");
    
    server.onConnect(function(connection) {
        var world, // the one in which the player will be spawned
            connect = function() {
                if(world) {
                    world.connect_callback(new Player(connection, world));
                }
            };
        
        if(metrics) {
            metrics.getOpenWorldCount(function(open_world_count) {
                // choose the least populated world among open worlds
                world = _.min(_.first(worlds, open_world_count), function(w) { return w.playerCount; });
                connect();
            });
        }
        else {
            // simply fill each world sequentially until they are full
            world = _.detect(worlds, function(world) {
                return world.playerCount < config.nb_players_per_world;
            });
            world.updatePopulation();
            connect();
        }
    });

    server.onError(function() {
        console.log(Array.prototype.join.call(arguments, ", "));
    });
    
    var onPopulationChange = function() {
        metrics.updatePlayerCounters(worlds, function(totalPlayers) {
            _.each(worlds, function(world) {
                world.updatePopulation(totalPlayers);
            });
        });
        metrics.updateWorldDistribution(getWorldDistribution(worlds));
    };

    _.each(_.range(config.nb_worlds), function(i) {
        var world = new WorldServer('world'+ (i+1), config.nb_players_per_world, server);
        world.run(config.map_filepath);
        worlds.push(world);
        if(metrics) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    });
    
    server.onRequestStatus(function() {
        return JSON.stringify(getWorldDistribution(worlds));
    });
    
    if(config.metrics_enabled) {
        metrics.ready(function() {
            onPopulationChange(); // initialize all counters to 0 when the server starts
        });
    }
    
    process.on('uncaughtException', function (e) {
        console.log('uncaughtException: ' + e);
    });
}

function getWorldDistribution(worlds) {
    var distribution = [];
    
    _.each(worlds, function(world) {
        distribution.push(world.playerCount);
    });
    return distribution;
}

function getConfigFile(path, callback) {
    fs.readFile(path, 'utf8', function(err, json_string) {
        if(err) {
            console.error("Could not open config file:", err.path);
            callback(null);
        } else {
            callback(JSON.parse(json_string));
        }
    });
}

var defaultConfigPath = './server/config.json',
    customConfigPath = './server/config_local.json';

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


getConfigFile(defaultConfigPath, function (defaultConfig) {
    getConfigFile(customConfigPath, async function (localConfig) {
        let configToUse = defaultConfig || localConfig;

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
});