import { execSync } from 'child_process';

console.log('[Deploy] Creating and pushing clean gh-pages branch directly from web/ tree...');

// 1. Get tree hash of web/
const treeHash = execSync('git rev-parse HEAD:web').toString().trim();
console.log(`[Deploy] Tree hash of web/: ${treeHash}`);

// 2. Create standalone commit pointing to that tree
const commitHash = execSync(`git commit-tree ${treeHash} -m "deploy: update live WebXR build with offline MindAR bundle"`).toString().trim();
console.log(`[Deploy] Commit created: ${commitHash}`);

// 3. Force push commit to origin/gh-pages
console.log('[Deploy] Force pushing to origin/gh-pages...');
execSync(`git push origin ${commitHash}:refs/heads/gh-pages --force`, { stdio: 'inherit' });

console.log('[Deploy] Successfully published live WebXR application to GitHub Pages!');
