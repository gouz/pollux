const $main = document.querySelector("main");
const { uuid, choices } = parseHash();

if (isUUIDv7(uuid) && choices.length) {
    choices.forEach((choice, num) => {
        const button = document.createElement("button");
        const { text, color } = parseColorString(choice);
        button.textContent = text;
        button.setAttribute("style", `--bg: ${color}`);
        $main.append(button);
        button.addEventListener("click", () => {
            fetch("/api/vote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uuid,
                    choice: num,
                }),
            });
        });
    });
} else {
    $main.append(createError("No choice"));
}
