/**
 * Job Tracker: singleton en memoria que registra el último estado de cada
 * cron job. Lo lee el endpoint de monitoreo para mostrar al admin si los
 * jobs están corriendo bien.
 *
 * Uso:
 *   await trackJob("LidSyncJob", async () => {
 *     ...lógica del job...
 *   });
 *
 * El singleton mantiene: nombre, lastRunAt, lastStatus, lastError,
 * lastDurationMs, runCount. Se pierde al reiniciar el proceso (es OK,
 * se popula al primer tick siguiente).
 */

export interface JobRecord {
  name: string;
  lastRunAt: Date | null;
  lastStatus: "ok" | "error" | "running" | null;
  lastError: string | null;
  lastDurationMs: number | null;
  runCount: number;
  startedAt: Date; // Cuándo se registró el job por primera vez
}

const registry = new Map<string, JobRecord>();

const ensureRecord = (name: string): JobRecord => {
  let record = registry.get(name);
  if (!record) {
    record = {
      name,
      lastRunAt: null,
      lastStatus: null,
      lastError: null,
      lastDurationMs: null,
      runCount: 0,
      startedAt: new Date(),
    };
    registry.set(name, record);
  }
  return record;
};

/**
 * Envuelve la ejecución de un job para registrar su estado.
 */
export const trackJob = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T | undefined> => {
  const record = ensureRecord(name);
  record.lastStatus = "running";
  const startTs = Date.now();
  try {
    const result = await fn();
    record.lastStatus = "ok";
    record.lastError = null;
    record.lastRunAt = new Date();
    record.lastDurationMs = Date.now() - startTs;
    record.runCount += 1;
    return result;
  } catch (err: any) {
    record.lastStatus = "error";
    record.lastError = err?.message || String(err);
    record.lastRunAt = new Date();
    record.lastDurationMs = Date.now() - startTs;
    record.runCount += 1;
    throw err;
  }
};

/** Registra un job aunque aún no haya corrido (para que aparezca en el panel). */
export const registerJob = (name: string): void => {
  ensureRecord(name);
};

/** Devuelve snapshot inmutable de todos los jobs registrados. */
export const getAllJobs = (): JobRecord[] => {
  return Array.from(registry.values()).map((r) => ({ ...r }));
};
