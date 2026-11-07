import { getAdminService } from "./admin.service";
import { logger } from "../utils/logger";

let collectorInterval: NodeJS.Timeout | null = null;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Executa uma captura e persistência das métricas do servidor no banco de dados.
 */
export async function captureAndSaveSystemMetric(): Promise<void> {
  try {
    const adminService = getAdminService();
    const entry = await adminService.saveSystemResourceMetric();
    logger.debug("Métricas de recursos do servidor salvas com sucesso", {
      id: entry.id,
      cpu: `${entry.cpu_usage_percent}%`,
      mem: `${entry.memory_usage_percent}%`,
      disk: `${entry.disk_usage_percent}%`,
      timestamp: entry.created_at,
    });
  } catch (error) {
    logger.warn("Falha ao registrar métricas periódicas de recursos do servidor", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Inicia o coletor em segundo plano com persistência a cada 5 minutos (300.000 ms).
 */
export function startMetricsCollector(
  intervalMs = FIVE_MINUTES_MS,
  runImmediately = true
): void {
  if (collectorInterval) {
    return; // Já está rodando
  }

  logger.info(`Iniciando Coletor de Métricas de Servidor (Intervalo: ${intervalMs / 1000}s)`);

  if (runImmediately) {
    captureAndSaveSystemMetric().catch(() => {});
  }

  collectorInterval = setInterval(() => {
    captureAndSaveSystemMetric().catch(() => {});
  }, intervalMs);

  collectorInterval.unref();
}

/**
 * Encerra o coletor em segundo plano.
 */
export function stopMetricsCollector(): void {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    logger.info("Coletor de Métricas de Servidor finalizado.");
  }
}

export function isMetricsCollectorRunning(): boolean {
  return collectorInterval !== null;
}
