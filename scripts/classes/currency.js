class Currency {
    amount = DC.D0;

    constructor(data={}) {
        this.name = data.name ?? "???";

        defineObjectGetSet(this, "amount", data.get_amount ?? (() => DC.D0), data.set_amount ?? (() => DC.D0));

        if ('get_total' in data && 'set_total' in data) defineObjectGetSet(this, "total", data.get_total, data.set_total);
    }

    static find(id) { return game.currencies[id] ?? new Currency() }

    increase(value) {
        this.amount = this.amount.add(value).max(0)
        if ('total' in this) this.total = this.total.add(value).max(0);
    }

    format(precision = 0, commas) { return this.amount.format(precision, commas) }
    formatGain(gain) { return this.amount.formatGain(gain) }

    reset() {
        this.amount = DC.D0;
        if ('total' in this) this.total = DC.D0;
    }
}

class PassiveCurrency extends Currency {
    temp = DC.D0;
    rate = 1;

    constructor(data={}) {
        super(data);
        
        defineManualGet(this, "rate", data.rate ?? 1);

        this.gain = data.gain ?? (() => DC.D0)
    }

    formatGain() { return this.rate > 0 ? formatGain(this.amount, Decimal.mul(this.temp, this.rate)) : undefined }

    tick(dt=1) { this.increase(Decimal.mul(this.temp, this.rate).mul(dt)) }

    static ticks(dt) {
        for (let id in game.currencies) {
            let currency = game.currencies[id];
            if (currency instanceof PassiveCurrency) currency.tick(dt);
        }
    }

    static updateTemp() {
        for (let id in game.currencies) if (game.currencies[id] instanceof PassiveCurrency) game.currencies[id].temp = game.currencies[id].gain();
    }
}

const getInitialCurrencies = () => {
    var data = {
        points: new PassiveCurrency({
            name: "点数",

            get_amount: () => player.points,
            set_amount: v => player.points = v,

            get_total: () => player.total_points,
            set_total: v => player.total_points = v,

            gain() {
                if (!KAIZO.active) return DC.D0;

                let x = DC.D1;

                x = x.mul(KAIZO.perkEffect(1, 2)).mul(KAIZO.perkEffect(1, 3)).mul(Upgrade.getEffect('point\\1')).mul(game.prestige_boost).mul(game.power_boost)

                x = x.pow(Upgrade.getEffect('point\\6')).root(game.kaizo_penalty.points)

                return x
            },
        }),
        prestige: new PassiveCurrency({
            name: "PP",

            get_amount: () => player.prestige_points,
            set_amount: v => player.prestige_points = v,

            gain() {
                if (!KAIZO.active || !KAIZO.perkOwned(2, 1)) return DC.D0;

                let x = game.currencies.points.amount.div(1e15)

                if (x.lt(1)) return DC.D0;

                x = expPow(x, KAIZO.perkOwned(2, 8)?.55:.5).mul(KAIZO.perkEffect(2, 2)).mul(KAIZO.perkEffect(2, 5)).mul(KAIZO.perkEffect(3, 8)).mul(Upgrade.getEffect('prestige\\1'))

                return x.floor()
            },
            
            rate: 0,
        }),
        powers: new PassiveCurrency({
            name: "能量",

            get_amount: () => player.powers,
            set_amount: v => player.powers = v,

            gain() {
                if (!KAIZO.active || !KAIZO.perkOwned(3, 1)) return DC.D0;

                let d = game.point_dimensions[0], x = d.amount.mul(d.multiplier);

                return x
            },
        }),
    };

    return data
}