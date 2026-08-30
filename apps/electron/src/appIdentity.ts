import { app } from 'electron';
import * as path from 'path';

// Brand the app as "Requesto" in both development and packaged builds so the window
// title never flashes the internal package name. The userData directory is pinned to
// the folder existing installs already use, so no data location changes for anyone.
const APP_NAME = 'Requesto';
const USER_DATA_DIR_NAME = 'requesto-electron';

app.setName(APP_NAME);
app.setPath('userData', path.join(app.getPath('appData'), USER_DATA_DIR_NAME));

export { APP_NAME, USER_DATA_DIR_NAME };
