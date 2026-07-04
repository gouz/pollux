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
			postJSON("/api/vote", { uuid, choice: 100 * step + num });
		});
	});
};

if (isUUIDv7(uuid)) {
	const ws = new WebSocket(wsURL("/ws/dynamic", { uuid }));
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "step") {
			renderButtons(msg.step, msg.choices);
		}
	};
} else {
	$main.append(createError("Invalid poll"));
}
