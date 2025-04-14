
define(['player', 'shared/js/gametypes'], function(Player, Types) {
    
    var Warrior = Player.extend({
        init: function(id, name) {
            this._super(id, name, Types.Entities.WARRIOR);
        },
    });
    
    return Warrior;
});