const p = require('../package.json');

const ok =
  p.dependencies.expo?.startsWith('~52.') &&
  p.dependencies.react === '18.3.1' &&
  p.dependencies['react-native'] === '0.76.9';

if (!ok) {
  console.error('❌ SDK VIOLATION', {
    expo: p.dependencies.expo,
    react: p.dependencies.react,
    rn: p.dependencies['react-native'],
  });
  process.exit(1);
}

console.log('✅ SDK 52 OK');