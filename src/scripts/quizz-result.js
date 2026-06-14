const $display = document.getElementById("display");
const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get("uuid");

let ws = null;
let phase = "lobby";
let players = [];
let timerInterval = null;
let transitionTimeout = null;
let questionState = null;

const PHASE = {
	LOBBY: "lobby",
	QUESTION: "question",
	RESULTS: "results",
	SCOREBOARD: "scoreboard",
	PODIUM: "podium",
};

const showOverlay = (text, duration) => {
	const overlay = document.createElement("div");
	overlay.className = "phase-overlay";
	overlay.innerHTML = `<h2>${text}</h2>`;
	$display.append(overlay);
	if (duration) {
		setTimeout(() => overlay.remove(), duration);
	}
	return overlay;
};

const renderLobby = () => {
	phase = PHASE.LOBBY;
	$display.innerHTML = `
    <div id="lobby">
      ${players.map((p, i) => `<span class="name" style="animation-delay:${(i * 0.05).toFixed(2)}s">${p.pseudo}</span>`).join("")}
      <div class="waiting-text">En attente du début du quizz…</div>
    </div>`;
};

const updatePlayers = () => {
	if (phase === PHASE.LOBBY) {
		renderLobby();
	}
};

const renderQuestion = (msg) => {
	clearInterval(timerInterval);
	phase = PHASE.QUESTION;
	questionState = msg;
	const elapsed = Date.now() - msg.startedAt;
	const remaining = Math.max(0, Math.ceil((msg.timer * 1000 - elapsed) / 1000));

	$display.innerHTML = `
    <div id="question-phase" style="display:flex">
      <div class="q-timer" id="q-timer">${remaining}s</div>
      <div class="q-bar-bg">
        <div class="q-bar-fill" id="q-bar-fill" style="width:${(remaining / msg.timer) * 100}%"></div>
      </div>
      <div class="q-question">${msg.question || `Question ${(msg.step || 0) + 1}`}</div>
      <div class="q-choices">
        ${msg.choices.map((c) => `<span class="q-choice">${c}</span>`).join("")}
      </div>
    </div>`;

	let timeLeft = remaining;
	timerInterval = setInterval(() => {
		timeLeft--;
		const digits = document.getElementById("q-timer");
		const fill = document.getElementById("q-bar-fill");
		if (digits && fill) {
			digits.textContent = `${timeLeft}s`;
			const pct = (timeLeft / msg.timer) * 100;
			fill.style.width = `${Math.max(0, pct)}%`;
			if (timeLeft <= 5) {
				digits.classList.add("urgent");
				fill.classList.add("urgent");
			}
			if (timeLeft <= 0) {
				clearInterval(timerInterval);
				digits.textContent = "⏰";
				fill.style.width = "0%";
				transitionTimeout = setTimeout(() => renderResults(), 1000);
			}
		}
	}, 1000);
};

const renderResults = () => {
	phase = PHASE.RESULTS;
	fetch(`/api/quizz/${uuid}/step?step=${questionState.step}`)
		.then((r) => r.json())
		.then((data) => {
			const correct = data.correct || [];
			const choices = data.choices || questionState.choices;
			const question = data.question || questionState.question;
			fetch(`/api/quizz/${uuid}/results?step=${questionState.step}`)
				.then((r) => r.json())
				.then(({ result }) => {
					const sum = result.reduce((acc, r) => acc + r.total, 0) || 1;
					$display.innerHTML = `
            <div id="results-phase" style="display:flex">
              <div class="r-question">${question || `Question ${(questionState.step || 0) + 1}`}</div>
              <div class="r-correct">✅ ${correct.map((i) => choices[i]).join(", ")}</div>
              <div class="r-bars">
                ${choices
									.map((c, i) => {
										const isCorrect = correct.includes(i);
										const r = result.find(
											(r) => r.choice === 100 * questionState.step + i,
										);
										const total = r ? r.total : 0;
										const pct = Math.round((100 * total) / sum);
										const color = isCorrect ? "#4ade80" : "#6366f1";
										return `
                      <div class="r-bar-row">
                        <span class="r-bar-label">${c}${isCorrect ? ' <span class="check">✓</span>' : ""}</span>
                        <div class="r-bar-track">
                          <div class="r-bar-fill" style="width:${pct}%;background:${color}"></div>
                        </div>
                        <span class="r-bar-count">${total}</span>
                      </div>`;
									})
									.join("")}
              </div>
            </div>`;
					transitionTimeout = setTimeout(() => renderScoreboard(), 8000);
				});
		});
};

