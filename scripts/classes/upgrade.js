class Upgrade {
    groups = [];
    auto = false;
    temp_effect = null;
    default_effect = DC.D1;

    /**
     * 创建新的升级
     * @param {string} id - 升级的ID
     * @param {Object} data - 升级的数据
     * @param {Function} data.unl - 升级的解锁条件
     * 
     * @param {string} data.name - 升级的名称
     * @param {string} data.description - 升级的描述
     * 
     * @param {(number|Decimal)} data.max - 升级的最大等级
     * 
     * @param {Function} data.cost - 计算升级成本的函数，基于等级
     * @param {Function} data.bulk - 计算最大购买数量的函数
     * 
     * @param {(string|Currency)} data.currency - 升级所需的货币
     */
    constructor(id, data={}) {
        this.id = id;
        this.unl = data.unl ?? (() => true);

        this.name = data.name;
        defineManualGet(this, "description", data.description ?? "???");

        defineManualGet(this, "max", data.max ?? DC.DINF);
        defineObjectGetSet(this, "level", () => player.upgrades[id] ?? DC.D0, x => { player.upgrades[id] = x.max(0).min(this.max) });

        this.cost = data.cost ?? (() => DC.DINF);
        this.bulk = data.bulk ?? (() => DC.D0);

        this.currency = data.currency instanceof Currency ? data.currency : Currency.find(data.currency);

        this.default_effect = data.default_effect ?? DC.D1;
        this.effect = data.effect ?? (() => this.default_effect);
        this.effectDisplay = data.effectDisplay;

        defineManualGet(this, "strength", data.strength ?? DC.D1);

        for (let [key, value] of Object.entries(data)) if (!(key in this)) this[key] = value;
    }

    static create(id, data, target) { return target[id] = new Upgrade(id, data) }

    /**
     * 通过ID查找升级，如果不存在则返回默认值
     * @param {string} id - 升级的ID
     * @returns {Upgrade}
     */
    static find(id) { return game.upgrades[id] ?? new Upgrade() }

    get current_cost() { return this.cost(this.level) }
    get bought() { return this.level.gte(this.max) }

    purchase(bulk=false) {
        var cost = this.current_cost, currency = this.currency;

        if (this.unl() && this.level.lt(this.max) && currency.amount.gte(cost)) {
            var amount = this.level.add(1);

            if (bulk) amount = amount.max(this.bulk(currency.amount));

            this.level = amount;

            if (!this.auto) currency.amount = currency.amount.sub(bulk ? this.cost(amount.sub(1)) : cost).max(0);
        }
    }

    static updateTemp() {
        for (let id in game.upgrade_groups) {
            let group = game.upgrade_groups[id];

            group.automated = group.auto;
        }

        for (let id in game.upgrades) {
            let upgrade = game.upgrades[id];

            upgrade.auto = upgrade.groups.some(g => g.automated);
            if ('effect' in upgrade) upgrade.temp_effect = upgrade.effect(upgrade.level.mul(upgrade.strength));
        }
    }

    getEffect() { return this.temp_effect ?? this.default_effect }
    static getEffect(id) { return Upgrade.find(id).getEffect() }

    switchAuto() { player.auto_upgrades[this.id] = !player.auto_upgrades[this.id] }
    tick() { if (this.unl() && this.auto && player.auto_upgrades[this.id]) this.purchase(true); }
    static ticks() { for (let id in game.upgrades) game.upgrades[id].tick(); }
}

class UpgradeOnce extends Upgrade {
    max = DC.D1;
    bulk = DC.D1;

    constructor(id, data={}) {
        super(id, data);

        this.cost = data.cost ?? DC.DINF;
    }

    static create(id, data, target) { return target[id] = new UpgradeOnce(id, data) }

    get current_cost() { return this.cost }

    getEffect() { return this.bought ? this.temp_effect ?? this.default_effect : this.default_effect }
}

class UpgradeGroup {
    automated = false;

    constructor(ids, data={}) {
        this.ids = ids;
        this.unl = data.unl ?? (() => true);

        this.upgrades = {};
        for (let id of ids) {
            let upg = Upgrade.find(id);
            upg.groups.push(this);
            this.upgrades[id] = upg;
        }

        defineManualGet(this, "auto", data.auto ?? false);
    }

