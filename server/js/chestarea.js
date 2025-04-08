const Area = require('./area');
const Types = require("../../shared/js/gametypes");
const cls = require('./lib/class');

module.exports = cls.Class.extend({
    init: function(id, x, y, width, height, cx, cy, items, world) {
        this._super(id, x, y, width, height, world);
        this.items = items;
        this.chestX = cx;
        this.chestY = cy;
    },

    contains: function(entity) {
        if (!entity) return false;

        return entity.x >= this.x
            && entity.y >= this.y
            && entity.x < this.x + this.width
            && entity.y < this.y + this.height;
    }
});
