const $main = document.querySelector("main");
const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get("uuid");
const step = parseInt(urlParams.get("step") ?? "", 10);

const render = (choices, results) => {
	$main.innerHTML = "";
	const sum = results.reduce((acc, r) => acc + r.total, 0);
	choices.forEach((choice, num) => {
		const result = results.find((r) => r.choice === 100 * step + num);
		const total = result ? result.total : 0;
		const pct = sum > 0 ? Math.round((100 * total) / sum) : 0;

		const article = document.createElement("article");
		const header = document.createElement("header");
		const label = document.createElement("span");
		const counter = document.createElement("span");
		const progress = document.createElement("progress");
		progress.setAttribute("max", "100");
		progress.value = pct;
		counter.classList.add("counter");
		const { text, color } = parseColorString(choice);
		label.textContent = text;
		progress.setAttribute("style", `--progress-color: ${color}`);
		counter.textContent = `(${total} / ${sum})`;
		header.append(label);
		header.append(counter);
		article.append(header);
		article.append(progress);
		$main.append(article);
	});
};

if (isUUIDv7(uuid) && !Number.isNaN(step)) {
	(async () => {
		const res = await fetch(`/api/dynamic/${uuid}/step?step=${step}`);
		if (!res.ok) {
			$main.append(createError("No choices for this step"));
			return;
		}
		const { choices } = await res.json();
		const init = await fetch(`/api/vote/${uuid}?step=${step}`);
		const { result } = await init.json();
		render(choices, result);
		const ws = new WebSocket(wsURL("/ws/dynamic", { uuid }));
		ws.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			if (msg.type === "result" && msg.step === step) {
				render(choices, msg.result);
			}
		};
	})();
} else {
	$main.append(createError("Invalid poll"));
}
