// Somente para testes locais contra os emuladores. O projectId "demo-" e a chave falsa
// impedem qualquer acesso ao Firebase real, mesmo que os emuladores não estejam ativos.
export const environment = {
  production: false,
  useEmulators: true,
  aiWorkerUrl: 'http://localhost:8787',
  cardEventsEnabled: true,

  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-agileflow-local.firebaseapp.com',
    projectId: 'demo-agileflow-local',
    storageBucket: 'demo-agileflow-local.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000'
  }
};
