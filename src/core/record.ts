export function setOwn<T>(record: Record<string, T>, key: string, value: T): void {
  if (key !== '__proto__') {
    record[key] = value
    return
  }

  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}
