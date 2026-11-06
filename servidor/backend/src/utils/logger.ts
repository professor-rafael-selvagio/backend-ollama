/**
 * Logger estruturado e seguro para o Backend
 * Evita vazamento de credenciais, tokens e informações sensíveis.
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  private redact(obj: unknown): unknown {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const sensitiveKeys = [
      "authorization",
      "token",
      "bearer",
      "password",
      "secret",
      "apikey",
      "api_key",
      "supabase_anon_key",
      "key",
    ];

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        cleaned[key] = "[REDACTED]";
      } else if (typeof val === "object" && val !== null) {
        cleaned[key] = this.redact(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      payload.context = this.redact(context) as Record<string, unknown>;
    }

    if (error) {
      payload.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      };
    }

    if (this.isProduction) {
      // Formato JSON estruturado para coletores como Datadog, CloudWatch ou ELK
      console.log(JSON.stringify(payload));
    } else {
      // Formato legível para terminal de desenvolvimento local
      const prefix = `[${payload.timestamp}] [${level}]`;
      if (level === "ERROR") {
        console.error(`${prefix} ${message}`, context ? payload.context : "", error ? error.message : "");
      } else if (level === "WARN") {
        console.warn(`${prefix} ${message}`, context ? payload.context : "");
      } else {
        console.log(`${prefix} ${message}`, context ? payload.context : "");
      }
    }
  }

  public debug(message: string, context?: Record<string, unknown>) {
    if (!this.isProduction) {
      this.write("DEBUG", message, context);
    }
  }

  public info(message: string, context?: Record<string, unknown>) {
    this.write("INFO", message, context);
  }

  public warn(message: string, context?: Record<string, unknown>) {
    this.write("WARN", message, context);
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.write("ERROR", message, context, error);
  }
}

export const logger = new Logger();

