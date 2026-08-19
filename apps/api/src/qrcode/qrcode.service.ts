import { Injectable } from '@nestjs/common';
import * as qrcode from 'qrcode';

export interface QrOptions {
  width?: number;
  margin?: number;
  colorDark?: string;
  colorLight?: string;
}

@Injectable()
export class QrCodeService {
  /** Genera un QR en formato data URL (PNG). */
  async toDataUrl(value: string, options: QrOptions = {}): Promise<string> {
    return qrcode.toDataURL(value, {
      width: options.width ?? 400,
      margin: options.margin ?? 2,
      color: {
        dark: options.colorDark ?? '#0f172a',
        light: options.colorLight ?? '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  }

  /** Genera un QR como Buffer PNG. */
  async toPngBuffer(value: string, options: QrOptions = {}): Promise<Buffer> {
    const dataUrl = await this.toDataUrl(value, options);
    const base64 = dataUrl.split(',')[1];
    return Buffer.from(base64, 'base64');
  }
}