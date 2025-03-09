const D = x => new Decimal(x);

const DC = {
    D0: D(0),
    D1: D(1),

    D10: D(10),
    DE10: D(1e10),

    DE308: Decimal.dNumberMax,

    DINF: Decimal.dInf,
    DNAN: Decimal.dNaN,
}

function simpleCost(x,type,...arg) {
    switch (type) {
        case "A": { // a*(1+b*x), b > 0
            let [base,increment] = arg
            return Decimal.mul(x,increment).add(1).mul(base)
        }
        case "AI": { // inverse of A
            let [base,increment] = arg
            return Decimal.div(x,base).sub(1).div(increment)
        }
        case "E": { // a*b^x, b > 1
            let [base,exponent] = arg
            return Decimal.pow(exponent,x).mul(base)
        }
        case "EI": { // inverse of E
            let [base,exponent] = arg
            return Decimal.div(x,base).log(exponent)
        }
        case "EA": { // a*(1+b*x)*c^x, b > 0, c > 1
            let [base,increment,exponent] = arg
            return Decimal.pow(exponent,x).mul(Decimal.mul(x,increment).add(1)).mul(base)
        }
        case "EAI": { // inverse of EA
            let [base,increment,exponent] = arg
            let ln = Decimal.ln(exponent)
            return ln.mul(x).mul(Decimal.root(exponent,increment)).div(base).div(increment).lambertw().mul(increment).sub(ln).div(ln).div(increment)
        }
        default: {
            return E(0)
        }
    }
}

function sumSimpleCost(x,type,...arg) {
    switch (type) {
        case "A": { // b > 0, a + a*(1+b) + a*(1+b*2) + ... + a*(1+b*(x-1))
            let [base,increment] = arg
            return Decimal.sub(x,1).mul(increment).add(2).mul(x).mul(base).div(2)
        }
        case "AI": { // inverse of A
            let [base,increment] = arg
            return F.solveQuadratic(increment,Decimal.sub(2,increment),Decimal.div(x,base).mul(-2))
        }
        case "E": { // b > 1, a + a*b + a*b^2 + ... + a*b^(x-1)
            let [base,exponent] = arg
            return Decimal.pow(exponent,x).sub(1).div(Decimal.sub(exponent,1)).mul(base)
        }
        case "EI": { // inverse of E
            let [base,exponent] = arg
            return Decimal.div(x,base).mul(Decimal.sub(exponent,1)).add(1).log(exponent)
        }

        // Experimental

        case "EA": { // b > 0, c > 1, a + a*(1+b)*c + a*(1+b*2)*c^2 + ... + a*(1+b*(x-1))*c^(x-1)
            let [base,increment,exponent] = arg
            return Decimal.sub(increment,1).mul(exponent).add(Decimal.pow(exponent,Decimal.add(x,1)).mul(Decimal.sub(x,1).mul(increment).add(1))).sub(Decimal.pow(exponent,x).mul(Decimal.mul(x,increment).add(1))).add(1).div(Decimal.sub(exponent,1).sqr()).mul(base)
        }
        case "EAI": { // inverse of EA
            let [base,increment,exponent] = arg
            x = Decimal.div(x,base)
            let ln = Decimal.ln(exponent), bc = Decimal.sub(exponent,1).mul(increment), cb = Decimal.sub(increment,1).mul(exponent)
            return Decimal.sqr(exponent).add(1).mul(x).sub(Decimal.mul(x,2).add(increment).sub(1).mul(exponent)).sub(1).mul(Decimal.pow(exponent,cb.add(1).div(Decimal.sub(1,exponent).mul(increment))).mul(ln)).div(bc).lambertw().mul(bc).add(ln.mul(cb.add(1))).div(ln.mul(bc))
        }

        default: {
            return E(0)
        }
    }
}

Decimal.prototype.clone = function() {
    return this
}

Decimal.prototype.softcap = function (start, power, mode, dis=false) {
    var x = this.clone()
    if (!dis&&x.gte(start)) {
        if ([0, "pow"].includes(mode)) x = x.div(start).max(1).pow(power).mul(start)
        if ([1, "mul"].includes(mode)) x = x.sub(start).div(power).add(start)
        if ([2, "exp"].includes(mode)) x = expPow(x.div(start), power).mul(start)
        if ([3, "log"].includes(mode)) x = x.div(start).log(power).add(1).mul(start)
    }
    return x
}

