const cls = require("./lib/class");
const Messages = require("./message");
const Utils = require("./utils");
const Properties = require("./properties");
const Types = require("../../shared/js/gametypes");
const Entity = require("./entity");

module.exports = cls.Class.extend({
    init: function (id, type, kind, x, y) {
        this._super(id, type, kind, x, y);

        this.orientation = Utils.randomOrientation();
        this.attackers = {};
        this.target = null;
    },

    getState: function () {
        const basestate = this._getBaseState();
        const state = [this.orientation];

        if (this.target) {
            state.push(this.target);
        }

        return basestate.concat(state);
    },

    resetHitPoints: function (maxHitPoints) {
        this.maxHitPoints = maxHitPoints;
        this.hitPoints = maxHitPoints;
    },

    regenHealthBy: function (value) {
        const hp = this.hitPoints;
        const max = this.maxHitPoints;

        this.hitPoints = Math.min(hp + value, max);
    },

    hasFullHealth: function () {
        return this.hitPoints === this.maxHitPoints;
    },

    setTarget: function (entity) {
        this.target = entity.id;
    },

    clearTarget: function () {
        this.target = null;
    },

    hasTarget: function () {
        return this.target !== null;
    },

    attack: function () {
        return new Messages.Attack(this.id, this.target);
    },

    health: function () {
        return new Messages.Health(this.hitPoints, false);
    },

    regen: function () {
        return new Messages.Health(this.hitPoints, true);
    },

    addAttacker: function (entity) {
        if (entity) {
            this.attackers[entity.id] = entity;
        }
    },

    removeAttacker: function (entity) {
        if (entity && entity.id in this.attackers) {
            delete this.attackers[entity.id];
            if (typeof log !== "undefined" && log.debug) {
                log.debug(`${this.id} REMOVED ATTACKER ${entity.id}`);
            }
        }
    },

    forEachAttacker: function (callback) {
        Object.values(this.attackers).forEach(callback);
    }
});
