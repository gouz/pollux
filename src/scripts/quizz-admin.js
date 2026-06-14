const $uuid = document.getElementById("uuid");
const $step = document.getElementById("step");
const $question = document.getElementById("question");
const $timerInput = document.getElementById("timer-input");
const $choices = document.getElementById("choices");
const $correct = document.getElementById("correct");
const $status = document.getElementById("status");
const $form = document.getElementById("form");
const $history = document.getElementById("history-list");
const $voteLink = document.getElementById("vote-link");
const $resultLink = document.getElementById("result-link");
const $playersSection = document.getElementById("players-section");
const $playersList = document.getElementById("players-list");
const $playerCount = document.getElementById("player-count");
const $startSection = document.getElementById("start-section");
const $startTimer = document.getElementById("start-timer");
const $startBtn = document.getElementById("start-btn");
const $startStatus = document.getElementById("start-status");
const $podiumBtn = document.getElementById("podium-btn");
const $podiumStatus = document.getElementById("podium-status");

const history = [];
let ws = null;
let currentStep = -1;
let _currentStepChoices = [];

const updateLinks = () => {
	const uuid = $uuid.value.trim();
	if (!uuid) return;
	$voteLink.href = `/quizz-vote#${uuid}`;
	$voteLink.textContent = `🧠 Vote: /quizz-vote#${uuid.slice(0, 8)}…`;
	$resultLink.href = `/quizz-result?uuid=${uuid}`;
	$resultLink.textContent = `📊 Results: /quizz-result?uuid=${uuid.slice(0, 8)}…`;
};

$uuid.addEventListener("input", updateLinks);

document.getElementById("generate-uuid").addEventListener("click", async () => {
	const res = await fetch("/api/uuid");
	$uuid.value = await res.text();
	$status.textContent = "✅ UUID generated";
	updateLinks();
	connectWS();
});

const connectWS = () => {
	const uuid = $uuid.value.trim();
	if (!uuid || !isUUIDv7(uuid)) return;
	if (ws) ws.close();
	const adminId = "00000000-0000-7000-8000-000000000000";
	ws = new WebSocket(
		`ws${location.protocol.includes("https") ? "s" : ""}://${location.host}/ws/quizz?uuid=${uuid}&user=${adminId}`,
	);
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "players") {
			renderPlayers(msg.players);
		}
	};
};

const renderPlayers = (players) => {
	if (players.length === 0) {
		$playersSection.style.display = "none";
		return;
	}
	$playersSection.style.display = "block";
	$playerCount.textContent = players.length;
	$playersList.innerHTML = players
		.map((p) => `<span class="player">${p.pseudo}</span>`)
		.join("");
	$startSection.style.display = players.length > 0 ? "flex" : "none";
};

$form.addEventListener("submit", async (e) => {
	e.preventDefault();
	const uuid = $uuid.value.trim();
	const step = parseInt($step.value, 10);
	const question = $question.value.trim();
	const choices = $choices.value
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s);
	const correctRaw = $correct.value.trim();
	const correct = correctRaw
		? correctRaw
				.split(",")
				.map((s) => parseInt(s.trim(), 10))
				.filter((n) => !Number.isNaN(n))
		: [];

	if (!uuid || choices.length === 0 || correct.length === 0) {
		$status.textContent = "⚠️ Fill in UUID, choices, and correct answers";
		return;
	}

	const maxIdx = choices.length - 1;
	if (correct.some((n) => n < 0 || n > maxIdx)) {
		$status.textContent = `⚠️ Correct indices must be between 0 and ${maxIdx}`;
		return;
	}

	$status.textContent = `⏳ Saving step ${step}...`;
	const res = await fetch(`/api/quizz/${uuid}/step`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ step, choices, correct, question }),
	});

	if (!res.ok) {
		$status.textContent = `❌ Error ${res.status}`;
		return;
	}

	$status.textContent = `✅ Step ${step} saved: ${choices.join(", ")}`;
	currentStep = step;
	_currentStepChoices = choices;
	history.push({ step, choices, correct, question });
	renderHistory();
	$startTimer.value = $timerInput.value;
	updateStartSection();

	$step.value = step + 1;
	$question.value = "";
	$choices.value = "";
	$correct.value = "";
	$resultLink.href = `/quizz-result?uuid=${uuid}`;
	$resultLink.textContent = `📊 Results: /quizz-result?uuid=${uuid.slice(0, 8)}…`;
});

const updateStartSection = () => {
	if (currentStep >= 0 && $playersList.children.length > 0) {
		$startSection.style.display = "flex";
	}
};

$startBtn.addEventListener("click", async () => {
	const uuid = $uuid.value.trim();
	const timer = parseInt($startTimer.value, 10) || 30;
	$startBtn.disabled = true;
	$startStatus.textContent = "⏳ Starting...";
	const res = await fetch(`/api/quizz/${uuid}/start`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ step: currentStep, timer }),
	});
	if (!res.ok) {
		$startStatus.textContent = `❌ Error ${res.status}`;
		$startBtn.disabled = false;
		return;
	}
	$startStatus.textContent = `✅ Started! Timer: ${timer}s`;
	$startBtn.disabled = false;
	const entry = document.querySelector(
		`#history-list .entry[data-step="${currentStep}"]`,
	);
	if (entry) {
		const badge = document.createElement("span");
		badge.className = "started-badge";
		badge.textContent = `▶ ${timer}s`;
		entry.querySelector(".step-num").after(badge);
	}
});

$podiumBtn.addEventListener("click", async () => {
	const uuid = $uuid.value.trim();
	if (!uuid) return;
	$podiumBtn.disabled = true;
	$podiumStatus.textContent = "⏳ Showing podium...";
	const res = await fetch(`/api/quizz/${uuid}/podium`, { method: "POST" });
	if (!res.ok) {
		$podiumStatus.textContent = `❌ Error ${res.status}`;
		$podiumBtn.disabled = false;
		return;
	}
	$podiumStatus.textContent = "✅ Podium broadcast!";
	$podiumBtn.disabled = false;
});

const renderHistory = () => {
	$history.innerHTML = "";
	$podiumBtn.disabled = history.length === 0;
	if (history.length === 0) {
		$history.innerHTML =
			'<div class="entry" style="color:var(--text-secondary)">No rounds yet</div>';
		return;
	}
	[...history].reverse().forEach((h) => {
		const entry = document.createElement("div");
		entry.className = "entry";
		entry.dataset.step = h.step;
		entry.innerHTML = `
            <span class="step-num">Q${h.step + 1}</span>
            ${h.question ? `<span style="color:var(--text)">${h.question}</span> · ` : ""}
            ${h.choices
							.map((c, i) => {
								const isCorrect = h.correct.includes(i);
								return isCorrect
									? `<span>${c} <span class="correct-badge">✓</span></span>`
									: `<span>${c}</span>`;
							})
							.join(" · ")}
        `;
		$history.append(entry);
	});
};

if (!location.hash) {
	fetch("/api/uuid")
		.then((r) => r.text())
		.then((id) => {
			$uuid.value = id;
			$status.textContent = "✅ UUID generated";
			updateLinks();
			connectWS();
		});
}
