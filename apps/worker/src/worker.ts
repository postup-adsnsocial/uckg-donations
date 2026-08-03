export interface WorkerStatus {
  service: 'worker';
  status: 'ready';
}

export function getWorkerStatus(): WorkerStatus {
  return {
    service: 'worker',
    status: 'ready',
  };
}
