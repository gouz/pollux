import dynamicManyJs from "../scripts/dynamic-many.js" with { type: "text" };
import dynamicResultJs from "../scripts/dynamic-result.js" with {
	type: "text",
};
import dynamicVoteJs from "../scripts/dynamic-vote.js" with { type: "text" };
import manyJs from "../scripts/many.js" with { type: "text" };
import quizzAdminJs from "../scripts/quizz-admin.js" with { type: "text" };
import quizzResultJs from "../scripts/quizz-result.js" with { type: "text" };
import quizzVoteJs from "../scripts/quizz-vote.js" with { type: "text" };
import resultJs from "../scripts/result.js" with { type: "text" };
import scriptJs from "../scripts/script.js" with { type: "text" };
import voteJs from "../scripts/vote.js" with { type: "text" };
import styleCss from "../styles/style.css" with { type: "text" };
import { js } from "./helpers";

export const assets: Record<string, () => Response> = {
	"/styles/style.css": () =>
		new Response(styleCss, { headers: { "Content-Type": "text/css" } }),

	"/scripts/script.js": () => js(scriptJs),
	"/scripts/many.js": () => js(manyJs),
	"/scripts/vote.js": () => js(voteJs),
	"/scripts/result.js": () => js(resultJs),
	"/scripts/dynamic-vote.js": () => js(dynamicVoteJs),
	"/scripts/dynamic-many.js": () => js(dynamicManyJs),
	"/scripts/dynamic-result.js": () => js(dynamicResultJs),
	"/scripts/quizz-admin.js": () => js(quizzAdminJs),
	"/scripts/quizz-vote.js": () => js(quizzVoteJs),
	"/scripts/quizz-result.js": () => js(quizzResultJs),
};
