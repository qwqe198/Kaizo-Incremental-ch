function getPrestigeBoost() {
    let p = game.currencies.prestige.amount;

    let exp = Decimal.add(2, KAIZO.perkEffect(2,3)).add(Upgrade.getEffect('prestige\\2'));

    return p.add(1).pow(exp)
}

function updateTemp() {
    KAIZO.updateTemp();

    Upgrade.updateTemp();

    game.prestige_boost = getPrestigeBoost();
    game.power_boost = PointDimension.effect();
    game.point_dimension_mult = PointDimension.mult;

    PassiveCurrency.updateTemp();
}