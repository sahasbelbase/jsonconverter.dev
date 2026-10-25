import { useCallback, useEffect, useRef } from 'react';
import type { WorkerRequest, WorkerResponse } from './jsonWorker';

/**
 * One worker per mounted tool, with every request keyed by id so a slow reply
 * for text the user has already changed is dropped instead of overwriting the
 * current result.
 */
export const useJsonWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, (response: WorkerResponse) => void>());
  const nextId = useRef(1);

  useEffect(() => {
    const worker = new Worker(new URL('./jsonWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const resolve = pending.current.get(event.data.id);
      if (resolve) {
        pending.current.delete(event.data.id);
        resolve(event.data);
      }
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      pending.current.clear();
      workerRef.current = null;
    };
  }, []);

  return useCallback((kind: WorkerRequest['kind'], text: string): Promise<WorkerResponse> => {
    const worker = workerRef.current;
    const id = nextId.current++;

    if (!worker) {
      return Promise.resolve({
        id,
        ok: false,
        message: 'The JSON worker is not running.',
        position: null,
      });
    }

    return new Promise((resolve) => {
      pending.current.set(id, resolve);
      worker.postMessage({ id, kind, text } satisfies WorkerRequest);
    });
  }, []);
};
