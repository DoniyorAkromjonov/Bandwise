import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config as loadEnv } from "dotenv";

const MAGIC = Buffer.from("BWBKUP1\0", "ascii");
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + NONCE_LENGTH;

export function parseBackupKey(value) {
  if (!value) throw new Error("Set BACKUP_ENCRYPTION_KEY to a base64-encoded 32-byte key.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) {
    throw new Error("BACKUP_ENCRYPTION_KEY must be canonical base64 for exactly 32 random bytes.");
  }
  return key;
}

export function createBackupCipher(key, nonce = randomBytes(NONCE_LENGTH)) {
  if (key.length !== 32 || nonce.length !== NONCE_LENGTH) throw new Error("Invalid backup encryption key or nonce.");
  const header = Buffer.concat([MAGIC, nonce]);
  return { header, cipher: createCipheriv("aes-256-gcm", key, nonce) };
}

export function createBackupDecipher(key, header, authTag) {
  if (key.length !== 32 || header.length !== HEADER_LENGTH || !header.subarray(0, MAGIC.length).equals(MAGIC) || authTag.length !== TAG_LENGTH) {
    throw new Error("Backup file header or encryption key is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(MAGIC.length));
  decipher.setAuthTag(authTag);
  return decipher;
}

function databaseConnection() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL must be set.");
  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("DATABASE_URL must use PostgreSQL.");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database || !url.hostname) throw new Error("DATABASE_URL must include a database name and host.");

  const environment = {};
  for (const name of ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "HOME"]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  environment.PGHOST = url.hostname;
  environment.PGPORT = url.port || "5432";
  environment.PGDATABASE = database;
  environment.PGCONNECT_TIMEOUT = "15";
  if (url.username) environment.PGUSER = decodeURIComponent(url.username);
  if (url.password) environment.PGPASSWORD = decodeURIComponent(url.password);
  for (const [parameter, variable] of [
    ["sslmode", "PGSSLMODE"],
    ["sslrootcert", "PGSSLROOTCERT"],
    ["sslcert", "PGSSLCERT"],
    ["sslkey", "PGSSLKEY"],
  ]) {
    const option = url.searchParams.get(parameter);
    if (option) environment[variable] = option;
  }
  return { environment, database };
}

function startProcess(command, args, environment) {
  const child = spawn(command, args, { env: environment, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-16_384);
  });
  const exited = new Promise((resolveExit) => {
    child.once("error", (error) => resolveExit({ error }));
    child.once("close", (code, signal) => resolveExit({ code, signal }));
  });
  return { child, exited, getStderr: () => stderr.trim() };
}

async function createEncryptedBackup(directory) {
  const key = parseBackupKey(process.env.BACKUP_ENCRYPTION_KEY);
  const { environment } = databaseConnection();
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const outputPath = resolve(directory, `bandwise-${stamp}.bwbackup`);
  const file = await open(outputPath, "wx", 0o600);
  const output = createWriteStream(outputPath, { fd: file.fd, autoClose: true });
  const { header, cipher } = createBackupCipher(key);
  const { child, exited, getStderr } = startProcess("pg_dump", ["--format=custom", "--no-owner", "--no-acl"], environment);
  let completed = false;

  try {
    await new Promise((resolveWrite, rejectWrite) => output.write(header, (error) => error ? rejectWrite(error) : resolveWrite()));
    const encryptedOutput = new Writable({
      write(chunk, encoding, callback) {
        output.write(chunk, encoding, callback);
      },
      final(callback) {
        output.end(cipher.getAuthTag(), callback);
      },
    });
    await pipeline(child.stdout, cipher, encryptedOutput);
    const result = await exited;
    if (result.error) throw result.error;
    const { code, signal } = result;
    if (code !== 0) throw new Error(`pg_dump failed${signal ? ` (${signal})` : ""}${getStderr() ? `: ${getStderr()}` : "."}`);
    completed = true;
    console.log(`Encrypted database backup created: ${basename(outputPath)}`);
  } finally {
    if (!child.killed && child.exitCode === null) child.kill();
    await exited;
    if (!completed) {
      output.destroy();
      await new Promise((resolveClose) => output.closed ? resolveClose() : output.once("close", resolveClose));
      await rm(outputPath, { force: true });
    }
  }
}

async function restoreEncryptedBackup(inputPath) {
  const key = parseBackupKey(process.env.BACKUP_ENCRYPTION_KEY);
  const { environment, database } = databaseConnection();
  const resolvedPath = resolve(inputPath);
  const details = await stat(resolvedPath);
  if (details.size <= HEADER_LENGTH + TAG_LENGTH) throw new Error("Backup file is too small to contain a database archive.");

  const backup = await open(resolvedPath, "r");
  const header = Buffer.alloc(HEADER_LENGTH);
  const authTag = Buffer.alloc(TAG_LENGTH);
  try {
    await backup.read(header, 0, HEADER_LENGTH, 0);
    await backup.read(authTag, 0, TAG_LENGTH, details.size - TAG_LENGTH);
  } finally {
    await backup.close();
  }
  const decipher = createBackupDecipher(key, header, authTag);
  const { child, exited, getStderr } = startProcess("pg_restore", [
    "--exit-on-error",
    "--single-transaction",
    "--no-owner",
    "--no-acl",
    "--dbname",
    database,
    "-",
  ], environment);

  try {
    await pipeline(
      createReadStream(resolvedPath, { start: HEADER_LENGTH, end: details.size - TAG_LENGTH - 1 }),
      decipher,
      child.stdin,
    );
    const result = await exited;
    if (result.error) throw result.error;
    const { code, signal } = result;
    if (code !== 0) throw new Error(`pg_restore failed${signal ? ` (${signal})` : ""}${getStderr() ? `: ${getStderr()}` : "."}`);
    console.log("Database restore completed. Existing objects were not dropped.");
  } finally {
    if (!child.killed && child.exitCode === null) child.kill();
    await exited;
  }
}

export async function runDatabaseBackup(args) {
  const [operation, target, ...flags] = args;
  if (operation === "backup") {
    await createEncryptedBackup(resolve(target || "backups"));
    return;
  }
  if (operation === "restore") {
    if (!target || !flags.includes("--confirm-restore")) {
      throw new Error("Restore requires a backup file and the explicit --confirm-restore flag.");
    }
    await restoreEncryptedBackup(target);
    return;
  }
  throw new Error("Usage: node tools/database-backup.mjs backup [directory] | restore <file> --confirm-restore");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  loadEnv({ path: ".env.local", quiet: true });
  loadEnv({ quiet: true });
  runDatabaseBackup(process.argv.slice(2)).catch((error) => {
    console.error("Database backup operation failed:", error instanceof Error ? error.message : "Unknown error.");
    process.exitCode = 1;
  });
}
