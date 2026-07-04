import { constants, Database } from "bun:sqlite";

// Path is configurable so tests can point at a throwaway database (or
// ":memory:") via POLLUX_DB instead of touching the production file.
const db = new Database(
	process.env.POLLUX_DB ?? `${process.cwd()}/data/db.sqlite`,
	{
		create: true,
		strict: true,
	},
);
db.run("PRAGMA journal_mode = WAL;");
db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0);

// --- Schema: create all tables before preparing any query that references them.
// bun:sqlite prepares (compiles) statements eagerly in db.query(), so the
// referenced tables must already exist or the prepare throws "no such table".
db.run(
	"CREATE TABLE IF NOT EXISTS poll(uuid TEXT, choice INT, date datetime default current_timestamp);",
);

db.run(
	"CREATE TABLE IF NOT EXISTS quizz_answers (uuid TEXT, step INT, correct TEXT, question TEXT DEFAULT '', timer INT DEFAULT 0, choices TEXT DEFAULT '[]', media TEXT DEFAULT '', date datetime default current_timestamp, PRIMARY KEY (uuid, step));",
);

try {
	db.run("ALTER TABLE quizz_answers ADD COLUMN media TEXT DEFAULT '';");
} catch {} // column may already exist

try {
	db.run(
		"ALTER TABLE quizz_answers ADD COLUMN date datetime default current_timestamp;",
	);
} catch {} // column may already exist

db.run(
	"CREATE TABLE IF NOT EXISTS quizz_submissions (uuid TEXT, user_id TEXT, step INT, choices TEXT, score INT, total INT, response_time_ms INT, PRIMARY KEY (uuid, user_id, step));",
);

db.run(
	"CREATE TABLE IF NOT EXISTS quizz_players (uuid TEXT, user_id TEXT, pseudo TEXT, PRIMARY KEY (uuid, user_id));",
);

// --- Prepared queries (tables now guaranteed to exist).
export const vote = db.query(
	"INSERT INTO poll (uuid, choice) VALUES ($uuid, $choice);",
);
export const getResults = db.query(
	"SELECT choice, COUNT(*) AS total FROM poll WHERE uuid = $uuid GROUP BY choice ORDER BY choice;",
);
export const getResultsByStep = db.query(
	"SELECT choice, COUNT(*) AS total FROM poll WHERE uuid = $uuid AND choice BETWEEN $min AND $max GROUP BY choice ORDER BY choice;",
);

export const clean = db.query(
	"DELETE FROM poll WHERE date < datetime('now','-4 hours');",
);
export const cleanQuizzAnswers = db.query(
	"DELETE FROM quizz_answers WHERE date < datetime('now','-4 hours');",
);
export const cleanQuizzSubmissions = db.query(
	"DELETE FROM quizz_submissions WHERE uuid NOT IN (SELECT uuid FROM quizz_answers);",
);
export const cleanQuizzPlayers = db.query(
	"DELETE FROM quizz_players WHERE uuid NOT IN (SELECT uuid FROM quizz_answers);",
);

export const flush = db.query("DELETE FROM poll WHERE uuid = $uuid;");

export const setQuizzAnswer = db.query(
	"INSERT OR REPLACE INTO quizz_answers (uuid, step, correct, question, choices, media) VALUES ($uuid, $step, $correct, $question, $choices, $media);",
);

export const getQuizzAnswer = db.query(
	"SELECT correct, question, timer, choices, media FROM quizz_answers WHERE uuid = $uuid AND step = $step;",
);

export const submitQuizzVote = db.query(
	"INSERT OR REPLACE INTO quizz_submissions (uuid, user_id, step, choices, score, total, response_time_ms) VALUES ($uuid, $user_id, $step, $choices, $score, $total, $response_time_ms);",
);

export const getQuizzScores = db.query(
	"SELECT qs.user_id, COALESCE(qp.pseudo, qs.user_id) AS pseudo, SUM(qs.score) AS score, SUM(qs.total) AS total FROM quizz_submissions qs LEFT JOIN quizz_players qp ON qs.uuid = qp.uuid AND qs.user_id = qp.user_id WHERE qs.uuid = $uuid GROUP BY qs.user_id ORDER BY score DESC;",
);

export const getQuizzStepScores = db.query(
	"SELECT qs.user_id, COALESCE(qp.pseudo, qs.user_id) AS pseudo, qs.choices, qs.score, qs.total FROM quizz_submissions qs LEFT JOIN quizz_players qp ON qs.uuid = qp.uuid AND qs.user_id = qp.user_id WHERE qs.uuid = $uuid AND qs.step = $step ORDER BY qs.score DESC;",
);

export const getQuizzUserSubmissions = db.query(
	"SELECT step, choices, score, total FROM quizz_submissions WHERE uuid = $uuid AND user_id = $user_id ORDER BY step;",
);

export const getQuizzResults = db.query(
	"SELECT ($step * 100 + q.value) AS choice, COUNT(*) AS total FROM quizz_submissions qs, json_each(qs.choices) q WHERE qs.uuid = $uuid AND qs.step = $step GROUP BY q.value ORDER BY q.value;",
);

export const registerPlayer = db.query(
	"INSERT OR REPLACE INTO quizz_players (uuid, user_id, pseudo) VALUES ($uuid, $user_id, $pseudo);",
);

export const getPlayers = db.query(
	"SELECT user_id, pseudo FROM quizz_players WHERE uuid = $uuid ORDER BY pseudo;",
);
