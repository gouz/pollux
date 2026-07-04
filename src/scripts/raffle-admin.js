const $uuid = document.getElementById("uuid");
const $status = document.getElementById("status");
const $playerList = document.getElementById("player-list");
const $wheelSection = document.getElementById("wheel-section");
const $canvas = document.getElementById("wheel-canvas");
const $spinBtn = document.getElementById("spin-btn");
const $winnerDisplay = document.getElementById("winner-display");
const $winnerName = document.getElementById("winner-name");
const $voteLink = document.getElementById("vote-link");

const COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#85C1E9","#F0B27A","#82E0AA","#F1948A","#73C6B6","#A29BFE","#FDCB6E"];

let players = [];
let ws = null;
let isSpinning = false;
let currentRotation = 0;
let winnerIndex = -1;
let winnerPseudo = "";

const updateLinks = () => {
	const uuid = $uuid.value.trim();
	if (!uuid) return;
	$voteLink.href = `/raffle-vote#${uuid}`;
	$voteLink.textContent = `🎲 Inscription: /raffle-vote#${uuid.slice(0, 8)}…`;
};

$uuid.addEventListener("input", updateLinks);

document.getElementById("generate-uuid").addEventListener("click", async () => {
	$uuid.value = await apiUUID();
	$status.textContent = "✅ UUID généré";
	updateLinks();
	connectWS();
});

const connectWS = () => {
	const uuid = $uuid.value.trim();
	if (!uuid || !isUUIDv7(uuid)) return;
	if (ws) ws.close();
	ws = new WebSocket(wsURL("/ws/raffle", { uuid }));
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "players") {
			players = msg.players || [];
			renderPlayers();
			drawWheel();
		} else if (msg.type === "winner" && !winnerPseudo) {
			const idx = players.findIndex((p) => p.user_id === msg.winnerId);
			if (idx !== -1) {
				winnerIndex = idx;
				winnerPseudo = msg.winnerPseudo;
				$winnerDisplay.classList.add("show");
				$winnerName.textContent = winnerPseudo;
			}
		}
	};
};

const renderPlayers = () => {
	$playerList.innerHTML = players.map((p) =>
		`<span class="chip">${p.pseudo}</span>`
	).join("");
	if (players.length >= 2 && !isSpinning && winnerIndex === -1) {
		$spinBtn.disabled = false;
	}
};

const drawWheel = () => {
	const n = players.length;
	if (n === 0) {
		$wheelSection.style.display = "none";
		return;
	}
	$wheelSection.style.display = "flex";
	const ctx = $canvas.getContext("2d");
	const cx = $canvas.width / 2;
	const cy = $canvas.height / 2;
	const radius = Math.min(cx, cy) - 20;
	const arc = (2 * Math.PI) / n;

	ctx.clearRect(0, 0, $canvas.width, $canvas.height);

	for (let i = 0; i < n; i++) {
		const startAngle = currentRotation + i * arc;
		const endAngle = startAngle + arc;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.arc(cx, cy, radius, startAngle, endAngle);
		ctx.closePath();
		ctx.fillStyle = COLORS[i % COLORS.length];
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.lineWidth = 2;
		ctx.stroke();

		const midAngle = startAngle + arc / 2;
		const textRadius = radius * 0.4;
		const tx = cx + Math.cos(midAngle) * textRadius;
		const ty = cy + Math.sin(midAngle) * textRadius;
		ctx.save();
		ctx.translate(tx, ty);
		if (midAngle > Math.PI / 2 && midAngle < 3 * Math.PI / 2) {
			ctx.rotate(midAngle + Math.PI);
			ctx.textAlign = "right";
		} else {
			ctx.rotate(midAngle);
			ctx.textAlign = "left";
		}
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#fff";
		ctx.font = `bold ${Math.max(13, Math.min(20, 350 / n))}px -apple-system, sans-serif`;
		const label = players[i].pseudo;
		const maxWidth = radius * 0.5;
		if (ctx.measureText(label).width > maxWidth) {
			let truncated = label;
			while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 1) {
				truncated = truncated.slice(0, -1);
			}
			ctx.fillText(truncated + "…", 0, 0);
		} else {
			ctx.fillText(label, 0, 0);
		}
		ctx.restore();
	}

	ctx.beginPath();
	ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
	ctx.fillStyle = "#fff";
	ctx.fill();
	ctx.strokeStyle = "rgba(0,0,0,0.1)";
	ctx.lineWidth = 2;
	ctx.stroke();
};

const revealWinner = () => {
	const uuid = $uuid.value.trim();
	if (!uuid) return;
	fetch(`/api/raffle/${uuid}/reveal`, { method: "POST" }).catch(() => {});
};

const spinWheel = (targetIndex) => {
	if (isSpinning || players.length < 2) return;
	isSpinning = true;
	$spinBtn.disabled = true;
	$spinBtn.textContent = "🎰 En cours...";
	$spinBtn.classList.add("spinning");
	$winnerDisplay.classList.remove("show");

	const n = players.length;
	const arc = (2 * Math.PI) / n;
	const targetAngle = (3 * Math.PI) / 2 - targetIndex * arc - arc / 2;
	const fullSpins = 5 * 2 * Math.PI;
	const startRotation = currentRotation;
	const endRotation = startRotation + fullSpins + targetAngle - (startRotation % (2 * Math.PI));
	const duration = 4000;
	const startTime = performance.now();

	const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

	const animate = (now) => {
		const elapsed = now - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const eased = easeOutCubic(progress);
		currentRotation = startRotation + (endRotation - startRotation) * eased;
		drawWheel();
		if (progress < 1) {
			requestAnimationFrame(animate);
		} else {
			isSpinning = false;
			$spinBtn.classList.remove("spinning");
			$spinBtn.textContent = "🎰 Lancer la roue";
			$spinBtn.disabled = true;
			if (winnerPseudo) {
				$winnerDisplay.classList.add("show");
				$winnerName.textContent = winnerPseudo;
				revealWinner();
			}
		}
	};
	requestAnimationFrame(animate);
};

$spinBtn.addEventListener("click", async () => {
	const uuid = $uuid.value.trim();
	if (!uuid) return;
	$spinBtn.disabled = true;
	$spinBtn.textContent = "🎰 Tirage en cours...";
	const res = await fetch(`/api/raffle/${uuid}/spin`, { method: "POST" });
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		$status.textContent = `❌ ${data.error || "Erreur"}`;
		$spinBtn.disabled = false;
		$spinBtn.textContent = "🎰 Lancer la roue";
		return;
	}
	const data = await res.json();
	const idx = players.findIndex((p) => p.user_id === data.winnerId);
	if (idx !== -1) {
		winnerIndex = idx;
		winnerPseudo = data.winnerPseudo;
		spinWheel(idx);
	}
});

if (!location.hash) {
	apiUUID().then((id) => {
		$uuid.value = id;
		$status.textContent = "✅ UUID généré";
		updateLinks();
		connectWS();
	});
}
