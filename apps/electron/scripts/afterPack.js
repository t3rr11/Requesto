const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  // On macOS, resources are inside the .app bundle; on Linux/Windows they're in appOutDir/resources
  const resourcesDir =
    context.packager.platform.name === 'mac'
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
      : path.join(context.appOutDir, 'resources');
  const backendPath = path.join(resourcesDir, 'backend');
  const bundlePath = path.join(backendPath, 'dist', 'server.js');

  console.log('Verifying backend bundle...');
  console.log('Bundle path:', bundlePath);

  if (!fs.existsSync(bundlePath)) {
    throw new Error(
      `Backend bundle not found at: ${bundlePath}\nRun "npm run build:backend" before packaging.`
    );
  }

  console.log('Backend bundle verified.');
};
