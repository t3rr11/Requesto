const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const backendPath = path.join(context.appOutDir, 'resources', 'backend');
  
  console.log('Installing backend dependencies...');
  console.log('Backend path:', backendPath);
  
  if (!fs.existsSync(backendPath)) {
    console.error('Backend path does not exist:', backendPath);
    throw new Error(`Backend path not found: ${backendPath}`);
  }
  
  // Check if package.json exists
  const packageJsonPath = path.join(backendPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json not found at:', packageJsonPath);
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }
  
  try {
    // Use npm install with omit flags for production dependencies
    // This is more reliable than npm ci when lock files might be out of sync
    const command = 'npm install --omit=dev --omit=optional --ignore-scripts';
    
    console.log('Running:', command);
    
    execSync(command, {
      cwd: backendPath,
      stdio: 'inherit',
      // Set maxBuffer to handle large npm output
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    
    console.log('Backend dependencies installed successfully');
    
    // Verify node_modules was created
    const nodeModulesPath = path.join(backendPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      throw new Error('node_modules directory was not created');
    }
    
    console.log('Verified node_modules exists');
  } catch (error) {
    console.error('Failed to install backend dependencies:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
    throw error;
  }
};