    static createByPrefix(prefix, data) {
        var ids = [];
        for (var id of Object.keys(game.upgrades)) {
            let s = id.split('\\');

            if (s[0] === prefix) ids.push(id); //  && s[1] !== '' && s[1].split(s[1].match(/\d+/g)[0])[0] === ''
        }
        return new UpgradeGroup(ids, data)
    }

    reset(keep=[]) { for (let id in this.upgrades) if (!keep.includes(id)) this.upgrades[id].level = DC.D0 }
}

const getInitialUpgrades = () => {
    var data = {};

    Upgrade.create("point\\1", {
        name: "点数生成器",
        description() { return `每级将<b>点数</b>增加<b>${formatMult(this.base())}</b>。` },

        cost: a => a.sumBase(KAIZO.perkOwned(1,6) ? 1.05 : 1.1).powBase(3).mul(10),
        bulk: a => a.div(10).log(3).sumBase(KAIZO.perkOwned(1,6) ? 1.05 : 1.1, true).floor().add(1),

        currency: "points",

        strength() { return Upgrade.getEffect("prestige\\3").mul(Upgrade.getEffect("point\\5")) },
        base() { return Decimal.add(2, Upgrade.getEffect("point\\2")) },
        effect(a) {
            let x = a.powBase(this.base())
            return x
        },
        effectDisplay: x => formatMult(x),
    }, data);
    Upgrade.create("point\\2", {
        unl: () => KAIZO.perkOwned(1,5),
        name: "更好的点数生成器",
        description() { return `每级将<b>点数生成器</b>的基础值增加<b>${formatPlus(this.base())}</b>。` },

        cost: a => a.pow(1.5).powBase(10).mul(1e3),
        bulk: a => a.div(1e3).log(10).root(1.5).floor().add(1),

        currency: "points",

        default_effect: DC.D0,
        strength() { return Upgrade.getEffect("prestige\\3").mul(Upgrade.getEffect("point\\5")) },
        base() { return Decimal.add(.25, KAIZO.perkEffect(1,7)) },
        effect(a) {
            let x = a.mul(this.base())
            return x
        },
        effectDisplay: x => formatPlus(x),
    }, data);
    Upgrade.create("point\\3", {
        unl: () => KAIZO.perkOwned(1,5) && KAIZO.perkOwned(1,2),
        description() { return `每级将<b>α<sub>2</sub></b>天赋的基础值增加<b>${formatPlus(1)}</b>。` },

        cost: a => a.pow(1.25).powBase(10).mul(1e6),
        bulk: a => a.div(1e6).log(10).root(1.25).floor().add(1),

        currency: "points",

        default_effect: DC.D0,
        strength() { return Upgrade.getEffect("prestige\\3").mul(Upgrade.getEffect("point\\5")) },
        effect(a) {
            let x = a.mul(1)
            return x
        },
        effectDisplay: x => formatPlus(x),
    }, data);
    Upgrade.create("point\\4", {
        unl: () => KAIZO.perkOwned(1,5) && KAIZO.perkOwned(1,3),
        description() { return `每级将<b>α<sub>3</sub></b>天赋的指数增加<b>${formatPlus(.5)}</b>。` },

        cost: a => a.sumBase(1.1).powBase(25).mul(1e6),
        bulk: a => a.div(1e6).log(25).sumBase(1.1, true).floor().add(1),

        currency: "points",

        default_effect: DC.D0,
        strength() { return Upgrade.getEffect("prestige\\3").mul(Upgrade.getEffect("point\\5")) },
        effect(a) {
            let x = a.mul(.5)
            return x
        },
        effectDisplay: x => formatPlus(x),
    }, data);
    Upgrade.create("point\\5", {
        unl: () => KAIZO.perkOwned(1,8),
        description() { return `每级使之前的<b>点数升级</b>效果增加<b>+1%</b>。` },

        cost: a => a.sumBase(1.1).powBase(10).mul(1e100),
        bulk: a => a.div(1e100).log(10).sumBase(1.1, true).floor().add(1),

        currency: "points",

        effect(a) {
            let x = a.mul(.01).add(1)
            return x
        },
        effectDisplay: x => formatPercent(x.sub(1)),
    }, data);
    Upgrade.create("point\\6", {
        unl: () => KAIZO.perkOwned(1,8),
        description() { return `每级将<b>点数</b>的指数增加<b>+1%</b>。` },

        cost: a => a.powBase(1.025).powBase('e1000'),
        bulk: a => a.log('e1000').log(1.025).floor().add(1),

        currency: "points",

        effect(a) {
            let x = a.mul(.01).add(1)
            return x
        },
        effectDisplay: x => formatPow(x),
    }, data);

    Upgrade.create("prestige\\1", {
        name: "更多声望",
        description() { return `每级将<b>声望点数</b>增加<b>${formatMult(this.base())}</b>。` },

        cost: a => a.sumBase(KAIZO.perkOwned(1,7) ? 1.05 : 1.1).powBase(3).mul(10),
        bulk: a => a.div(10).log(3).sumBase(KAIZO.perkOwned(1,7) ? 1.05 : 1.1, true).floor().add(1),

        currency: "prestige",

        base() { return Decimal.add(2, KAIZO.perkOwned(2,9) ? Upgrade.getEffect("prestige\\2") : 0) },
        effect(a) {
            let x = a.powBase(this.base())
            return x
        },
        effectDisplay: x => formatMult(x),
    }, data);
    Upgrade.create("prestige\\2", {
        description() { return `每级将<b>声望点数</b>效果的指数增加<b>${formatPlus(.25)}</b>。` },

        cost: a => a.pow(1.5).powBase(10).mul(1e3),
        bulk: a => a.div(1e3).log(10).root(1.5).floor().add(1),

        currency: "prestige",

        default_effect: DC.D0,
        effect(a) {
            let x = a.mul(.25)
            return x
        },
        effectDisplay: x => formatPlus(x),
    }, data);
    Upgrade.create("prestige\\3", {
        unl: () => KAIZO.perkOwned(2,6),
        description() { return `每级使前4个<b>点数升级</b>的效果增加<b>+10%</b>。` },

        cost: a => a.sumBase(1.1).powBase(KAIZO.perkOwned(2,10) ? 1e3 : 1e6).mul(1e6),
        bulk: a => a.div(1e6).log(KAIZO.perkOwned(2,10) ? 1e3 : 1e6).sumBase(1.1, true).floor().add(1),

        currency: "prestige",

        effect(a) {
            let x = a.mul(.1).add(1)
            return x
        },
        effectDisplay: x => formatPercent(x.sub(1)),
    }, data);
    Upgrade.create("prestige\\4", {
        unl: () => KAIZO.perkOwned(2,6) && KAIZO.perkOwned(2,2),
        description() { return `每级将<b>β<sub>2</sub></b>天赋的基础值增加<b>${formatPlus(.05)}</b>。` },

        cost: a => a.pow(1.25).powBase(10).mul(1e6),
        bulk: a => a.div(1e6).log(10).root(1.25).floor().add(1),

        currency: "prestige",

        default_effect: DC.D0,
        effect(a) {
            let x = a.mul(.05)
            return x
        },
        effectDisplay: x => formatPlus(x),
    }, data);

    Upgrade.create("power\\1", {
        name: "点数生成速度",
        unl: () => KAIZO.perkOwned(3,6),
        description() { return `每级将<b>点数维度</b>增加<b>${formatMult(this.base(), 3)}</b>。` },

        cost: a => a.scale(100, 2, "P").powBase(10).mul(1e3),
        bulk: a => a.div(1e3).log(10).scale(100, 2, "P", true).floor().add(1),

        currency: "powers",

        base() { return KAIZO.perkEffect(3,7).add(1.17) },
        effect(a) {
            let x = a.powBase(this.base())
            return x
        },
        effectDisplay: x => formatMult(x),
    }, data);

    return data;
}

const getInitialUpgradeGroups = () => {
    var data = {
        points: UpgradeGroup.createByPrefix("point", {
            unl: () => KAIZO.perkOwned(1,4),
            auto: () => KAIZO.perkOwned(1,5),
        }),
        prestige: UpgradeGroup.createByPrefix("prestige", {
            unl: () => KAIZO.perkOwned(2,4),
        }),
        powers: UpgradeGroup.createByPrefix("power"),
    };

    return data;
}