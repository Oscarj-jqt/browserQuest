const cls = require("./lib/class");
const Utils = require("./utils");
const Types = require("../../shared/js/gametypes");

const Messages = {};

module.exports = Messages;

const Message = cls.Class.extend({});

Messages.Spawn = Message.extend({
    init(entity) {
        this.entity = entity;
    },
    serialize() {
        const spawn = [Types.Messages.SPAWN];
        return spawn.concat(this.entity.getState());
    }
});

Messages.Despawn = Message.extend({
    init(entityId) {
        this.entityId = entityId;
    },
    serialize() {
        return [Types.Messages.DESPAWN, this.entityId];
    }
});

Messages.Move = Message.extend({
    init(entity) {
        this.entity = entity;
    },
    serialize() {
        return [
            Types.Messages.MOVE,
            this.entity.id,
            this.entity.x,
            this.entity.y,
        ];
    }
});

Messages.LootMove = Message.extend({
    init(entity, item) {
        this.entity = entity;
        this.item = item;
    },
    serialize() {
        return [
            Types.Messages.LOOTMOVE,
            this.entity.id,
            this.item.id,
        ];
    }
});

Messages.Attack = Message.extend({
    init(attackerId, targetId) {
        this.attackerId = attackerId;
        this.targetId = targetId;
    },
    serialize() {
        return [
            Types.Messages.ATTACK,
            this.attackerId,
            this.targetId,
        ];
    }
});

Messages.Health = Message.extend({
    init(points, isRegen) {
        this.points = points;
        this.isRegen = isRegen;
    },
    serialize() {
        const health = [Types.Messages.HEALTH, this.points];
        if (this.isRegen) {
            health.push(1);
        }
        return health;
    }
});

Messages.HitPoints = Message.extend({
    init(maxHitPoints) {
        this.maxHitPoints = maxHitPoints;
    },
    serialize() {
        return [
            Types.Messages.HP,
            this.maxHitPoints,
        ];
    }
});

Messages.EquipItem = Message.extend({
    init(player, itemKind) {
        this.playerId = player.id;
        this.itemKind = itemKind;
    },
    serialize() {
        return [
            Types.Messages.EQUIP,
            this.playerId,
            this.itemKind,
        ];
    }
});

Messages.Drop = Message.extend({
    init(mob, item) {
        this.mob = mob;
        this.item = item;
    },
    serialize() {
        const drop = [
            Types.Messages.DROP,
            this.mob.id,
            this.item.id,
            this.item.kind,
            this.mob.hatelist.map((hatelist) => hatelist.id),
        ];

        return drop;
    }
});

Messages.Chat = Message.extend({
    init(player, message) {
        this.playerId = player.id;
        this.message = message;
    },
    serialize() {
        return [
            Types.Messages.CHAT,
            this.playerId,
            this.message,
        ];
    }
});

Messages.Teleport = Message.extend({
    init(entity) {
        this.entity = entity;
    },
    serialize() {
        return [
            Types.Messages.TELEPORT,
            this.entity.id,
            this.entity.x,
            this.entity.y,
        ];
    }
});

Messages.Damage = Message.extend({
    init(entity, points) {
        this.entity = entity;
        this.points = points;
    },
    serialize() {
        return [
            Types.Messages.DAMAGE,
            this.entity.id,
            this.points,
        ];
    }
});

Messages.Population = Message.extend({
    init(world, total) {
        this.world = world;
        this.total = total;
    },
    serialize() {
        return [
            Types.Messages.POPULATION,
            this.world,
            this.total,
        ];
    }
});

Messages.Kill = Message.extend({
    init(mob) {
        this.mob = mob;
    },
    serialize() {
        return [
            Types.Messages.KILL,
            this.mob.kind,
        ];
    }
});

Messages.List = Message.extend({
    init(ids) {
        this.ids = ids;
    },
    serialize() {
        const list = this.ids;
        list.unshift(Types.Messages.LIST);
        return list;
    }
});

Messages.Destroy = Message.extend({
    init(entity) {
        this.entity = entity;
    },
    serialize() {
        return [
            Types.Messages.DESTROY,
            this.entity.id,
        ];
    }
});

Messages.Blink = Message.extend({
    init(item) {
        this.item = item;
    },
    serialize() {
        return [
            Types.Messages.BLINK,
            this.item.id,
        ];
    }
});
