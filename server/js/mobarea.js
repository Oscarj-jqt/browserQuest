const Area = require('./area');
const Types = require("../../shared/js/gametypes");

module.exports = MobArea = Area.extend({
    init: function(id, nb, kind, x, y, width, height, world) {
        this._super(id, x, y, width, height, world);
        this.nb = nb;
        this.kind = kind;
        this.respawns = [];
        this.setNumberOfEntities(this.nb);
    },
    
    spawnMobs: function() {
        for (let i = 0; i < this.nb; i++) {
            this.addToArea(this._createMobInsideArea());
        }
    },
    
    _createMobInsideArea: function() {
        const k = Types.getKindFromString(this.kind);
        const pos = this._getRandomPositionInsideArea();
        const mob = new Mob('1' + this.id + '' + k + '' + this.entities.length, k, pos.x, pos.y);

        mob.onMove(this.world.onMobMoveCallback.bind(this.world));

        return mob;
    },
    
    respawnMob: function(mob, delay) {
        this.removeFromArea(mob);

        setTimeout(() => {
            const pos = this._getRandomPositionInsideArea();
            mob.x = pos.x;
            mob.y = pos.y;
            mob.isDead = false;
            this.addToArea(mob);
            this.world.addMob(mob);
        }, delay);
    },

    initRoaming: function() {
        setInterval(() => {
            for (const mob of this.entities) {
                const canRoam = (Utils.random(20) === 1);
                
                if (canRoam && !mob.hasTarget() && !mob.isDead) {
                    const pos = this._getRandomPositionInsideArea();
                    mob.move(pos.x, pos.y);
                }
            }
        }, 500);
    },
    
    createReward: function() {
        const pos = this._getRandomPositionInsideArea();
        return { x: pos.x, y: pos.y, kind: Types.Entities.CHEST };
    }
});
