const p = require('../package.json');

const expo = p.dependencies.expo;
const react = p.dependencies.react;
const rn = p.dependencies['react-native'];

const ok =
  expo?.startsWith('~52.') &&
  react?.startsWith('18.3') &&
  rn?.startsWith('0.76');

if (!ok) {
  console.error('❌ SDK VIOLATION', {
    expo,
    react,
    rn
  });
  process.exit(1);
}

console.log('✅ SDK 52 OK', { expo, react, rn });
