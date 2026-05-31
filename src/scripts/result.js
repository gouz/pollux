const $main = document.querySelector("main");
const { uuid, choices } = parseHash();

if (isUUIDv7(uuid)) {
    const ws = new WebSocket(
        `ws${window.location.protocol.includes("https") ? "s" : ""}://${window.location.host}/ws?uuid=${uuid}`,
    );

    choices.forEach((choice, num) => {
        const result = document.createElement("article");
        const header = document.createElement("header");
        const label = document.createElement("span");
        const counter = document.createElement("span");
        const progress = document.createElement("progress");
        progress.setAttribute("max", "100");
        counter.classList.add("counter");
        const { text, color } = parseColorString(choice);
        label.textContent = text;
        progress.setAttribute("style", `--progress-color: ${color}`);
        header.append(label);
        header.append(counter);
        result.append(header);
        result.append(progress);
        result.dataset.vote = num;
        $main.append(result);
    });

    ws.onmessage = (event) => {
        const json = JSON.parse(event.data);
        const sum = [...json.result].reduce(
            (acc, j) => acc + j.total,
            0,
        );
        [...document.querySelectorAll("progress")].forEach(
            (progress) => {
                progress.value = 0;
            },
        );

        [...document.querySelectorAll(".counter")].forEach((e) => {
            e.textContent = "";
        });

        json.result.forEach(({ choice, total }) => {
            const $progress = document.querySelector(
                `article[data-vote="${choice}"]`,
            );
            $progress.querySelector("progress").value = Math.round(
                (100 * total) / sum,
            );
            $progress.querySelector(".counter").textContent =
                `(${total} / ${sum})`;
        });
    };
} else {
    $main.append(createError("No choice"));
}
