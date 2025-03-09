const TABS = [
    {
        unl: () => true,
        symbol: "κ",

        html() {
            return `<h3>Kaizo</h3><br class="sub-line">你的 <b>Kaizo 等级</b>是 <b>${player.kaizo.amount.format(0)}</b>。`
        },
    },{
        unl: () => true,
        symbol: "Op",

        html() {
            return `<h3>选项</h3>`
        },
    },{
        unl: () => KAIZO.active,
        symbol: "Pt",

        html() {
            return `你有 <b>${player.points.format(0)} 点数</b>。`
        },
    },{
        unl: () => KAIZO.active && KAIZO.perkOwned(2,1),
        symbol: "Pr",

        html() {
            return `<h3>声望</h3><br class="sub-line">你有 <b>${player.prestige_points.format(0)} 声望点数 (PP)</b>。<br class="sub-line"><i>需要至少 <b>${format(1e15)}</b> 点数才能获得，并会重置你的点数和相关升级。</i>`
        },
    },{
        unl: () => KAIZO.active && KAIZO.perkOwned(3,1),
        symbol: "PD",

        html() {
            return `你有 <b>${player.powers.format(0)} 能量</b>。`
        },
    },
]

TABS.forEach((tab, i) => {
    tooltip_funcs['tab-btn-' + i] = tab.html ?? (() => "???");
});