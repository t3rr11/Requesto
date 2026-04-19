import { app, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { isDev } from './constants';

export async function clearCacheOnVersionChange(): Promise<void> {
  if (isDev) return;

  const versionFile = path.join(app.getPath('userData'), '.last-version');
  const currentVersion = app.getVersion();
  let lastVersion: string | null = null;

  try {
    lastVersion = fs.readFileSync(versionFile, 'utf-8').trim();
  } catch {
    // No version file yet — first run or pre-upgrade install
  }

  if (lastVersion !== currentVersion) {
    console.log(`Version changed from ${lastVersion} to ${currentVersion}, clearing cache...`);
    await session.defaultSession.clearCache();
    fs.writeFileSync(versionFile, currentVersion, 'utf-8');
  }
}
