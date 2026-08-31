import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<
  PrismaClient,
  '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado a PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Ejecuta una operación dentro de una transacción con retry ante deadlocks de concurrencia. */
  async withTransaction<T>(fn: (tx: TransactionClient) => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.$transaction(fn, { maxWait: 10_000, timeout: 600_000 });
      } catch (err) {
        const isRetryable =
          err instanceof Error &&
          /deadlock|could not serialize|update conflict/.test(err.message);
        if (isRetryable && attempt < maxRetries) {
          this.logger.warn(`Transacción reintentada (intento ${attempt})`);
          continue;
        }
        throw err;
      }
    }
  }
}
