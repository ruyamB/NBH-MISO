import readline from 'readline';

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  grey:    '\x1b[90m',
  red:     '\x1b[31m',
};

/**
 * Renders an interactive arrow-key menu for MISO AI patch suggestions.
 * Mimics a VS Code Quick Fix menu in the terminal.
 *
 * @param {string}   title    - Menu title/prompt line
 * @param {Array}    choices  - Array of { label: string, value: string }
 * @param {number}   [defaultIndex=0]
 * @returns {Promise<string>} - Resolves with the selected choice value
 */
export function showPatchMenu(title, choices, defaultIndex = 0) {
  return new Promise((resolve) => {
    // Non-interactive fallback (CI / piped input)
    if (!process.stdin.isTTY || process.env.MISO_TEST === 'true') {
      resolve(choices[defaultIndex].value);
      return;
    }

    let selectedIndex = defaultIndex;
    const stdin = process.stdin;
    const stdout = process.stdout;

    const render = () => {
      // Move cursor up to overwrite previous render
      stdout.write(`\n${C.bold}${title}${C.reset}\n`);
      stdout.write(`${C.grey}  Use ↑/↓ arrows · Enter to confirm · Ctrl+C to abort${C.reset}\n\n`);
      choices.forEach((choice, i) => {
        if (i === selectedIndex) {
          stdout.write(`  ${C.cyan}${C.bold}❯ ${choice.label}${C.reset}\n`);
        } else {
          stdout.write(`  ${C.grey}  ${choice.label}${C.reset}\n`);
        }
      });
    };

    const clearMenu = () => {
      // Clear: 1 title line + 1 hint line + 1 blank + N choices + 1 blank (render opens with \n)
      const totalLines = choices.length + 4;
      // Move up and clear
      stdout.write(`\x1B[${totalLines}A\x1B[0J`);
    };

    const cleanup = () => {
      stdout.write('\x1B[?25h'); // show cursor
      if (stdin.setRawMode) stdin.setRawMode(false);
      stdin.removeListener('keypress', onKeyPress);
      stdin.pause();
    };

    readline.emitKeypressEvents(stdin);
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdout.write('\x1B[?25l'); // hide cursor

    render();

    const onKeyPress = (str, key) => {
      if (!key) return;

      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
        clearMenu();
        render();
      } else if (key.name === 'down' || key.name === 'j') {
        selectedIndex = (selectedIndex + 1) % choices.length;
        clearMenu();
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        clearMenu();
        console.log(`  ${C.green}${C.bold}✔ Selected:${C.reset} ${choices[selectedIndex].label}\n`);
        resolve(choices[selectedIndex].value);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }
    };

    stdin.on('keypress', onKeyPress);
  });
}

/**
 * Confirmation prompt: Yes / No
 *
 * @param {string} question
 * @param {boolean} defaultYes
 * @returns {Promise<boolean>}
 */
export async function confirmPrompt(question, defaultYes = false) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY || process.env.MISO_TEST === 'true') {
      resolve(defaultYes);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    rl.question(`\n  ${C.bold}${question}${C.reset} ${C.grey}${hint}${C.reset} `, (answer) => {
      rl.close();
      const val = answer.trim().toLowerCase();
      if (defaultYes) resolve(val !== 'n' && val !== 'no');
      else resolve(val === 'y' || val === 'yes');
    });
  });
}
