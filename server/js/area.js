const cls = require('./lib/class');
const Utils = require('./utils');
const Types = require('../../shared/js/gametypes');
const Mob = require('./mob');


module.exports = Area = cls.Class.extend({
    init: function(id, x, y, width, height, world) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.world = world;
        this.entities = [];
        this.hasCompletelyRespawned = true;
    },
    
    _getRandomPositionInsideArea: function() {
        let pos = {};
        let valid = false;
        
        while(!valid) {
            pos.x = this.x + Utils.random(this.width + 1);
            pos.y = this.y + Utils.random(this.height + 1);
            valid = this.world.isValidPosition(pos.x, pos.y);
        }
        return pos;
    },
    
    removeFromArea: function (entity) {
        const index = this.entities.findIndex(e => e.id === entity.id);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }

        if (this.isEmpty() && this.hasCompletelyRespawned && this.empty_callback) {
            this.hasCompletelyRespawned = false;
            this.empty_callback();
        }
    },
    
    addToArea: function (entity) {
        if (entity) {
            this.entities.push(entity);
            entity.area = this;
            if (entity instanceof Mob) {
                this.world.addMob(entity);
            }
        }

        if (this.isFull()) {
            this.hasCompletelyRespawned = true;
        }
    },
    
    setNumberOfEntities: function(nb) {
        this.nbEntities = nb;
    },
    
    isEmpty: function () {
        return !this.entities.some(entity => !entity.isDead);
    },
    
    isFull: function () {
        return !this.isEmpty() && (this.nbEntities === this.entities.length);
    },

    
    onEmpty: function (callback) {
        this.empty_callback = callback;
    }
});
