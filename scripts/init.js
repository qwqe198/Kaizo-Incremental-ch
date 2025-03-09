function onLoad(start=false, str) {
    load(str ?? localStorage.getItem(SAVE_KEY));
    getInitialGameData();

    if (start) {
        Initialize();

        for (let i = 0; i < 10; i++) updateTemp();

        setInterval(() => {
            loop();
        }, 1000/FPS);

        setInterval(save, 60000);
    }
}

/**
 * @param {Element} elem - Element
 */
function makeContainerScrollHorizontally(elem) {
    let j_elem = $(elem);
    elem.addEventListener('wheel', (e) => {
        let width = elem.scrollWidth - elem.clientWidth, more = false, less = false;
        if (e.deltaY > 0) {
            if (elem.scrollLeft === width) more = true;
            j_elem.stop();
            j_elem.animate({scrollLeft: elem.scrollLeft + 200}, 200);
        }
        else {
            if (elem.scrollLeft === 0) less = true;
            j_elem.stop();
            j_elem.animate({scrollLeft: elem.scrollLeft - 200}, 200);
        }
        if (!(more || less)) e.preventDefault();
    })

    /*
    elem.addEventListener('wheel', (event) => {
        event.preventDefault();

        elem.scrollBy({
            left: event.deltaY * 2,
            behavior: 'smooth'
        });
    });
    */
}

function Initialize() {
    app = new Vue({
        el: "#app",

        data: {
            player,
            game,
            DC,
            KAIZO,
            TABS,

            format,
            formatMult,
            formatPercent,
            formatPow,

            buyMaxPointDimensions,
            wipe,
        },
    })

    Vue.component('upgrade',{
        props: ['data'],

        computed: {
            effect() { return `<br class='sub-line'><b>Effect:</b> ${this.data.effectDisplay(this.data.temp_effect)}` },

            obj_class() {
                return {
                    locked: !this.data.bought && this.data.currency.amount.lt(this.data.current_cost),
                    bought: this.data.bought,
                }
            },
        },

        template: `
        <div v-if="data && data.unl()">
            <button class="o-upgrade-button" :class="obj_class" @click="data.purchase()">
                <div class="upgrade-level" v-if="data.max > 1">Level {{ data.level.format(0) }}<span v-if="data.max < Infinity"> / {{ format(data.max,0) }}</span></div>
                <div>
                    <div v-if="data.name">{{ data.name }}<br class='sub-line'></div>
                    <div v-html="data.description"></div>
                    <div v-if="data.effectDisplay" v-html="effect"></div>
                </div>
                <div class="upgrade-cost" v-if="!data.bought">Cost: {{ data.current_cost.format(0) }} {{ data.currency.name }}</div>
            </button>
            <div class="o-upgrade-bottom">
                <button v-if="data.max > 1" @click="data.purchase(true)">Buy MAX</button>
                <button v-if="data.auto" @click="data.switchAuto()">Auto: <b v-if="player.auto_upgrades[data.id]" style="color: #0f0">ON</b><b v-else style="color: #f00">OFF</b></b></button>
            </div>
        </div>
        `,
    })

    Vue.component('upgrades',{
        props: ['data'],

        template: `
        <div v-if="data && data.unl()" class="o-upgrade-group">
            <upgrade v-for="upgrade in data.upgrades" :data="upgrade"></upgrade>
        </div>
        `,
    })

    Vue.component('reset',{
        props: ['data'],

        template: `
        <button class="o-reset-button" @click="data.reset()" :class="{locked: !data.condition()}" v-html="data.condition() ? data.gain_description(data.currency.temp) : data.condition_description()"></button>
        `,
    })

    makeContainerScrollHorizontally(document.getElementById("tabs"))
    setupTooltips()
}