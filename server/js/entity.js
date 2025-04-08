const cls = require("./lib/class");
const Messages = require('./message');
const Utils = require('./utils');

module.exports = cls.Class.extend({
    init: function(id, type, kind, x, y) {
        this.id = parseInt(id, 10);
        this.type = type;
        this.kind = kind;
        this.x = x;
        this.y = y;
    },


    _getBaseState: function() {
        return [
            this.id,  
            this.kind,
            this.x,
            this.y
        ];
    },

    getState: function() {
        return this._getBaseState();
    },

    spawn: function() {
        return new Messages.Spawn(this);
    },

    despawn: function() {
        return new Messages.Despawn(this.id);
    },

    setPosition: function(x, y) {
        this.x = x;
        this.y = y;
    },

    getPositionNextTo: function(entity) {
        if (!entity) return null;

        const pos = {};
        const r = Utils.random(4);

        pos.x = entity.x;
        pos.y = entity.y;

        switch (r) {
            case 0:
                pos.y -= 1;
                break;
            case 1:
                pos.y += 1;
                break;
            case 2:
                pos.x -= 1;
                break;
            case 3:
                pos.x += 1;
                break;
        }

        return pos;
    }
});
