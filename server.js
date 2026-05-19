// Bridge ESM -> CommonJS para a Hostinger.
// O painel Node.js detecta server.ts e auto-preenche o entry file como "server.js".
// Como o package.json tem "type": "module", este arquivo é ESM e simplesmente
// importa o bundle CommonJS produzido pelo esbuild em server.cjs.
import './server.cjs';
