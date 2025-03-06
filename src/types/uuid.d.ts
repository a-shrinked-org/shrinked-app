// src/types/uuid.d.ts
declare module 'uuid' {
  export function v1(): string;
  export function v3(name: string | Buffer, namespace: string | Buffer): string;
  export function v4(): string;
  export function v5(name: string | Buffer, namespace: string | Buffer): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): number;
}