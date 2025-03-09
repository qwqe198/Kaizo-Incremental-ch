const ST_NAMES = [
	null, [
		["","U","D","T","Qa","Qt","Sx","Sp","Oc","No"],
		["","Dc","Vg","Tg","Qag","Qtg","Sxg","Spg","Ocg","Nog"],
		["","Ce","De","Te","Qae","Qte","Sxe","Spe","Oce","Noe"],
	],[
		["","Mi","Mc","Na","Pc","Fm","At","Zp","Yc","Xn"],
		["","Me","Du","Tr","Te","Pe","He","Hp","Ot","En"],
		["","c","Ic","TCn","TeC","PCn","HCn","HpC","OCn","ECn"],
		["","Hc","DHe","THt","TeH","PHc","HHe","HpH","OHt","EHc"]
	]
]

const ST_TIERS = [
    null,
    x => {
        return ST_NAMES[1][0][x % 10] +
        ST_NAMES[1][1][Math.floor(x / 10) % 10] +
        ST_NAMES[1][2][Math.floor(x / 100)]
    },
    x => {
        let o = x % 10
        let t = Math.floor(x / 10) % 10
        let h = Math.floor(x / 100) % 10
  
        let r = ''
        if (x < 10) return ST_NAMES[2][0][x]
        if (t == 1 && o == 0) r += "Vec"
        else r += ST_NAMES[2][1][o] + ST_NAMES[2][2][t]
        r += ST_NAMES[2][3][h]
  
        return r
    },
]

function toNonZeroFixed(amount, precision) {
    return precision > 0 ? +amount.toFixed(precision)+"" : amount.toFixed(0);
}

function formatCommas(amount, precision) {
    if (!(amount instanceof Decimal)) amount = D(amount);

    return amount.lt(.5 * 10 ** -precision) ? "0" : amount.toFixed(Math.max(0, precision - amount.log10().floor().max(0))).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function format(amount, precision = 2, commas = 6, type='mixed_sc') {
    if (!(amount instanceof Decimal)) amount = D(amount);

    if (amount.eq(0)) return "0";
    if (isNaN(amount.mag)) return "NaN";

    var neg = amount.lt(0) ? "-" : "";
    amount = amount.abs();

    if (!amount.isFinite()) return neg + "∞";

    var e = amount.log10().floor();

    switch (type) {
        case 'sc': {
            if (e.lt(commas)) return neg + formatCommas(amount, precision);

            var ee = e.log10().floor();

            if (amount.gte("eeee15")) {
                let slog = amount.slog()
                return neg + "E" + format(Decimal.tetrate(10,slog.mod(1).add(1)),3) + "#" + format(slog.floor().sub(1),0) //(slog.gte(1e9)?'':E(10).pow(slog.sub(slog.floor())).toFixed(4)) + "F" + format(slog.floor(), 0)
            }

            return neg + (ee.lt(6) ? amount.div(e.pow10()).toFixed(Math.max(0, 3 - ee.max(2).sub(2))) : "") + "e" + format(e,0,9);
        }
        case 'st': {
            let e3 = amount.log(1e3).floor()
			if (e3.lt(1)) {
				return neg + formatCommas(amount, precision);
			} else {
				let e3_mul = e3.mul(3)
				let ee = e3.log10().floor()
				if (ee.gte(3000)) return "e"+format(e, precision, commas, "st");

				let final = ""
				if (e3.lt(4)) final = ["", "K", "M", "B"][Math.round(e3.toNumber())];
				else {
					let ee3 = Math.floor(e3.log(1e3).toNumber())
					if (ee3 < 100) ee3 = Math.max(ee3 - 1, 0)
					e3 = e3.sub(1).div(Decimal.pow10(ee3 * 3))
					while (e3.gt(0)) {
						let div1000 = e3.div(1e3).floor()
						let mod1000 = e3.sub(div1000.mul(1e3)).floor().toNumber()
						if (mod1000 > 0) {
							if (mod1000 == 1 && !ee3) final = "U";
							if (ee3) final = ST_TIERS[2](ee3) + (final ? "-" + final : "");
							if (mod1000 > 1) final = ST_TIERS[1](mod1000) + final;
						}
						e3 = div1000
						ee3++
					}
				}

				let m = amount.div(e3_mul.pow10())
				return neg + (ee.gte(10)?'':m.toFixed(Decimal.sub(3,e.sub(e3_mul)).max(0).toNumber())) + final
			}
        }
        case 'mixed_sc': {
            if (e.lt(commas)) return neg + formatCommas(amount, precision);

            if (e.lt(63)) return neg + format(amount, precision, commas, "st");
            
            return neg + format(amount, precision, commas, "sc");
        }
        default:
            return neg + format(amount, precision, commas);
    }
}

const DT = Decimal.tetrate(10,6)

function formatGain(a,e) {
    const g = Decimal.add(a,e.div(FPS))

    if (g.neq(a)) {
        if (a.gte(DT)) {
            var oom = Decimal.slog(g, 10).sub(Decimal.slog(a, 10)).mul(FPS)
            if (oom.gte(1e-3)) return "(+" + oom.format() + " OoMs^^2/s)"
        }

        if (a.gte('ee100')) {
            var tower = Math.floor(Decimal.slog(a, 10).toNumber() - 1.3010299956639813);
    
            var oom = Decimal.iteratedlog(g,10,tower).sub(Decimal.iteratedlog(a,10,tower)).mul(FPS), rated = false;
    
            if (oom.gte(1)) rated = true
            else if (tower > 2) {
                tower--
                oom = Decimal.iteratedlog(g,10,tower).sub(Decimal.iteratedlog(a,10,tower)).mul(FPS)
                if (oom.gte(1)) rated = true
            }
    
            if (rated) return "(+" + oom.format() + " OoMs^"+tower+"/s)"
        }
    
        if (a.gte(1e100)) {
            const oom = g.div(a).log10().mul(FPS)
            if (oom.gte(1)) return "(+" + oom.format() + " OoMs/s)"
        }
    }

    return "(" + (e.lt(0) ? "" : "+") + format(e) + "/s)"
}

const formatPlus = (x, precision) => (Decimal.gte(x,0) ? "+" : "") + format(x, precision);
const formatMult = (x, precision) => Decimal.lt(x,1) ? "/" + format(Decimal.pow(x, -1)) : "×" + format(x, precision);
const formatPow = (x, precision) => "^" + format(x, precision);
const formatPercent = (x, precision) => format(Decimal.mul(x,100), precision) + "%";

Decimal.prototype.format = function(precision, commas, type) { return format(this, precision, commas, type) };
Decimal.prototype.formatGain = function(gain) { return formatGain(this, gain) };