const $main = document.querySelector("main");
const { uuid, choices } = parseHash();
const STORAGE_KEY = "pollux_voted";

const alreadyVoted = (uuid) => {
	const votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
	return votes.includes(uuid);
};

const vote = (uuid) => {
	const votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
	if (!votes.includes(uuid)) {
		votes.push(uuid);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
	}
};

if (isUUIDv7(uuid) && choices.length) {
	if (alreadyVoted(uuid)) {
		$main.append(createError("All ready voted"));
	} else {
		choices.forEach((choice, num) => {
			const button = document.createElement("button");
			const { text, color } = parseColorString(choice);
			button.textContent = text;
			button.setAttribute("style", `--bg: ${color}`);
			$main.append(button);
			button.addEventListener("click", () => {
				vote(uuid);
				postJSON("/api/vote", { uuid, choice: num });
				[...document.querySelectorAll("button")].forEach((button) => {
					button.disabled = true;
				});
			});
		});
	}
} else {
	$main.append(createError("No choice"));
}
