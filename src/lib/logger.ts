type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => write("error", event, data),
};
