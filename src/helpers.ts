export {};

declare global {
  interface ErrorConstructor {
    captureStackTrace?: (
      targetObject: object,
      constructorOpt?: Function,
    ) => void;
  }
}

export function clearStackTrace(error: unknown, parentFn: Function) {
  Error.captureStackTrace?.(error as Error, parentFn);
  return error;
}
