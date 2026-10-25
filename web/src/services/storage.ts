export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Не удалось сохранить данные в браузере. Проверьте доступность локального хранилища.",
    );
  }
}

export function removeStored(key: string): void {
  localStorage.removeItem(key);
}
