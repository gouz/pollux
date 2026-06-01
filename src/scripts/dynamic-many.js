const $main = document.querySelector("main");
const uuid = window.location.hash.slice(1);

const renderButtons = (step, choices) => {
    $main.innerHTML = "";
    choices.forEach((choice, num) => {
        const button = document.createElement("button");
        const { text, color } = parseColorString(choice);
        button.textContent = text;
        button.setAttribute("style", `--bg: ${color}`);
        $main.append(button);
        button.addEventListener("click", () => {
            fetch("/api/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uuid, choice: 100 * step + num }),
            });
        });
    });
};

if (isUUIDv7(uuid)) {
    const ws = new WebSocket(
        `ws${window.location.protocol.includes("https") ? "s" : ""}://${window.location.host}/ws/dynamic?uuid=${uuid}`,
    );
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "step") {
            renderButtons(msg.step, msg.choices);
        }
    };
} else {
    $main.append(createError("Invalid poll"));
}
