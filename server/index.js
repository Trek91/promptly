import { readConfig } from './config.js';
import { createApp } from './app.js';

try {
  const config = readConfig();
  const app = createApp(config);
  const server = app.listen(config.port, config.host, () => {
    console.log(`Promptly API: http://${config.host}:${config.port} (${config.demo ? 'demo, no credentials needed' : `${config.provider} mode`})`);
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} is in use. Stop the other process or choose another PORT.` : 'The server could not start. Check HOST and PORT.');
    process.exitCode = 1;
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
