import { Database, constants } from "bun:sqlite";

const db = new Database(`${process.cwd()}/data/db.sqlite`, {
  create: true,
  strict: true,
});
db.run("PRAGMA journal_mode = WAL;");
db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0);

export const query = db.query(
  `CREATE TABLE IF NOT EXISTS poll(uuid TEXT, choice INT, date datetime default current_timestamp);`,
);
query.run();

export const vote = db.query(
  "INSERT INTO poll (uuid, choice) VALUES ($uuid, $choice)",
);
export const getResults = db.query(
  "SELECT choice, COUNT(*) AS total FROM poll WHERE uuid = $uuid GROUP BY choice ORDER BY choice",
);

export const clean = db.query(
  `DELETE FROM poll WHERE date < datetime('now','-24 hours')`,
);
