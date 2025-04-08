const Utils = require("./utils");
const Messages = require("./message");
const Formulas = require("./formulas");
const check = require("./format").check;
const Types = require("../../shared/js/gametypes");
const cls = require("./lib/class");

module.exports = Player = Character.extend({
    init: function(connection, worldServer) {
        this.server = worldServer;
        this.connection = connection;

        this._super(this.connection.id, "player", Types.Entities.WARRIOR, 0, 0, "");

        this.hasEnteredGame = false;
        this.isDead = false;
        this.haters = {};
        this.lastCheckpoint = null;
        this.formatChecker = new FormatChecker();
        this.disconnectTimeout = null;
        
        this.connection.listen((message) => {
            const action = parseInt(message[0]);

            log.debug("Received: "+message);
            if (!check(message)) {
                this.connection.close(`Invalid ${Types.getMessageTypeAsString(action)} message format: ${message}`);
                return;
            }

            if (!this.hasEnteredGame && action !== Types.Messages.HELLO) {
                this.connection.close(`Invalid handshake message: ${message}`);
                return;
            }

            if (this.hasEnteredGame && !this.isDead && action === Types.Messages.HELLO) {
                this.connection.close(`Cannot initiate handshake twice: ${message}`);
                return;
            }

            this.resetTimeout();

            switch (action) {
                case Types.Messages.HELLO:
                    this.handleHello(message);
                    break;
                case Types.Messages.WHO:
                    this.handleWho(message);
                    break;
                case Types.Messages.ZONE:
                    this.zoneCallback();
                    break;
                case Types.Messages.CHAT:
                    this.handleChat(message);
                    break;
                case Types.Messages.MOVE:
                    this.handleMove(message);
                    break;
                case Types.Messages.LOOTMOVE:
                    this.handleLootMove(message);
                    break;
                case Types.Messages.AGGRO:
                    this.handleAggro(message);
                    break;
                case Types.Messages.ATTACK:
                    this.handleAttack(message);
                    break;
                case Types.Messages.HIT:
                    this.handleHit(message);
                    break;
                case Types.Messages.HURT:
                    this.handleHurt(message);
                    break;
                case Types.Messages.LOOT:
                    this.handleLoot(message);
                    break;
                case Types.Messages.TELEPORT:
                    this.handleTeleport(message);
                    break;
                case Types.Messages.OPEN:
                    this.handleOpen(message);
                    break;
                case Types.Messages.CHECK:
                    this.handleCheckpoint(message);
                    break;
                default:
                    if (this.messageCallback) {
                        this.messageCallback(message);
                    }
                    break;
            }
        });

        this.connection.onClose(() => {
            if (this.firepotionTimeout) {
                clearTimeout(this.firepotionTimeout);
            }
            clearTimeout(this.disconnectTimeout);
            if (this.exitCallback) {
                this.exitCallback();
            }
        });

        this.connection.sendUTF8("go"); 
    },

    handleHello(message) {
        const name = Utils.sanitize(message[1]);
        this.name = name === "" ? "lorem ipsum" : name.substr(0, 15);
        this.kind = Types.Entities.WARRIOR;
        this.equipArmor(message[2]);
        this.equipWeapon(message[3]);
        this.orientation = Utils.randomOrientation();
        this.updateHitPoints();
        this.updatePosition();
        
        this.server.addPlayer(this);
        this.server.enterCallback(this);
        
        this.send([Types.Messages.WELCOME, this.id, this.name, this.x, this.y, this.hitPoints]);
        this.hasEnteredGame = true;
        this.isDead = false;
    },

    handleWho(message) {
        message.shift();
        this.server.pushSpawnsToPlayer(this, message);
    },

    handleChat(message) {
        const msg = Utils.sanitize(message[1]);
        if (msg && msg !== "") {
            this.broadcastToZone(new Messages.Chat(this, msg.substr(0, 60)), false);
        }
    },

    handleMove(message) {
        if (this.moveCallback) {
            const x = message[1], y = message[2];
            if (this.server.isValidPosition(x, y)) {
                this.setPosition(x, y);
                this.clearTarget();
                this.broadcast(new Messages.Move(this));
                this.moveCallback(this.x, this.y);
            }
        }
    },

    handleLootMove(message) {
        if (this.lootMoveCallback) {
            this.setPosition(message[1], message[2]);
            const item = this.server.getEntityById(message[3]);
            if (item) {
                this.clearTarget();
                this.broadcast(new Messages.LootMove(this, item));
                this.lootMoveCallback(this.x, this.y);
            }
        }
    },

    handleAggro(message) {
        if (this.moveCallback) {
            this.server.handleMobHate(message[1], this.id, 5);
        }
    },

    handleAttack(message) {
        const mob = this.server.getEntityById(message[1]);
        if (mob) {
            this.setTarget(mob);
            this.server.broadcastAttacker(this);
        }
    },

    handleHit(message) {
        const mob = this.server.getEntityById(message[1]);
        if (mob) {
            const dmg = Formulas.dmg(this.weaponLevel, mob.armorLevel);
            if (dmg > 0) {
                mob.receiveDamage(dmg, this.id);
                this.server.handleMobHate(mob.id, this.id, dmg);
                this.server.handleHurtEntity(mob, this, dmg);
            }
        }
    },

    handleHurt(message) {
        const mob = this.server.getEntityById(message[1]);
        if (mob && this.hitPoints > 0) {
            this.hitPoints -= Formulas.dmg(mob.weaponLevel, this.armorLevel);
            this.server.handleHurtEntity(this);
            if (this.hitPoints <= 0) {
                this.isDead = true;
                if (this.firepotionTimeout) {
                    clearTimeout(this.firepotionTimeout);
                }
            }
        }
    },

    handleLoot(message) {
        const item = this.server.getEntityById(message[1]);
        if (item) {
            const kind = item.kind;
            if (Types.isItem(kind)) {
                this.broadcast(item.despawn());
                this.server.removeEntity(item);
                this.processLootItem(item, kind);
            }
        }
    },

    processLootItem(item, kind) {
        if (kind === Types.Entities.FIREPOTION) {
            this.updateHitPoints();
            this.broadcast(this.equip(Types.Entities.FIREFOX));
            this.firepotionTimeout = setTimeout(() => {
                this.broadcast(this.equip(this.armor));
                this.firepotionTimeout = null;
            }, 15000);
            this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
        } else if (Types.isHealingItem(kind)) {
            this.handleHealingItem(kind);
        } else if (Types.isArmor(kind) || Types.isWeapon(kind)) {
            this.equipItem(item);
            this.broadcast(this.equip(kind));
        }
    },

    handleHealingItem(kind) {
        let amount;
        switch (kind) {
            case Types.Entities.FLASK:
                amount = 40;
                break;
            case Types.Entities.BURGER:
                amount = 100;
                break;
        }
        if (!this.hasFullHealth()) {
            this.regenHealthBy(amount);
            this.server.pushToPlayer(this, this.health());
        }
    },

    handleTeleport(message) {
        const x = message[1], y = message[2];
        if (this.server.isValidPosition(x, y)) {
            this.setPosition(x, y);
            this.clearTarget();
            this.broadcast(new Messages.Teleport(this));
            this.server.handlePlayerVanish(this);
            this.server.pushRelevantEntityListTo(this);
        }
    },

    handleOpen(message) {
        const chest = this.server.getEntityById(message[1]);
        if (chest && chest instanceof Chest) {
            this.server.handleOpenedChest(chest, this);
        }
    },

    handleCheckpoint(message) {
        const checkpoint = this.server.map.getCheckpoint(message[1]);
        if (checkpoint) {
            this.lastCheckpoint = checkpoint;
        }
    },

    resetTimeout() {
        clearTimeout(this.disconnectTimeout);
        this.disconnectTimeout = setTimeout(() => this.timeout(), 1000 * 60 * 15); 
    },

    timeout() {
        this.connection.sendUTF8("timeout");
        this.connection.close("Player was idle for too long");
    }
});
