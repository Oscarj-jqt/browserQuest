const Utils = require('./utils');
const Types = require("../../shared/js/gametypes");
const Item = require('./item');
const cls = require('./lib/class');

module.exports = cls.Class.extend({
    init: function (id, x, y) {
        this._super(id, Types.Entities.CHEST, x, y);
    },

    setItems: function (items) {
        this.items = items;
    },

    getRandomItem: function () {
        if (!this.items || this.items.length === 0) {
            return null;
        }

        const index = Utils.random(this.items.length);
        return this.items[index];
    }
});
