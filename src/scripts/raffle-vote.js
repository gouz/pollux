const uuid = window.location.hash.slice(1);
const $pseudo = document.getElementById("pseudo");
const $waiting = document.getElementById("waiting");
const $result = document.getElementById("result");
const $resultText = document.getElementById("result-text");
const $resultSub = document.getElementById("result-sub");

if (!isUUIDv7(uuid)) {
	$waiting.textContent = "⚠️ Lien invalide";
} else {
	const userId = crypto.randomUUID();

	fetch(`/api/raffle/${uuid}/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_id: userId }),
	}).then((res) => {
		if (!res.ok) {
			$waiting.textContent = "❌ Erreur d'inscription";
			return;
		}
		return res.json();
	}).then((data) => {
		$pseudo.textContent = data.pseudo;
		$waiting.textContent = "En attente du tirage...";
	});

	const ws = new WebSocket(
		`ws${location.protocol.includes("https") ? "s" : ""}://${location.host}/ws/raffle?uuid=${uuid}`,
	);
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "winner") {
			$waiting.style.display = "none";
			if (msg.winnerId === userId) {
				$result.className = "raffle-result win";
				$resultText.textContent = `🏆 Gagné !`;
				$resultSub.textContent = msg.winnerPseudo;
				document.body.className = "winner";
			} else {
				$result.className = "raffle-result lose";
				$resultText.textContent = `😢 Perdu`;
				$resultSub.textContent = `Le gagnant est ${msg.winnerPseudo}`;
				document.body.className = "loser";
			}
		}
	};
}
