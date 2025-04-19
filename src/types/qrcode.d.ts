declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: {
      width?: number;
      margin?: number;
      scale?: number;
      color?: {
        dark?: string;
        light?: string;
      };
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: object
  ): Promise<HTMLCanvasElement>;

  export function toString(text: string, options?: object): Promise<string>;

  export function toFile(
    path: string,
    text: string,
    options?: object
  ): Promise<void>;

  export function toBuffer(text: string, options?: object): Promise<Buffer>;
}