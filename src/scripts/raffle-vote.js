const adjectives = ["Rapide","Joyeux","Malin","Futé","Brave","Agile","Vif","Sage","Doux","Vrai","Grand","Petit","Beau","Chaud","Froid","Fier","Léger","Futé","Subtil","Loyal","Noble","Calme","Chic","Coquin"];
const nouns = ["Chat","Chien","Loup","Renard","Ours","Tigre","Lion","Cerf","Hibou","Aigle","Dauphin","Phénix","Dragon","Loutre","Buse","Panda","Koala","Paon","Baleine","Faucon","Chouette","Lynx"];

const randomPseudo = () => {
	return adjectives[Math.floor(Math.random() * adjectives.length)] +
		nouns[Math.floor(Math.random() * nouns.length)];
};

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
	const pseudo = randomPseudo();
	$pseudo.textContent = pseudo;

	fetch(`/api/raffle/${uuid}/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_id: userId, pseudo }),
	}).then((res) => {
		if (!res.ok) {
			$waiting.textContent = "❌ Erreur d'inscription";
			return;
		}
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
