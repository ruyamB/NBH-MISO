import { loadConfig } from '../config.js';

export function handleWhoAmI() {
  const config = loadConfig();
  if (config.auth && config.auth.username && config.auth.username.trim()) {
    console.log(config.auth.username.trim());
  } else {
    console.log('NULL : do login');
  }
}
