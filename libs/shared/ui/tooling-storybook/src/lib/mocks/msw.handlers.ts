/**
 * MSW handlers mínimos (opcionais).
 * Consumidores podem estender/mergear handlers conforme necessário.
 */
export const handlers = [];

// Example handler (commented) - consumers can enable MSW and add handlers
/*
import { rest } from 'msw';
handlers.push(
  rest.get('/api/example', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: [] }));
  })
);
*/

export default handlers;
