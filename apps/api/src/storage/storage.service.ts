import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Abstracción de almacenamiento de archivos (fotos, documentos).
 * Implementación local; la interfaz es compatible con un backend S3.
 */
@Injectable()
export class StorageService {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = join(process.cwd(), this.config.get('STORAGE_PATH') ?? './storage');
    this.baseUrl = this.config.get('STORAGE_PUBLIC_URL') ?? '';
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  getStorageDir(): string {
    return this.basePath;
  }

  getAbsolutePath(key: string): string {
    return join(this.basePath, key);
  }

  buildPublicUrl(key: string): string {
    if (this.baseUrl) return `${this.baseUrl.replace(/\/$/, '')}/${key}`;
    return `/files/${key}`;
  }

  async save(buffer: Buffer, folder: string, originalName = 'archivo'): Promise<{ key: string; url: string; size: number }> {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${randomUUID()}-${safeName}`;
    const targetDir = dirname(this.getAbsolutePath(key));
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(this.getAbsolutePath(key));
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      stream.write(buffer);
      stream.end();
    });
    return { key, url: this.buildPublicUrl(key), size: buffer.length };
  }

  remove(key: string): void {
    const full = this.getAbsolutePath(key);
    if (existsSync(full)) {
      // Eliminación asíncrona segura (best effort)
      void import('fs').then((fs) => fs.default.promises.unlink(full).catch(() => undefined));
    }
  }
}