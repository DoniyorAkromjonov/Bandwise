import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { createBackupCipher, createBackupDecipher, parseBackupKey, runDatabaseBackup } from "../tools/database-backup.mjs";

test("database backups are encrypted and authenticated", () => {
  const key = randomBytes(32);
  const plaintext = Buffer.from("sample database archive");
  const { header, cipher } = createBackupCipher(key);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const decipher = createBackupDecipher(key, header, tag);
  const restored = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  assert.deepEqual(restored, plaintext);

  const tampered = Buffer.from(ciphertext);
  tampered[0] ^= 1;
  const verifier = createBackupDecipher(key, header, tag);
  verifier.update(tampered);
  assert.throws(() => verifier.final());
});

test("backup keys must be canonical base64 for 32 random bytes", () => {
  const value = randomBytes(32).toString("base64");
  assert.equal(parseBackupKey(value).length, 32);
  assert.throws(() => parseBackupKey("not-a-key"));
});

test("database restore requires explicit confirmation before accessing the backup", async () => {
  await assert.rejects(runDatabaseBackup(["restore", "missing-test-backup.bwbackup"]), /explicit --confirm-restore/);
});
