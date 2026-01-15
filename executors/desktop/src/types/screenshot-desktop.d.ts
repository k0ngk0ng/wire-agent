declare module "screenshot-desktop" {
  interface CaptureOptions {
    screen?: number;
    filename?: string;
    format?: "png" | "jpg";
  }

  function capture(options?: CaptureOptions): Promise<Buffer>;
  function capture(options?: number): Promise<Buffer>;

  export = capture;
}
