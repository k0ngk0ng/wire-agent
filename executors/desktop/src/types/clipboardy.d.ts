declare module "clipboardy" {
  export function read(): Promise<string>;
  export function write(text: string): Promise<void>;
  export function readSync(): string;
  export function writeSync(text: string): void;
}
