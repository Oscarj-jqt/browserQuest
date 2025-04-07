import { readFile } from 'fs';
import Metrics from './metrics';


function main(config) {
    var WebSocket = require('ws'), 
        WorldServer = require("./worldserver"),
        Log = require('log'),
        _ = require('underscore'),
        server = new WebSocket.Server({ port: config.port }), 
        metrics = config.metrics_enabled ? new Metrics(config) : null,
        worlds = [],
        lastTotalPlayers = 0;

    switch(config.debug_level) {
        case "error":
            Log = new Log(Log.error); break;
        case "debug":
            Log = new Log(Log.debug); break;
        case "info":
            Log = new Log(Log.info); break;
    };
    
    Log.info("Démarrage du serveur BrowserQuest...");

    server.on('connection', function(ws) {
        var world, connect = function() {
            if(world) {
                world.connect_callback(new Player(ws, world));
            }
        };

        if(metrics) {
            metrics.getOpenWorldCount(function(open_world_count) {
                world = _.min(_.first(worlds, open_world_count), function(w) { return w.playerCount; });
                connect();
            });
        } else {
            world = _.detect(worlds, function(world) {
                return world.playerCount < config.nb_players_per_world;
            });
            world.updatePopulation();
            connect();
        }

        // ws.on('message', function(message) {
            
        // });

        ws.on('error', function(error) {
            Log.error("WebSocket error:", error);
        });

        ws.on('close', function() {
            Log.info("Connection closed");
        });
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
        var world = new WorldServer('world' + (i + 1), config.nb_players_per_world, server);
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
            onPopulationChange();
        });
    }

    process.on('uncaughtException', function (e) {
        Log.error('uncaughtException: ' + e);
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
    readFile(path, 'utf8', function(err, json_string) {
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

process.argv.forEach(function (val, index, array) {
    if(index === 2) {
        customConfigPath = val;
    }
});

getConfigFile(defaultConfigPath, function(defaultConfig) {
    getConfigFile(customConfigPath, function(localConfig) {
        if(localConfig) {
            main(localConfig);
        } else if(defaultConfig) {
            main(defaultConfig);
        } else {
            console.error("Server cannot start without any configuration file.");
            process.exit(1);
        }
    });
});
