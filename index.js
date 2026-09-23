#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

// Terminal formatting (safe ANSI escapes)
const isColorSupported = process.stdout.isTTY;
const colors = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  dim: isColorSupported ? '\x1b[90m' : ''
};

function printUsage() {
  console.log(`
${colors.bold}portkill${colors.reset} - Kill any process running on a specific port

${colors.bold}USAGE:${colors.reset}
  portkill <port>

${colors.bold}ARGUMENTS:${colors.reset}
  <port>    The port number to free up (1 - 65535)

${colors.bold}OPTIONS:${colors.reset}
  -h, --help       Show this help message
  -v, --version    Show version number

${colors.bold}EXAMPLES:${colors.reset}
  ${colors.cyan}portkill 3000${colors.reset}      Kill process(es) on port 3000
  ${colors.cyan}portkill 8080${colors.reset}      Kill process(es) on port 8080
`);
}

function printVersion() {
  try {
    const pkg = require('./package.json');
    console.log(`portkill v${pkg.version}`);
  } catch {
    console.log('portkill v1.0.0');
  }
}

/**
 * Find PIDs using the specified port on Windows
 * Uses `netstat -ano | findstr :<port>`
 */
function getPidsWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = output.trim().split(/\r?\n/);
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // Netstat columns:
      // TCP: [Proto, LocalAddress, ForeignAddress, State, PID]
      // UDP: [Proto, LocalAddress, ForeignAddress, PID]
      if (parts.length >= 4) {
        const localAddress = parts[1];
        // Ensure localAddress specifically matches :<port> to prevent false positives
        // (e.g. searching 30 matching 3000, or matching foreign addresses)
        if (localAddress && (localAddress.endsWith(':' + port) || localAddress.endsWith('.' + port))) {
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
            pids.add(pid);
          }
        }
      }
    }

    return Array.from(pids);
  } catch (err) {
    // findstr exits with code 1 if no match is found, causing execSync to throw
    return [];
  }
}

/**
 * Find PIDs using the specified port on macOS and Linux
 * Uses `lsof -i tcp:<port> -sTCP:LISTEN -t`
 */
function getPidsUnix(port) {
  try {
    const output = execSync(`lsof -i tcp:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = output.trim().split(/\r?\n/);
    const pids = new Set();

    for (const line of lines) {
      const pid = parseInt(line.trim(), 10);
      if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }

    return Array.from(pids);
  } catch (err) {
    // lsof exits with non-zero if no process is found
    return [];
  }
}

/**
 * Kill a process by PID according to the operating system
 */
function killPid(pid, platform) {
  if (platform === 'win32') {
    execSync(`taskkill /PID ${pid} /F`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } else {
    execSync(`kill -9 ${pid}`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

function main() {
  const args = process.argv.slice(2);

  // Requirement 5: If no port argument is given, print usage instructions and exit 1
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} No port specified.\n`);
    printUsage();
    process.exit(1);
  }

  const firstArg = args[0];

  if (firstArg === '-h' || firstArg === '--help') {
    printUsage();
    process.exit(0);
  }

  if (firstArg === '-v' || firstArg === '--version') {
    printVersion();
    process.exit(0);
  }

  const port = parseInt(firstArg, 10);

  if (isNaN(port) || port < 1 || port > 65535 || String(port) !== firstArg.trim()) {
    console.error(`${colors.red}Error:${colors.reset} Invalid port "${firstArg}". Port must be an integer between 1 and 65535.\n`);
    printUsage();
    process.exit(1);
  }

  const platform = os.platform();
  const isWindows = platform === 'win32';

  const pids = isWindows ? getPidsWindows(port) : getPidsUnix(port);

  // Requirement 4: If no process is found on that port, print a clear message and exit 0 (not an error)
  if (!pids || pids.length === 0) {
    console.log(`${colors.yellow}No process found running on port ${port}.${colors.reset}`);
    process.exit(0);
  }

  // Requirement 6: Support killing multiple PIDs if more than one process is bound to the port
  console.log(`Found ${pids.length} process(es) on port ${colors.cyan}${port}${colors.reset}: PID ${pids.join(', ')}`);

  let successCount = 0;
  for (const pid of pids) {
    try {
      killPid(pid, platform);
      console.log(`${colors.green}✔${colors.reset} Successfully killed process ${colors.bold}${pid}${colors.reset}`);
      successCount++;
    } catch (err) {
      console.error(`${colors.red}✖${colors.reset} Failed to kill process ${colors.bold}${pid}${colors.reset}: ${err.message}`);
    }
  }

  if (successCount === pids.length) {
    console.log(`${colors.green}✔ Port ${port} is now free.${colors.reset}`);
    process.exit(0);
  } else if (successCount > 0) {
    console.log(`${colors.yellow}Port ${port} partially cleared (${successCount}/${pids.length} killed).${colors.reset}`);
    console.log(`${colors.dim}Note: You may need administrative/sudo privileges to kill some processes.${colors.reset}`);
    process.exit(1);
  } else {
    console.error(`${colors.red}Failed to kill processes on port ${port}.${colors.reset}`);
    console.error(`${colors.dim}Tip: Run this command with elevated permissions (Run as Administrator or sudo).${colors.reset}`);
    process.exit(1);
  }
}

main();
