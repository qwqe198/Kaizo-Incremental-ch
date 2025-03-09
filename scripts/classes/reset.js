class Reset {
    constructor(data={}) {
        this.gain_description = data.gain_description ?? (() => "???");
        this.condition_description = data.condition_description ?? (() => "???");

        this.condition = data.condition ?? (() => false);
        this.currency = data.currency instanceof Currency ? data.currency : Currency.find(data.currency);

        this.onReset = data.onReset;
        this.doReset = data.doReset;
    }

    static find(id) { return game.resets[id] ?? new Reset() }

    get canReset () { return this.condition() }

    reset(force=false) {
        if (this.canReset) {
            if (!force) {
                this.currency.increase(this.currency.temp);
                this.onReset?.();
            }

            updateTemp();

            this.doReset?.();
        }
    }
    static reset(id, force=false) { Reset.find(id).reset(force) }
}

const getInitialResets = () => {
    var data = {
        prestige: new Reset({
            currency: "prestige",

            gain_description: x => `重置以获得 <b>${format(x,0)}</b> 声望点数。`,
            condition_description: () => `必须拥有至少 <b>${format(1e15)}</b> 点数。</b>`,

            condition: () => game.currencies.points.amount.gte(1e15),

            doReset() {
                game.currencies.points.reset();
                game.upgrade_groups.points.reset();

                updateTemp();
            }
        }),
    };

    return data
};