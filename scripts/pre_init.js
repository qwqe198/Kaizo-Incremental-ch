var player, game, app, temp;
const FPS = 30;

const dev = {
    speed: 1,
    increaseKaizo(v=1) {
        player.kaizo.amount = player.kaizo.amount.add(v);
        player.kaizo.unspent = player.kaizo.unspent.add(v);
    },
}