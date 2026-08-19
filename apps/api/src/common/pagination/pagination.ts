export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function getPagination(page = 1, pageSize = 50): PaginationParams {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 500
      ? Math.floor(pageSize)
      : 50;
  return { page: safePage, pageSize: safeSize };
}

export async function paginate<T>(
  client: { count: (args: any) => Promise<number>; findMany: (args: any) => Promise<T[]> },
  args: { where?: any; orderBy?: any; select?: any; include?: any },
  page: number,
  pageSize: number,
) {
  const { page: p, pageSize: ps } = getPagination(page, pageSize);
  const [total, items] = await Promise.all([
    client.count({ where: args.where }),
    client.findMany({
      where: args.where,
      orderBy: args.orderBy,
      include: args.include,
      select: args.select,
      skip: (p - 1) * ps,
      take: ps,
    }),
  ]);

  return {
    items,
    meta: {
      total,
      page: p,
      pageSize: ps,
      totalPages: total === 0 ? 0 : Math.ceil(total / ps),
    },
  };
}