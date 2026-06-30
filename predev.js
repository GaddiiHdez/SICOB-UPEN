const { execSync } = require('child_process');
const os = require('os');

console.log('🔄 Verificando puerto 3000...');
try {
  if (os.platform() === 'win32') {
    const stdout = execSync('netstat -ano').toString();
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      if (line.includes(':3000') && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== process.pid.toString()) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      console.log(`💀 Terminando proceso huérfano con PID ${pid} en puerto 3000...`);
      execSync(`taskkill /F /PID ${pid}`);
    }
  } else {
    // macOS / Linux
    execSync('lsof -t -i:3000 | xargs kill -9 2>/dev/null || true');
  }
} catch (error) {
  // Ignorar errores si no hay procesos o falla la ejecución
}
console.log('✅ Puerto 3000 libre y listo.');
