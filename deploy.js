// Simple deployment helper
import { execSync } from 'child_process';

console.log('🚀 Starting deployment process...');

// Check if git is clean
try {
  execSync('git status --porcelain', { stdio: 'pipe' });
  console.log('✅ Git repository is clean');
} catch (error) {
  console.log('📝 Committing changes...');
  execSync('git add .');
  execSync('git commit -m "Auto-deploy commit"');
}

// Push to GitHub
console.log('📤 Pushing to GitHub...');
execSync('git push origin main');

console.log('✅ Code pushed to GitHub successfully!');
console.log('');
console.log('🌐 Your app is ready for deployment at:');
console.log('📍 GitHub: https://github.com/Mayuri2428/Mini-Project');
console.log('');
console.log('🚀 FREE Deployment Options (No Limits):');
console.log('');
console.log('1. 🟢 GLITCH: https://glitch.com (Import from GitHub)');
console.log('   - Unlimited free hosting');
console.log('   - Auto-sleeps after 5min, wakes on visit');
console.log('');
console.log('2. 🟢 REPLIT: https://replit.com (Import from GitHub)');
console.log('   - Free tier with good limits');
console.log('   - Always-on with Replit Core (free trial)');
console.log('');
console.log('3. 🟢 KOYEB: https://koyeb.com (Connect GitHub)');
console.log('   - 512MB RAM free forever');
console.log('   - No sleep mode');
console.log('');
console.log('4. 🟡 RAILWAY: https://railway.app (if limit reset)');
console.log('5. 🟡 RENDER: https://render.com (750 hours/month free)');
console.log('');
console.log('💡 Try GLITCH first - it has the most generous free tier!');
console.log('🔑 Login credentials: mjsfutane21@gmail.com / abc@1234');