import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService.me', () => {
  it('devuelve perfil con rol y permisos', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.cl',
          name: 'A',
          roleId: 'r1',
          role: { name: 'SUPER_ADMIN', permissions: [{ permission: { code: 'ASSET_READ' } }] },
        }),
      },
    } as unknown as PrismaService;

    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never);

    const profile = await service.me('u1');
    expect(profile.role).toBe('SUPER_ADMIN');
    expect(profile.permissions).toContain('ASSET_READ');
  });
});