Decimal.prototype.scale = function (s, p, mode, rev=false) {
    var x = this.clone()

    if (Decimal.lte(x,s)) return x

    switch (mode) {
        case 'L':
            // (x-s)*p+s
            return rev ? x.sub(s).div(p).add(s) : x.sub(s).mul(p).add(s)
        case 'P':
            // (x/s)^p*s
            return rev ? x.div(s).root(p).mul(s) : x.div(s).pow(p).mul(s)
        case 'E1':
            // p^(x-s)*s
            return rev ? x.div(s).max(1).log(p).add(s) : Decimal.pow(p,x.sub(s)).mul(s)
        case 'E2':
            // p^(x/s-1)*s, p >= 2.71828
            return rev ? x.div(s).max(1).log(p).add(1).mul(s).min(x) : Decimal.pow(p,x.div(s).sub(1)).mul(s).max(x)
        case 'ME1': {
            // p^(x-s)*x
            let ln_p = Decimal.ln(p)
            return rev ? Decimal.pow(p,s).mul(x).mul(ln_p).lambertw().div(ln_p) : Decimal.pow(p,x.sub(s)).mul(x)
        }
        case 'ME2': {
            // p^(x/s-1)*x
            let ln_p = Decimal.ln(p)
            return rev ? x.mul(p).mul(ln_p).div(s).lambertw().mul(s).div(ln_p) : Decimal.pow(p,x.div(s).sub(1)).mul(x)
        }
        case 'D': {
            // 10^((lg(x)/s)^p*s)
            let s10 = Decimal.log10(s)
            return rev ? Decimal.pow(10,x.log10().div(s10).root(p).mul(s10)) : Decimal.pow(10,x.log10().div(s10).pow(p).mul(s10))
        }
        default: {
            return x
        }
    }
}

function overflow(number, start, power, meta=1){
    if(isNaN(number.mag))return new Decimal(0);
    start=Decimal.iteratedexp(10,meta-1,1.0001).max(start);
    if(number.gte(start)){
        let s = start.iteratedlog(10,meta)
        number=Decimal.iteratedexp(10,meta,number.iteratedlog(10,meta).div(s).pow(power).mul(s));
    }
    return number;
}

Decimal.prototype.overflow = function (start, power, meta) { return overflow(this.clone(), start, power, meta) }

function sumBase(x,a) {
    return Decimal.pow(a,x).sub(1).div(Decimal.sub(a,1))
}
function revSumBase(x,a) {
    return Decimal.mul(x,Decimal.sub(a,1)).add(1).log(a)
}

Decimal.prototype.sumBase = function(a,rev=false) { return rev ? revSumBase(this,a) : sumBase(this,a) }

function powPO(x,b,rev=false) {
    if (Decimal.lt(b,1.4285714287176406e-8)) {
        return rev ? Decimal.ln(x).div(b) : Decimal.mul(x,b).exp();
    } else {
        return rev ? Decimal.log(x,Decimal.add(b,1)) : Decimal.add(b,1).pow(x);
    }
}

Decimal.prototype.powPO = function(x,rev) { return powPO(this,x,rev) }

function sumBasePO(x,a,rev=false) {
    if (Decimal.lte(a,0)) return x
    return rev ? Decimal.mul(x,a).add(1).powPO(a,true) : powPO(x,a).sub(1).div(a)
}

Decimal.prototype.sumBasePO = function(x,rev) { return sumBasePO(this,x,rev) }

function calcLevelBonus(l,l0,b) {
    var r = Decimal.div(l,l0).floor(), c = Decimal.sub(l,r.mul(l0))
    return sumBase(r,b,l0).add(Decimal.pow(b,r).mul(c))
}

function expPow(a,b) { return Decimal.lt(a,1) ? Decimal.pow(a,b) : Decimal.pow(10,Decimal.log10(a).add(1).pow(b).sub(1)) }

function listedCost(x,list=[],rev) {
    return rev ? Decimal.add(list.findLastIndex(y => Decimal.gte(x,y)),1) : list[x] ?? EINF
}

Decimal.prototype.listedCost = function(list,rev) { return listedCost(this,list,rev) }

Decimal.prototype.powBase = function(b) { return Decimal.pow(b,this) }