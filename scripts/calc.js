function calc(dt) {
    if (player.kaizo.active) {
        PointDimension.ticks(dt);

        PassiveCurrency.ticks(dt);

        Upgrade.ticks();
    }

    game.time += dt
    player.time_played += dt
}