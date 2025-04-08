const Log = require('log');
const Properties = require("./properties");
const Types = require("../../shared/js/gametypes");
const Character = require("./character");

module.exports = Mob = Character.extend({
    init: function(id, kind, x, y) {
        this._super(id, "mob", kind, x, y);
        
        this.updateHitPoints();
        this.spawningX = x;
        this.spawningY = y;
        this.armorLevel = Properties.getArmorLevel(this.kind);
        this.weaponLevel = Properties.getWeaponLevel(this.kind);
        this.hatelist = [];
        this.respawnTimeout = null;
        this.returnTimeout = null;
        this.isDead = false;
    },
    
    destroy: function() {
        this.isDead = true;
        this.hatelist = [];
        this.clearTarget();
        this.updateHitPoints();
        this.resetPosition();
        
        this.handleRespawn();
    },
    
    receiveDamage: function(points, playerId) {
        this.hitPoints -= points;
    },
    
    hates: function(playerId) {
        return this.hatelist.some(obj => obj.id === playerId);
    },
    
    increaseHateFor: function(playerId, points) {
        const existingHate = this.hatelist.find(obj => obj.id === playerId);

        if (existingHate) {
            existingHate.hate += points;
        } else {
            this.hatelist.push({ id: playerId, hate: points });
        }

        if (this.returnTimeout) {
            clearTimeout(this.returnTimeout);
            this.returnTimeout = null;
        }
    },
    
    getHatedPlayerId: function(hateRank) {
        const sortedHatelist = this.hatelist.sort((a, b) => b.hate - a.hate);
        const size = this.hatelist.length;

        const rankIndex = hateRank && hateRank <= size ? size - hateRank : size - 1;
        const playerId = sortedHatelist[rankIndex]?.id;

        return playerId;
    },
    
    forgetPlayer: function(playerId, duration) {
        this.hatelist = this.hatelist.filter(obj => obj.id !== playerId);
        
        if (this.hatelist.length === 0) {
            this.returnToSpawningPosition(duration);
        }
    },
    
    forgetEveryone: function() {
        this.hatelist = [];
        this.returnToSpawningPosition(1);
    },
    
    drop: function(item) {
        if (item) {
            return new Messages.Drop(this, item);
        }
    },
    
    handleRespawn: function() {
        const delay = 30000;
        
        if (this.area && this.area instanceof MobArea) {
            this.area.respawnMob(this, delay);
        } else {
            if (this.area && this.area instanceof ChestArea) {
                this.area.removeFromArea(this);
            }

            setTimeout(() => {
                if (this.respawn_callback) {
                    this.respawn_callback();
                }
            }, delay);
        }
    },
    
    onRespawn: function(callback) {
        this.respawn_callback = callback;
    },
    
    resetPosition: function() {
        this.setPosition(this.spawningX, this.spawningY);
    },
    
    returnToSpawningPosition: function(waitDuration) {
        const delay = waitDuration || 4000;

        this.clearTarget();

        this.returnTimeout = setTimeout(() => {
            this.resetPosition();
            this.move(this.x, this.y);
        }, delay);
    },
    
    onMove: function(callback) {
        this.move_callback = callback;
    },
    
    move: function(x, y) {
        this.setPosition(x, y);
        if (this.move_callback) {
            this.move_callback(this);
        }
    },
    
    updateHitPoints: function() {
        this.resetHitPoints(Properties.getHitPoints(this.kind));
    },
    
    distanceToSpawningPoint: function(x, y) {
        return Utils.distanceTo(x, y, this.spawningX, this.spawningY);
    }
});
