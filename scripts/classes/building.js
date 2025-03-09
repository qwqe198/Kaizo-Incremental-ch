class Building {
    name = "???";

    speed = DC.D1;
    power = DC.D1;

    player_data = Building.createPlayerData();
    currency = new Currency();

    on_hit = () => {};
    get_power_description = () => "???";

    cost = () => DC.DINF;
    bulk = () => DC.D0;

    constructor(data={}) {
        for (var [key, value] of Object.entries(data)) if (!['currency'].includes(key)) {
            this[key] = value;
        }

        if ('currency' in data) Object.defineProperty(this,"currency",{
            get: data.currency,
        });
    }

    static createPlayerData(rep={}) {
        var data = {
            amount: DC.D0,
            bought: DC.D0,
            progress: DC.D0,
        }

        return Object.assign(data, rep)
    }

    temp() {
        if ('speed_update' in this) this.speed = this.speed_update();
        
        this.power = this.player_data.bought.max(1).mul(this.player_data.amount)
        if ('power_update' in this) this.power = this.power.mul(this.power_update());
    }
    static tempAll() {
        for (let id in game.buildings) {
            let b = game.buildings[id];

            b.temp();
        }
    }

    tick(dt=1) {
        let next_progress = this.player_data.progress.add(this.speed.mul(dt));

        if (next_progress.gte(1)) this.on_hit(next_progress.floor().mul(this.power));

        this.player_data.progress = next_progress.mod(1);
    }
    static ticks(dt) {
        for (let id in game.buildings) {
            let b = game.buildings[id];

            b.tick(dt);
        }
    }

    purchase() {
        var cost = this.current_cost, currency = this.currency;

        if (currency.amount.gte(cost)) {
            this.player_data.bought = this.player_data.bought.add(1)//.max(this.bulk(currency.amount));
            this.player_data.amount = this.player_data.amount.add(1);
            currency.amount = currency.amount.sub(cost);
        }
    }

    get gain() { return this.speed.mul(this.power) }
    get power_description() { return this.get_power_description(this.power) }
    get current_cost() { return this.cost(this.player_data.bought) }
}