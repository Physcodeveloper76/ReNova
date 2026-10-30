"""
ReNova Multi-Service Runner Script
Runs both Backend (ScanNova Flask API on port 5000) and Frontend (Next.js App on port 3000) simultaneously.
"""

import os
import sys
import shutil
import subprocess
import threading
import time
import signal

# Enable ANSI terminal colors on Windows if supported
if os.name == 'nt':
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# Terminal colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

processes = []
shutdown_event = threading.Event()


def log(prefix, message, color=CYAN):
    print(f"{color}[{prefix}]{RESET} {message}", flush=True)


def find_directories():
    """Locate the frontend and backend project directories."""
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Check if we are inside the inner ReNova-main directory
    if os.path.isfile(os.path.join(base_dir, "package.json")):
        frontend_dir = base_dir
        backend_dir = os.path.join(base_dir, "ScanNova", "backend")
    # Check if we are in the outer workspace directory
    elif os.path.isfile(os.path.join(base_dir, "ReNova-main", "package.json")):
        frontend_dir = os.path.join(base_dir, "ReNova-main")
        backend_dir = os.path.join(frontend_dir, "ScanNova", "backend")
    else:
        # Search recursively for package.json
        for root, dirs, files in os.walk(base_dir):
            if "package.json" in files and "ScanNova" in dirs:
                frontend_dir = root
                backend_dir = os.path.join(root, "ScanNova", "backend")
                return frontend_dir, backend_dir
        raise RuntimeError("Could not find ReNova project directory with package.json!")

    if not os.path.isdir(backend_dir):
        raise RuntimeError(f"Could not find ScanNova backend directory at: {backend_dir}")

    return frontend_dir, backend_dir


def free_port(port):
    """Release port if occupied by a stale process."""
    try:
        import psutil
        for conn in psutil.net_connections(kind='tcp'):
            if conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                if conn.pid and conn.pid != os.getpid():
                    try:
                        p = psutil.Process(conn.pid)
                        log("System", f"Port {port} is occupied by {p.name()} (PID {conn.pid}). Releasing...", YELLOW)
                        p.terminate()
                        p.wait(timeout=2)
                    except Exception:
                        try:
                            p.kill()
                        except Exception:
                            pass
        time.sleep(0.5)
        return
    except Exception:
        pass

    # Fallback for Windows without psutil
    if os.name == 'nt':
        try:
            res = subprocess.run(
                f'netstat -ano -p tcp | findstr :{port}',
                shell=True,
                capture_output=True,
                text=True
            )
            for line in res.stdout.strip().splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.strip().split()
                    pid = parts[-1]
                    if pid and pid.isdigit() and int(pid) > 4:
                        log("System", f"Port {port} is occupied by PID {pid}. Releasing...", YELLOW)
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
            time.sleep(0.5)
        except Exception:
            pass


def clean_next_dev_lock(frontend_dir):
    """Remove stale .next/dev/lock file if it exists."""
    lock_file = os.path.join(frontend_dir, ".next", "dev", "lock")
    if os.path.isfile(lock_file):
        try:
            os.remove(lock_file)
        except Exception:
            pass


def kill_process_tree(proc):
    """Safely terminate a process and all of its child processes."""
    if proc is None:
        return
    try:
        import psutil
        parent = psutil.Process(proc.pid)
        children = parent.children(recursive=True)
        for child in children:
            try:
                child.terminate()
            except Exception:
                pass
        parent.terminate()
        _, alive = psutil.wait_procs(children + [parent], timeout=2)
        for p in alive:
            try:
                p.kill()
            except Exception:
                pass
        return
    except Exception:
        pass

    # Fallback termination
    pid = proc.pid
    try:
        if os.name == 'nt':
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=5
            )
        else:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def stream_logs(pipe, prefix, color):
    """Stream process stdout/stderr line-by-line with prefix."""
    try:
        for line in iter(pipe.readline, ''):
            if shutdown_event.is_set():
                break
            if not line:
                break
            stripped = line.rstrip('\r\n')
            if stripped:
                log(prefix, stripped, color)
    except Exception:
        pass
    finally:
        try:
            pipe.close()
        except Exception:
            pass


def main():
    print(f"\n{BOLD}{CYAN}==================================================={RESET}")
    print(f"{BOLD}{CYAN}            ReNova Multi-Service Runner            {RESET}")
    print(f"{BOLD}{CYAN}==================================================={RESET}\n")

    try:
        frontend_dir, backend_dir = find_directories()
        log("System", f"Frontend Directory: {frontend_dir}", GREEN)
        log("System", f"Backend Directory:  {backend_dir}", GREEN)
    except Exception as e:
        log("Error", str(e), RED)
        sys.exit(1)

    # Check for npm
    npm_bin = shutil.which("npm.cmd") if os.name == "nt" else shutil.which("npm")
    if not npm_bin:
        log("Error", "npm executable not found in PATH! Please ensure Node.js is installed.", RED)
        sys.exit(1)

    # Check node_modules
    if not os.path.isdir(os.path.join(frontend_dir, "node_modules")):
        log("System", "node_modules missing. Running npm install...", YELLOW)
        subprocess.run([npm_bin, "install"], cwd=frontend_dir, check=True)

    # Free ports if occupied by older runs and clear stale lock
    free_port(3000)
    free_port(5000)
    clean_next_dev_lock(frontend_dir)

    # Prepare environment
    env_backend = os.environ.copy()
    env_backend["PYTHONUNBUFFERED"] = "1"

    env_frontend = os.environ.copy()

    log("System", "Starting ScanNova Backend (Flask API on port 5000)...", GREEN)
    backend_proc = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=backend_dir,
        env=env_backend,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding="utf-8",
        errors="replace"
    )
    processes.append(("Backend", backend_proc))

    log("System", "Starting Frontend (Next.js on port 3000)...", CYAN)
    frontend_proc = subprocess.Popen(
        [npm_bin, "run", "dev"],
        cwd=frontend_dir,
        env=env_frontend,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding="utf-8",
        errors="replace"
    )
    processes.append(("Frontend", frontend_proc))

    # Start output streaming threads
    t_backend = threading.Thread(
        target=stream_logs,
        args=(backend_proc.stdout, "Backend", GREEN),
        daemon=True
    )
    t_frontend = threading.Thread(
        target=stream_logs,
        args=(frontend_proc.stdout, "Frontend", CYAN),
        daemon=True
    )
    t_backend.start()
    t_frontend.start()

    print(f"\n{BOLD}{YELLOW}Both services are launching:{RESET}")
    print(f"  • {BOLD}Frontend (Next.js UI):{RESET}  http://localhost:3000")
    print(f"  • {BOLD}Backend (Flask API):{RESET}    http://localhost:5000")
    print(f"  • {BOLD}Press Ctrl+C to shut down both servers cleanly.{RESET}\n")

    # Handle graceful exit
    def signal_handler(sig, frame):
        shutdown_event.set()
        log("System", "\nShutting down both servers...", YELLOW)
        for name, proc in processes:
            log("System", f"Stopping {name}...", YELLOW)
            kill_process_tree(proc)
        clean_next_dev_lock(frontend_dir)
        log("System", "All servers stopped successfully. Goodbye!", GREEN)
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    # Monitor processes
    try:
        while not shutdown_event.is_set():
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None and not shutdown_event.is_set():
                    if ret != 0:
                        log("System", f"{name} exited with error code {ret}.", RED)
                        signal_handler(None, None)
                    else:
                        log("System", f"{name} process finished.", YELLOW)
            time.sleep(0.5)
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()
