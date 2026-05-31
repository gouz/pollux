window.parseHash = () => {
    const choices = [
        ...LZString.decompressFromEncodedURIComponent(
            window.location.hash.slice(1),
        ).split("|"),
    ]
        .map((c) => c.trim())
        .filter((c) => c !== "");
    const uuid = choices.shift();
    return { uuid, choices };
};

window.isUUIDv7 = (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        str,
    );

window.parseColorString = (str) => {
    const match = str.match(/^(.*?)\[([^\]]+)\]$/);

    if (!match) {
        return { text: str, color: "var(--primary)" };
    }

    const [, text, colorCandidate] = match;
    const isHexColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(
        colorCandidate,
    );

    if (!isHexColor) {
        return { text: str, color: "var(--primary)" };
    }

    return { text, color: colorCandidate };
};

window.createError = (text) => {
    const el = document.createElement("div");
    el.id = "error";
    el.textContent = text;
    return el;
};
