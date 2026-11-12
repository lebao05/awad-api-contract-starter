import { createServer } from 'node:http';
import { send, readRaw } from './http.js';
import { createV1 } from './v1.js';

// The service has two faces:
//   /menu…  the LEGACY, unversioned API that old clients still call. Its
//           behaviour is frozen: price in thousands of dong, errors as
//           { error, message }. See CONTRACT.md §5 before touching it.
//   /v1/…   the versioned API described in CONTRACT.md — src/v1.js.

const legacyError = (res, status, code, message, headers) => send(res, status, { error: code, message }, headers);
const isPrice = (p) => typeof p === 'number' && Number.isFinite(p) && p > 0 && p <= 100000;
const legacyHeaders = {
  Deprecation: '@1792022400',
  Sunset: 'Thu, 31 Dec 2026 23:59:59 GMT',
};

export function createApp(db) {
  const q = {
    list: db.prepare('SELECT id, name, price_vnd FROM menu_items ORDER BY id LIMIT ? OFFSET ?'),
    get: db.prepare('SELECT id, name, price_vnd FROM menu_items WHERE id = ?'),
    insert: db.prepare('INSERT INTO menu_items (name, price_vnd) VALUES (?, ?)'),
    setPrice: db.prepare('UPDATE menu_items SET price_vnd = ? WHERE id = ?'),
  };
  // Old clients read `price` in thousands of dong.
  const legacyView = (row) => ({ id: row.id, name: row.name, price: row.price_vnd / 1000 });
  const v1 = createV1(db);

  async function legacy(req, res, url, h) {
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'menu' && parts.length === 1) {
      if (req.method === 'GET') {
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        return send(res, 200, q.list.all(limit, offset).map(legacyView), h);
      }
      if (req.method === 'POST') {
        let body; try { body = JSON.parse((await readRaw(req)) || '{}'); } catch { body = null; }
        if (!body || typeof body.name !== 'string' || !body.name || !isPrice(body.price))
          return legacyError(res, 400, 'invalid_body', 'name (string) and price (thousands of dong) are required', h);
        const { lastInsertRowid } = q.insert.run(body.name, Math.round(body.price * 1000));
        return send(res, 201, legacyView(q.get.get(lastInsertRowid)), h);
      }
    }

    if (parts[0] === 'menu' && parts.length === 2) {
      const id = Number(parts[1]);
      const row = Number.isInteger(id) ? q.get.get(id) : undefined;
      if (!row) return legacyError(res, 404, 'not_found', `menu item ${parts[1]} not found`, h);
      if (req.method === 'GET') {
        return send(res, 200, legacyView(row), { ...h, Link: `</v1/menu/${id}>; rel="successor-version"` });
      }
      if (req.method === 'PATCH') {
        let body; try { body = JSON.parse((await readRaw(req)) || '{}'); } catch { body = null; }
        if (!body || !isPrice(body.price))
          return legacyError(res, 400, 'invalid_body', 'price (thousands of dong) is required', h);
        q.setPrice.run(Math.round(body.price * 1000), id);
        return send(res, 200, legacyView(q.get.get(id)), h);
      }
    }

    return legacyError(res, 404, 'not_found', 'no such route', h);
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname === '/v1' || url.pathname.startsWith('/v1/')) {
      if (await v1(req, res, url)) return;
    }
    return legacy(req, res, url, legacyHeaders);
  }

  return createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) legacyError(res, 500, 'internal', e.message, legacyHeaders);
    });
  });
}
