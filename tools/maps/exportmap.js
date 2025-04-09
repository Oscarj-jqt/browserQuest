#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const util = require('util');
const Log = require('log');
const processMap = require('./processmap');

const log = new Log(Log.DEBUG);
    
const source = process.argv[2];
const destination = process.argv[3];
const mode = process.argv[4] || 'server';

if (!source || !destination) {
    console.log("Usage : ./exportmap.js map_file json_file [mode]");
    console.log("Optional parameter : mode. Values: \"server\" (default) or \"client\".");
    process.exit(0);
}

async function main() {
    try {
        const json = await getTiledJSONmap(source);
        const options = { mode };
        const map = processMap(json, options);
        const jsonMap = JSON.stringify(map);

        if (mode === "client") {
            await saveMapToFile(destination + ".json", jsonMap);
            await saveMapToFile(destination + ".js", `var mapData = ${jsonMap}`);
        } else {
            await saveMapToFile(destination, jsonMap);
        }

    } catch (error) {
        log.error(error);
        process.exit(1);
    }
}

// Loads the temporary JSON Tiled map converted by tmx2json.py
function getTiledJSONmap(filename) {
    return new Promise((resolve, reject) => {
        fs.promises.access(filename)
            .then(() => fs.promises.readFile(filename, 'utf-8'))
            .then(fileContent => resolve(JSON.parse(fileContent)))
            .catch(() => reject(`${filename} doesn't exist.`));
    });
}

// Save the processed map to the file system
function saveMapToFile(filename, data) {
    return fs.promises.writeFile(filename, data)
        .then(() => {
            log.info(`Finished processing map file: ${filename} was saved.`);
        })
        .catch(err => {
            log.error(`Error saving map file: ${err}`);
        });
}
main();