/** 同期・非同期のどちらの戻り値も受け付ける型 */
export type Awaitable<T> = T | Promise<T>;
