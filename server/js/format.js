const Types = require("../../shared/js/gametypes");

class FormatChecker {
    constructor() {
        this.formats = {
            [Types.Messages.HELLO]: ['s', 'n', 'n'],
            [Types.Messages.MOVE]: ['n', 'n'],
            [Types.Messages.LOOTMOVE]: ['n', 'n', 'n'],
            [Types.Messages.AGGRO]: ['n'],
            [Types.Messages.ATTACK]: ['n'],
            [Types.Messages.HIT]: ['n'],
            [Types.Messages.HURT]: ['n'],
            [Types.Messages.CHAT]: ['s'],
            [Types.Messages.LOOT]: ['n'],
            [Types.Messages.TELEPORT]: ['n', 'n'],
            [Types.Messages.ZONE]: [],
            [Types.Messages.OPEN]: ['n'],
            [Types.Messages.CHECK]: ['n']
        };
    }

    check(msg) {
        const message = [...msg];
        const type = message[0];
        const format = this.formats[type];
        
        message.shift();
        
        if (format) {
            if (message.length !== format.length) {
                return false;
            }
            for (let i = 0; i < message.length; i++) {
                if (format[i] === 'n' && typeof message[i] !== 'number') {
                    return false;
                }
                if (format[i] === 's' && typeof message[i] !== 'string') {
                    return false;
                }
            }
            return true;
        } else if (type === Types.Messages.WHO) {
            // WHO messages have a variable amount of params, all of which must be numbers.
            return message.length > 0 && message.every(param => typeof param === 'number');
        } else {
            console.error(`Unknown message type: ${type}`);
            return false;
        }
    }
}

const checker = new FormatChecker();

exports.check = checker.check.bind(checker);
