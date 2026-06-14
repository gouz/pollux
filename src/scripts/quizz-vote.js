const $main = document.querySelector("main");
const uuid = window.location.hash.slice(1);
const STORAGE_KEY = "pollux_quizz_user";
const PSEUDO_KEY = "pollux_quizz_pseudo";

let user_id = "";
let pseudo = "";
let ws = null;
let currentStep = -1;
let selected = [];
let stepReceivedAt = 0;
let timerInterval = null;

const getUserId = async () => {
	let id = localStorage.getItem(STORAGE_KEY);
	if (!id) {
		const res = await fetch("/api/uuid");
		id = await res.text();
		localStorage.setItem(STORAGE_KEY, id);
	}
	return id;
};

const getStoredPseudo = () => {
	const data = JSON.parse(localStorage.getItem(PSEUDO_KEY) || "{}");
	return data[uuid] || "";
};

const storePseudo = (p) => {
	const data = JSON.parse(localStorage.getItem(PSEUDO_KEY) || "{}");
	data[uuid] = p;
	localStorage.setItem(PSEUDO_KEY, JSON.stringify(data));
};

const showRegister = () => {
	$main.innerHTML = "";
	const existing = getStoredPseudo();
	const container = document.createElement("div");
	container.className = "register-form";
	container.innerHTML = `
        <h2 style="margin-bottom:0.5rem">🎯 Join the Quiz</h2>
        <p style="color:var(--text-secondary);margin-bottom:0.5rem">Enter your pseudo to register</p>
        <input id="pseudo-input" type="text" placeholder="Your name" value="${existing}" maxlength="30" required />
        <button id="register-btn">Join</button>
        <div id="register-status" style="font-size:0.85rem;color:var(--text-secondary)"></div>
    `;
	$main.append(container);

	document
		.getElementById("register-btn")
		.addEventListener("click", async () => {
			const input = document.getElementById("pseudo-input");
			const p = input.value.trim();
			if (!p) {
				document.getElementById("register-status").textContent =
					"⚠️ Enter a pseudo";
				return;
			}
			const btn = document.getElementById("register-btn");
			btn.disabled = true;
			btn.textContent = "⏳ Registering...";
			const res = await fetch(`/api/quizz/${uuid}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ user_id, pseudo: p }),
			});
			if (!res.ok) {
				document.getElementById("register-status").textContent =
					`❌ Registration failed (${res.status})`;
				btn.disabled = false;
				btn.textContent = "Join";
				return;
			}
			pseudo = p;
			storePseudo(p);
			showWaiting();
		});
};

const showWaiting = () => {
	$main.innerHTML = "";
	const div = document.createElement("div");
	div.className = "waiting";
	div.innerHTML = `
        <div class="spinner">⏳</div>
        <h2>Waiting for the admin to start...</h2>
        <p style="color:var(--text-secondary);margin-top:0.5rem">You're registered as <strong>${pseudo}</strong></p>
    `;
	$main.append(div);
};

const renderButtons = (step, choices, question, timer, startedAt) => {
	clearInterval(timerInterval);
	$main.innerHTML = "";
	currentStep = step;
	selected = [];
	stepReceivedAt = Date.now();

	const elapsed = stepReceivedAt - startedAt;
	const remaining = Math.max(0, Math.ceil((timer * 1000 - elapsed) / 1000));

	const timerBar = document.createElement("div");
	timerBar.className = "timer-bar";
	timerBar.innerHTML = `
        <div class="timer-digits" id="timer-digits">${remaining}s</div>
        <div class="timer-bar-fill" id="timer-bar-fill" style="width:${(remaining / timer) * 100}%"></div>
    `;
	$main.append(timerBar);

	let timeLeft = remaining;
	timerInterval = setInterval(() => {
		timeLeft--;
		const digits = document.getElementById("timer-digits");
		const fill = document.getElementById("timer-bar-fill");
		if (digits && fill) {
			digits.textContent = `${timeLeft}s`;
			const pct = (timeLeft / timer) * 100;
			fill.style.width = `${Math.max(0, pct)}%`;
			if (timeLeft <= 5) {
				digits.classList.add("urgent");
				fill.classList.add("urgent");
			}
			if (timeLeft <= 0) {
				clearInterval(timerInterval);
				digits.textContent = "⏰ Time's up!";
				fill.style.width = "0%";
				document.querySelectorAll(".quizz-choice-btn").forEach((b) => {
					b.disabled = true;
				});
				document.querySelector(".quizz-submit").disabled = true;
			}
		}
	}, 1000);

	const label = document.createElement("div");
	label.id = "step-label";
	label.textContent = question || `Question ${step + 1}`;
	$main.append(label);

	choices.forEach((choice, num) => {
		const button = document.createElement("button");
		button.className = "quizz-choice-btn";
		const { text, color } = parseColorString(choice);
		button.textContent = text;
		button.dataset.index = num;
		button.setAttribute("style", `--bg: ${color}`);
		button.addEventListener("click", () => {
			if (button.disabled) return;
			const idx = selected.indexOf(num);
			if (idx === -1) {
				selected.push(num);
				button.classList.add("selected");
			} else {
				selected.splice(idx, 1);
				button.classList.remove("selected");
			}
			const submitBtn = document.querySelector(".quizz-submit");
			if (submitBtn) submitBtn.disabled = selected.length === 0;
		});
		$main.append(button);
	});

	const wrapper = document.createElement("div");
	wrapper.style.cssText = "display:flex;justify-content:center;";

	const submitBtn = document.createElement("button");
	submitBtn.className = "quizz-submit";
	submitBtn.textContent = "Submit Answer";
	submitBtn.disabled = true;
	submitBtn.addEventListener("click", async () => {
		submitBtn.disabled = true;
		const responseTime = Date.now() - stepReceivedAt;
		const res = await fetch("/api/quizz/vote", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				uuid,
				user_id,
				step: currentStep,
				choices: selected,
				response_time_ms: responseTime,
			}),
		});
		if (res.ok) {
			const { score, total, correct, correctScore, speedBonus } =
				await res.json();
			feedback(score, total, correct, correctScore, speedBonus, responseTime);
		} else if (res.status === 408) {
			feedback(0, 0, [], 0, 0, responseTime, true);
		} else {
			feedback(0, 0, [], 0, 0, responseTime, false, "❌ Error submitting");
		}
		clearInterval(timerInterval);
	});
	wrapper.append(submitBtn);
	$main.append(wrapper);
};

const feedback = (
	score,
	total,
	_correct,
	correctScore,
	speedBonus,
	responseTime,
	timedOut,
	error,
) => {
	const div = document.createElement("div");
	div.className = "quizz-feedback";
	let text = "";
	if (error) {
		div.classList.add("wrong");
		text = error;
	} else if (timedOut) {
		div.classList.add("wrong");
		text = "⏰ Time's up! Too late to submit.";
	} else if (correctScore === total) {
		div.classList.add("correct");
		text = `✅ Correct! (${correctScore}/${total})`;
	} else if (correctScore > 0) {
		div.classList.add("partial");
		text = `⚠️ Partial (${correctScore}/${total})`;
	} else {
		div.classList.add("wrong");
		text = `❌ Incorrect (0/${total})`;
	}
	if (speedBonus > 0) {
		const secs = (responseTime / 1000).toFixed(1);
		text += ` · ⚡ +${speedBonus} speed (${secs}s)`;
	}
	div.textContent = `${text} · Total: ${score}`;
	$main.append(div);

	[...document.querySelectorAll(".quizz-choice-btn")].forEach((b) => {
		b.disabled = true;
	});
};

const handleStart = (msg) => {
	if (msg.step !== undefined) {
		currentStep = msg.step;
	}
	renderButtons(msg.step, msg.choices, msg.question, msg.timer, msg.startedAt);
};

(async () => {
	user_id = await getUserId();
	if (isUUIDv7(uuid)) {
		const stored = getStoredPseudo();
		ws = new WebSocket(
			`ws${location.protocol.includes("https") ? "s" : ""}://${location.host}/ws/quizz?uuid=${uuid}&user=${user_id}`,
		);
		ws.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			if (msg.type === "start") {
				handleStart(msg);
			}
		};
		if (stored) {
			pseudo = stored;
			fetch(`/api/quizz/${uuid}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ user_id, pseudo }),
			})
				.then((res) => {
					if (res.ok) showWaiting();
					else showRegister();
				})
				.catch(() => showRegister());
		} else {
			showRegister();
		}
	} else {
		$main.append(createError("Invalid quiz"));
	}
})();
