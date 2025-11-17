import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/routers';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  // transformer削除: plain JSONを使用（サーバー側と一致させる）
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL || ''}/api/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});
