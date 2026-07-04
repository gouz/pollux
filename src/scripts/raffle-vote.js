const uuid = window.location.hash.slice(1);
const $pseudo = document.getElementById("pseudo");
const $waiting = document.getElementById("waiting");
const $result = document.getElementById("result");
const $resultText = document.getElementById("result-text");
const $resultSub = document.getElementById("result-sub");

if (!isUUIDv7(uuid)) {
	$waiting.textContent = "⚠️ Lien invalide";
} else {
	// Persist a stable id per raffle so a page refresh re-uses the same
	// registration instead of creating a duplicate player.
	let userId;

	(async () => {
		userId = await getOrCreateUserId(`pollux_raffle_user:${uuid}`);
		const res = await postJSON(`/api/raffle/${uuid}/register`, {
			user_id: userId,
		});
		if (!res.ok) {
			$waiting.textContent = "❌ Erreur d'inscription";
			return;
		}
		const data = await res.json();
		$pseudo.textContent = data.pseudo;
		$waiting.textContent = "En attente du tirage...";
	})();

	const ws = new WebSocket(wsURL("/ws/raffle", { uuid }));
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
