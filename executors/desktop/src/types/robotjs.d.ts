declare module "robotjs" {
  export function moveMouse(x: number, y: number): void;
  export function moveMouseSmooth(x: number, y: number): void;
  export function mouseClick(button?: "left" | "right" | "middle", double?: boolean): void;
  export function mouseToggle(down?: "down" | "up", button?: "left" | "right" | "middle"): void;
  export function dragMouse(x: number, y: number): void;
  export function scrollMouse(x: number, y: number): void;
  export function getMousePos(): { x: number; y: number };

  export function keyTap(key: string, modifier?: string | string[]): void;
  export function keyToggle(key: string, down: "down" | "up", modifier?: string | string[]): void;
  export function typeString(string: string): void;
  export function typeStringDelayed(string: string, cpm: number): void;

  export function setKeyboardDelay(ms: number): void;
  export function setMouseDelay(ms: number): void;

  export function getScreenSize(): { width: number; height: number };
  export function getPixelColor(x: number, y: number): string;
  export const screen: {
    capture(x?: number, y?: number, width?: number, height?: number): {
      width: number;
      height: number;
      byteWidth: number;
      bitsPerPixel: number;
      bytesPerPixel: number;
      image: Buffer;
    };
  };
}
