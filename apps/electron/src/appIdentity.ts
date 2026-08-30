import { app } from 'electron';
import * as path from 'path';

const APP_NAME = 'Requesto';
const USER_DATA_DIR_NAME = 'requesto-electron';

// userData must stay in the legacy "requesto-electron" folder or existing installs
// would silently lose their data after updating.
app.setName(APP_NAME);
app.setPath('userData', path.join(app.getPath('appData'), USER_DATA_DIR_NAME));

export { APP_NAME, USER_DATA_DIR_NAME };
