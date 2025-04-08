const Utils = require("./utils");

const Formulas = {};

Formulas.dmg = (weaponLevel, armorLevel) => {
    const dealt = weaponLevel * Utils.randomInt(5, 10);
    const absorbed = armorLevel * Utils.randomInt(1, 3);
    const dmg = dealt - absorbed;

    console.log("abs: "+absorbed+"   dealt: "+ dealt+"   dmg: "+ (dealt - absorbed));
    
    if (dmg <= 0) {
        return Utils.randomInt(0, 3);
    } else {
        return dmg;
    }
};

Formulas.hp = (armorLevel) => {
    const hp = 80 + ((armorLevel - 1) * 30);
    return hp;
};

module.exports = Formulas;
