var date = Date.now(), diff = 0;

const getInitialGameData = () => {
    game = {
        tab: 0,
        time: 0,

        bought_perks: {},
        active_perks: {},
        active_perk_groups: {},
        perk_effects: {},
        kaizo_penalty: {
            points: DC.D1,
        },

        prestige_boost: DC.D1,

        point_dimension_mult: DC.D1,
        point_dimensions: [],
        power_boost: DC.D1,

        get power_exponent() { return PointDimension.exponent },
    }

    for (let i = 1; i < KAIZO.perks.length; i++) {
        game.bought_perks[i] = 0;
        game.active_perk_groups[i] = true;
        for (let j = 1; j < KAIZO.perks[i].length; j++) {
            game.active_perks[i+";"+j] = true;
            game.perk_effects[i+";"+j] = KAIZO.perks[i][j].defaultEffect ?? DC.D1;
        }
    }

    game.currencies = getInitialCurrencies();
    game.upgrades = getInitialUpgrades();
    game.upgrade_groups = getInitialUpgradeGroups();
    game.resets = getInitialResets();

    for (let i = 0; i < 10; i++) game.point_dimensions[i] = new PointDimension(i);
}

getInitialGameData();

function loop() {
    diff = Date.now() - player.last_played;
    // updateHTML()
    calc(diff/1000*dev.speed)
    updateTemp()
    player.last_played = Date.now()
}

function reset() {
    for (let id in game.currencies) game.currencies[id].reset();
    for (let id in game.upgrades) game.upgrades[id].level = DC.D0;
    PointDimension.reset()
}