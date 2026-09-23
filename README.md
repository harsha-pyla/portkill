# portkill

> Fast, cross-platform CLI tool to kill whatever process is holding your port hostage. **Zero dependencies.**

[![npm version](https://img.shields.io/npm/v/@harsha1029/portkill.svg)](https://www.npmjs.com/package/@harsha1029/portkill)
[![license](https://img.shields.io/npm/l/@harsha1029/portkill.svg)](LICENSE)

<br />

<p align="center">
  <img src="https://raw.githubusercontent.com/harsha-pyla/portkill/main/assets/demo.png" alt="portkill terminal demo" width="800" />
</p>

---

## The Problem

Developers constantly hit `port already in use` errors when launching local development servers:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Fixing this normally requires manually looking up platform-specific terminal commands, finding the process ID (PID) occupying that port, and terminating it:

- On **macOS / Linux**: `lsof -i tcp:3000` -> copy PID -> `kill -9 <PID>`
- On **Windows**: `netstat -ano | findstr :3000` -> find PID -> `taskkill /PID <PID> /F`

It's tedious, error-prone, and interrupts your workflow.

---

## The Solution

A single command that frees up your port across **macOS, Linux, and Windows**:

```bash
portkill 3000
```

---

## Features

- ⚡ **Zero External Dependencies**: Built strictly using Node.js standard modules (`child_process`, `os`).
- 🌐 **Cross-Platform**: Seamlessly works on macOS, Linux, and Windows.
- 🎯 **Multiple PID Support**: Cleans up all processes if multiple listeners are bound to the same port.
- 🛡️ **Accurate Matching**: Targets the exact port without false positives on similar port numbers or foreign connections.
- 💡 **Graceful Exits**: Clear status reporting and exit code `0` when no process is occupying the port.

---

## Installation

### Global Install (Recommended)

```bash
npm install -g @harsha1029/portkill
```

### Run Instantly via `npx`

Without installing globally:

```bash
npx @harsha1029/portkill 3000
```

---

## Usage

```bash
portkill <port>
```

### Examples

Kill process running on port 3000:
```bash
portkill 3000
```

Kill process running on port 8080:
```bash
portkill 8080
```

Show help:
```bash
portkill --help
```

---

## How It Works

Under the hood, `portkill` detects your operating system and executes the native commands directly:

- **macOS / Linux**: Uses `lsof -i tcp:<port> -sTCP:LISTEN -t` to locate the listening PIDs, followed by `kill -9 <pid>`.
- **Windows**: Uses `netstat -ano | findstr :<port>` to locate the listening PIDs, validates the local address, and runs `taskkill /PID <pid> /F`.

---

## Permissions & Privileges

If a process is owned by a system user or another privileged service, run the command with elevated rights:

- **macOS / Linux**: `sudo portkill <port>`
- **Windows**: Run your terminal (Command Prompt / PowerShell / Windows Terminal) as **Administrator**.

---

## Contributing

Pull requests are welcome! If you encounter issues or have suggestions, feel free to open an issue on GitHub.

---

## License

[MIT](LICENSE)
