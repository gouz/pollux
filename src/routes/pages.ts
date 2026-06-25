import packageJson from "../../package.json";
import dynamicManyPage from "../layout/dynamic-many.html" with { type: "text" };
import dynamicResultPage from "../layout/dynamic-result.html" with {
	type: "text",
};
import dynamicVotePage from "../layout/dynamic-vote.html" with { type: "text" };
import indexPage from "../layout/index.html" with { type: "text" };
import manyPage from "../layout/many.html" with { type: "text" };
import quizzAdminPage from "../layout/quizz-admin.html" with { type: "text" };
import quizzResultPage from "../layout/quizz-result.html" with { type: "text" };
import quizzVotePage from "../layout/quizz-vote.html" with { type: "text" };
import raffleAdminPage from "../layout/raffle-admin.html" with { type: "text" };
import raffleVotePage from "../layout/raffle-vote.html" with { type: "text" };
import resultPage from "../layout/result.html" with { type: "text" };
import votePage from "../layout/vote.html" with { type: "text" };
import { html } from "./helpers";

export const pages: Record<string, () => Response> = {
	"/": () =>
		html(
			`${indexPage as unknown as string}`.replace(
				"#VERSION#",
				packageJson.version,
			),
		),
	"/many": () => html(manyPage),
	"/results": () => html(resultPage),
	"/vote": () => html(votePage),
	"/dynamic-vote": () => html(dynamicVotePage),
	"/dynamic-many": () => html(dynamicManyPage),
	"/dynamic-result": () => html(dynamicResultPage),
	"/quizz-admin": () => html(quizzAdminPage),
	"/quizz-vote": () => html(quizzVotePage),
	"/quizz-result": () => html(quizzResultPage),
	"/raffle-admin": () => html(raffleAdminPage),
	"/raffle-vote": () => html(raffleVotePage),
};
