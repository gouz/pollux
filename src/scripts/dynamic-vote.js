const $main = document.querySelector("main");
const uuid = window.location.hash.slice(1);
const STORAGE_KEY = "pollux_dynamic_voted";

const getVotedKey = (uuid, step) => `${uuid}:${step}`;

const alreadyVoted = (uuid, step) => {
	const votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
	return votes.includes(getVotedKey(uuid, step));
};

const markVoted = (uuid, step) => {
	const votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
	const key = getVotedKey(uuid, step);
	if (!votes.includes(key)) {
		votes.push(key);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
	}
};

let currentStep = -1;

const renderButtons = (step, choices) => {
	$main.innerHTML = "";
	choices.forEach((choice, num) => {
		const button = document.createElement("button");
		const { text, color } = parseColorString(choice);
		button.textContent = text;
		button.setAttribute("style", `--bg: ${color}`);
		$main.append(button);
		button.addEventListener("click", () => {
			markVoted(uuid, step);
			postJSON("/api/vote", { uuid, choice: 100 * step + num });
			[...document.querySelectorAll("button")].forEach((b) => {
				b.disabled = true;
			});
		});
	});
};

if (isUUIDv7(uuid)) {
	const ws = new WebSocket(wsURL("/ws/dynamic", { uuid }));
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "step") {
			currentStep = msg.step;
			if (alreadyVoted(uuid, currentStep)) {
				$main.innerHTML = "";
				$main.append(createError("Already voted"));
			} else {
				renderButtons(msg.step, msg.choices);
			}
		}
	};
} else {
	$main.append(createError("Invalid poll"));
}
