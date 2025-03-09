class PointDimension {
    constructor(x) {
        this.x = x;

        this.costBase = Decimal.pow(2, x + 1).pow10();
        this.costIncrement = Decimal.pow(2, x).pow10();
    }

    get amount() { return player.point_dimensions[this.x].amount }
    set amount(v) { player.point_dimensions[this.x].amount = v }

    get resource1() { return game.currencies.points.amount }
    set resource1(v) { game.currencies.points.amount = v }

    get resource2() { return player.powers }
    set resource2(v) { player.powers = v }

    get boughts() { return player.point_dimensions[this.x].bought1.add(player.point_dimensions[this.x].bought2) }

    cost(x, y = player.point_dimensions[this.x]['bought' + x]) { return (x == 1 ? y.sumBase(1.1) : y.scale(100, 2, "P")).powBase(this.costIncrement).mul(this.costBase) }
    bulk(x, y = this['resource' + x]) {
        let a = y.div(this.costBase).log(this.costIncrement)
        a = x == 1 ? a.sumBase(1.1, true) : a.scale(100, 2, "P", true);
        return a.floor().add(1)
    }

    purchase(x) {
        if (this.x > 0 && game.point_dimensions[this.x - 1].boughts.lte(0)) return;

        let cost = this.cost(x);

        if (this['resource' + x].gte(cost)) {
            let amount = player.point_dimensions[this.x]['bought' + x].add(1).max(this.bulk(x))

            this.amount = this.amount.add(amount.sub(player.point_dimensions[this.x]['bought' + x]));
            player.point_dimensions[this.x]['bought' + x] = amount;

            this['resource' + x] = this['resource' + x].sub(this.cost(x, amount.sub(1))).max(0);
        }
    }

    get base() { return KAIZO.perkEffect(3, 2).add(2) }
    get multiplier() { return this.boughts.powBase(this.base).mul(game.point_dimension_mult) }
    get gain() {
        let nd = game.point_dimensions[this.x + 1];
        return nd.amount.mul(nd.multiplier);
    }

    static ticks(dt) {
        if (!KAIZO.perkOwned(3, 1)) return;

        for (let x = 8; x >= 0; x--) {
            let d = game.point_dimensions[x], nd = game.point_dimensions[x + 1];
            d.amount = d.amount.add(nd.amount.mul(nd.multiplier).mul(dt));
        }
    }

    static get exponent() { return KAIZO.perkEffect(3, 3).add(.5) }
    static get mult() { return KAIZO.perkEffect(3, 4).mul(KAIZO.perkEffect(3, 5)).mul(Upgrade.getEffect('power\\1')) }

    static effect() {
        let p = player.powers;

        let x = p.add(1).pow(this.exponent);

        return x
    }

    static reset() {
        player.powers = DC.D0;

        for (let i = 0; i < 10; i++) {
            player.point_dimensions[i].amount = DC.D0;
            player.point_dimensions[i].bought1 = DC.D0;
            player.point_dimensions[i].bought2 = DC.D0;
        }
    }
}

function buyMaxPointDimensions() {
    if (KAIZO.perkOwned(2, 6)) game.upgrades['power\\1'].purchase(true);

    for (let i = 0; i < 10; i++) {
        game.point_dimensions[i].purchase(1);
        game.point_dimensions[i].purchase(2);
    }
}