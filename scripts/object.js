function defineManualGet(object, key, value) {
    if (typeof value == "function") Object.defineProperty(object, key, { get: value });
    else object[key] = value;
}

function defineObjectGetSet(object, key, get_f, set_f) {
    Object.defineProperty(object, key, {
        get: get_f,
        set: set_f
    });
}