const renderScoreboard = () => {
	phase = PHASE.SCOREBOARD;
	fetch(`/api/quizz/${uuid}/scores`)
		.then((r) => r.json())
		.then(({ scores }) => {
			if (!scores || scores.length === 0) {
				$display.innerHTML = `<div id="scoreboard-phase" style="display:flex"><h2>🏆 Classement</h2><p style="color:rgba(255,255,255,0.4)">Aucun score pour l'instant</p></div>`;
				return;
			}
			scores.sort((a, b) => b.score - a.score);
			$display.innerHTML = `
        <div id="scoreboard-phase" style="display:flex">
          <h2>🏆 Classement</h2>
          <div class="sb-list">
            ${scores
							.map(
								(s, i) => `
              <div class="sb-entry" style="animation-delay:${(i * 0.06).toFixed(2)}s">
                <span class="sb-rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">#${i + 1}</span>
                <span class="sb-name">${s.pseudo}</span>
                <span class="sb-score">${s.score}</span>
              </div>`,
							)
							.join("")}
          </div>
        </div>`;
		});
};

const renderPodium = (scores) => {
	phase = PHASE.PODIUM;
	if (!scores || scores.length === 0) return;
	const top3 = scores.sort((a, b) => b.score - a.score).slice(0, 3);
	$display.innerHTML = `
    <div id="podium-phase" style="display:flex">
      <h1>🏆 Podium</h1>
      <div class="podium-grid">
        ${[1, 0, 2]
					.map(
						(idx) => `
          <div class="podium-item">
            ${top3[idx] ? `<div class="medal">${idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</div>` : ""}
            ${top3[idx] ? `<div class="p-name">${top3[idx].pseudo}</div>` : ""}
            ${top3[idx] ? `<div class="p-score">${top3[idx].score} pts</div>` : ""}
            <div class="p-bar"><span class="p-rank">#${idx + 1}</span></div>
          </div>`,
					)
					.join("")}
      </div>
    </div>`;
};

const handleStart = (msg) => {
	clearTimeout(transitionTimeout);
	clearInterval(timerInterval);
	const _overlay = showOverlay("⚡ Question !", 800);
	setTimeout(() => renderQuestion(msg), 800);
};

const _handleResult = () => {};

const _handleScore = () => {
	if (phase === PHASE.RESULTS || phase === PHASE.SCOREBOARD) {
		fetch(`/api/quizz/${uuid}/scores`)
			.then((r) => r.json())
			.then(() => {
				if (phase === PHASE.SCOREBOARD) renderScoreboard();
			});
	}
};

const handlePodium = (msg) => {
	clearTimeout(transitionTimeout);
	clearInterval(timerInterval);
	const _overlay = showOverlay("🏆 Quiz terminé !", 1200);
	if (msg.scores) {
		setTimeout(() => renderPodium(msg.scores), 1200);
	} else {
		fetch(`/api/quizz/${uuid}/scores`)
			.then((r) => r.json())
			.then(({ scores }) => {
				setTimeout(() => renderPodium(scores), 1200);
			});
	}
};

const isUUIDv7 = (str) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		str,
	);

if (isUUIDv7(uuid)) {
	fetch(`/api/quizz/${uuid}/players`)
		.then((r) => {
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			return r.json();
		})
		.then(({ players: p }) => {
			players = p || [];
			renderLobby();
		})
		.catch((err) => {
			console.error("Failed to fetch players:", err);
		});

	const connectWS = () => {
		ws = new WebSocket(
			`ws${location.protocol.includes("https") ? "s" : ""}://${location.host}/ws/quizz?uuid=${uuid}&user=00000000-0000-7000-8000-000000000000`,
		);
		ws.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			if (msg.type === "players") {
				players = msg.players || [];
				updatePlayers();
			}
			if (msg.type === "start") {
				handleStart(msg);
			}
			if (msg.type === "result" && msg.step === questionState?.step) {
				if (phase === PHASE.QUESTION) {
					clearTimeout(transitionTimeout);
					transitionTimeout = setTimeout(() => renderResults(), 1000);
				} else if (phase === PHASE.RESULTS) {
					renderResults();
				}
			}
			if (msg.type === "score" && msg.step === questionState?.step) {
				if (phase === PHASE.SCOREBOARD) {
					renderScoreboard();
				}
			}
			if (msg.type === "podium") {
				handlePodium(msg);
			}
		};
		ws.onerror = () => console.error("WS error");
		ws.onclose = () => {
			setTimeout(connectWS, 2000);
		};
	};
	connectWS();
} else {
	$display.innerHTML = `<p style='color:rgba(255,255,255,0.5)'>Invalid quiz UUID: <code>${uuid || "(missing)"}</code><br>Expected format: <code>0194f1e0-...-7...-[89ab]...</code></p>`;
}
