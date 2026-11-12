import { randomUUID } from 'node:crypto';
import { send, readRaw } from './http.js';

const PROBLEMS = {
  'invalid-json': [400, 'Malformed JSON'],
  validation: [400, 'Invalid request'],
  'idempotency-key-missing': [400, 'Idempotency-Key required'],
  'not-found': [404, 'Not found'],
  'idempotency-key-in-flight': [409, 'Request in progress'],
  'unknown-menu-item': [422, 'Unknown menu item'],
  'idempotency-key-reused': [422, 'Idempotency-Key reused'],
  internal: [500, 'Internal error'],
};

function problem(res, slug, detail, errors) {
  const [status, title] = PROBLEMS[slug];
  const body = {
    type: `https://menu.example/problems/${slug}`,
    title,
    status,
    detail,
  };
  if (errors) body.errors = errors;
  return send(res, status, body, { 'content-type': 'application/problem+json' });
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function menuItem(row) {
  return { id: row.id, name: row.name, priceVnd: row.price_vnd };
}

function orderFromDb(db, orderRow) {
  const items = db.prepare(`
    SELECT menu_item_id, qty, unit_price_vnd
    FROM order_items WHERE order_id = ? ORDER BY line
  `).all(orderRow.id).map((row) => ({
    menuItemId: row.menu_item_id,
    qty: row.qty,
    unitPriceVnd: row.unit_price_vnd,
  }));
  return {
    id: orderRow.id,
    tableId: orderRow.table_id,
    items,
    totalVnd: orderRow.total_vnd,
    createdAt: orderRow.created_at,
  };
}

function positiveId(value) {
  const id = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function queryInteger(url, name, min, max, fallback) {
  const values = url.searchParams.getAll(name);
  if (!values.length) return { value: fallback };
  if (values.length !== 1 || !/^\d+$/.test(values[0])) return { error: true };
  const value = Number(values[0]);
  if (!Number.isSafeInteger(value) || value < min || value > max) return { error: true };
  return { value };
}

function validateOrder(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return [{ pointer: '', detail: 'must be an object' }];
  }

  const errors = [];
  if (!Number.isInteger(body.tableId) || body.tableId < 1 || body.tableId > 200) {
    errors.push({ pointer: '/tableId', detail: 'must be an integer from 1 to 200' });
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    errors.push({ pointer: '/items', detail: 'must be an array of 1 to 20 lines' });
  } else {
    body.items.forEach((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({ pointer: `/items/${index}`, detail: 'must be an object' });
        return;
      }
      if (!Number.isSafeInteger(item.menuItemId) || item.menuItemId < 1) {
        errors.push({ pointer: `/items/${index}/menuItemId`, detail: 'must be a positive integer' });
      }
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) {
        errors.push({ pointer: `/items/${index}/qty`, detail: 'must be an integer from 1 to 20' });
      }
    });
  }
  return errors;
}

function validationProblem(res, errors) {
  return problem(res, 'validation', `${errors.length} field${errors.length === 1 ? ' is' : 's are'} invalid.`, errors);
}

function rollback(db) {
  try { db.exec('ROLLBACK'); } catch { /* No transaction remains to roll back. */ }
}

export function createV1(db) {
  const queries = {
    getMenu: db.prepare('SELECT id, name, price_vnd FROM menu_items WHERE id = ?'),
    getOrder: db.prepare('SELECT id, table_id, total_vnd, created_at FROM orders WHERE id = ?'),
    getIdempotency: db.prepare(`
      SELECT fingerprint, response_body, location, status
      FROM order_idempotency WHERE idempotency_key = ?
    `),
    deletePending: db.prepare(`
      DELETE FROM order_idempotency
      WHERE idempotency_key = ? AND status = 'pending'
    `),
    insertPending: db.prepare(`
      INSERT INTO order_idempotency
        (idempotency_key, fingerprint, status, started_at)
      VALUES (?, ?, 'pending', ?)
    `),
    updateCompleted: db.prepare(`
      UPDATE order_idempotency
      SET status = 'complete', response_body = ?, location = ?, completed_at = ?
      WHERE idempotency_key = ? AND status = 'pending'
    `),
    getCursor: db.prepare(`
      SELECT table_id, snapshot_id, before_id, expires_at
      FROM order_cursors WHERE cursor = ?
    `),
    insertCursor: db.prepare(`
      INSERT INTO order_cursors (cursor, table_id, snapshot_id, before_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `),
  };

  async function placeOrder(req, res) {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 1 || key.length > 255) {
      return problem(res, 'idempotency-key-missing', 'A valid Idempotency-Key header is required.');
    }

    let raw;
    try {
      raw = await readRaw(req);
    } catch {
      throw new Error('Unable to read request body');
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return problem(res, 'invalid-json', 'The request body is not valid JSON.');
    }

    const fingerprint = canonicalJson(body);
    const now = new Date();
    const nowIso = now.toISOString();

    db.exec('BEGIN IMMEDIATE');
    let transactionOpen = true;
    try {
      db.prepare(`
        DELETE FROM order_idempotency
        WHERE idempotency_key = ? AND status = 'pending'
          AND datetime(started_at) < datetime('now', '-24 hours')
      `).run(key);
      const previous = queries.getIdempotency.get(key);
      if (previous) {
        db.exec('COMMIT');
        transactionOpen = false;
        if (previous.status === 'pending') {
          return problem(res, 'idempotency-key-in-flight', 'A request using this key is still being processed.');
        }
        if (previous.fingerprint !== fingerprint) {
          return problem(res, 'idempotency-key-reused', 'This key was already used with a different request body.');
        }
        return send(res, 201, JSON.parse(previous.response_body), {
          Location: previous.location,
          'Idempotent-Replayed': 'true',
        });
      }

      queries.insertPending.run(key, fingerprint, nowIso);
      db.exec('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) rollback(db);
      throw error;
    }

    const errors = validateOrder(body);
    if (errors.length) {
      queries.deletePending.run(key);
      return validationProblem(res, errors);
    }

    const unknownItems = [];
    for (let index = 0; index < body.items.length; index += 1) {
      if (!queries.getMenu.get(body.items[index].menuItemId)) {
        unknownItems.push({
          pointer: `/items/${index}/menuItemId`,
          detail: 'does not identify an existing menu item',
        });
      }
    }
    if (unknownItems.length) {
      queries.deletePending.run(key);
      return problem(res, 'unknown-menu-item', `${unknownItems.length} menu item${unknownItems.length === 1 ? ' is' : 's are'} unknown.`, unknownItems);
    }

    db.exec('BEGIN IMMEDIATE');
    transactionOpen = true;
    try {
      let totalVnd = 0;
      const lines = body.items.map((item, index) => {
        const menu = queries.getMenu.get(item.menuItemId);
        const line = { menuItemId: item.menuItemId, qty: item.qty, unitPriceVnd: menu.price_vnd, index };
        totalVnd += line.unitPriceVnd * line.qty;
        return line;
      });
      const createdAt = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO orders (table_id, total_vnd, created_at) VALUES (?, ?, ?)
      `).run(body.tableId, totalVnd, createdAt);
      const orderId = Number(result.lastInsertRowid);
      const insertLine = db.prepare(`
        INSERT INTO order_items (order_id, line, menu_item_id, qty, unit_price_vnd)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const line of lines) {
        insertLine.run(orderId, line.index, line.menuItemId, line.qty, line.unitPriceVnd);
      }
      const order = orderFromDb(db, queries.getOrder.get(orderId));
      const responseBody = JSON.stringify(order);
      const location = `/v1/orders/${orderId}`;
      queries.updateCompleted.run(responseBody, location, new Date().toISOString(), key);
      db.exec('COMMIT');
      transactionOpen = false;
      return send(res, 201, order, { Location: location });
    } catch (error) {
      if (transactionOpen) rollback(db);
      queries.deletePending.run(key);
      throw error;
    }
  }

  function listOrders(url, res) {
    const tableResult = queryInteger(url, 'tableId', 1, 200, null);
    if (tableResult.error) {
      return validationProblem(res, [{ parameter: 'tableId', detail: 'must be an integer from 1 to 200' }]);
    }
    const limitResult = queryInteger(url, 'limit', 1, 100, 20);
    if (limitResult.error) {
      return validationProblem(res, [{ parameter: 'limit', detail: 'must be an integer from 1 to 100' }]);
    }
    const cursorValues = url.searchParams.getAll('cursor');
    if (cursorValues.length > 1 || (cursorValues.length === 1 && !cursorValues[0])) {
      return validationProblem(res, [{ parameter: 'cursor', detail: 'is not a readable cursor' }]);
    }
    const tableId = tableResult.value;
    const limit = limitResult.value;
    let snapshotId;
    let beforeId = Number.MAX_SAFE_INTEGER;

    if (cursorValues.length === 1) {
      const cursor = queries.getCursor.get(cursorValues[0]);
      if (!cursor || Date.parse(cursor.expires_at) <= Date.now() ||
          cursor.table_id !== tableId) {
        return validationProblem(res, [{ parameter: 'cursor', detail: 'is not valid for this table or has expired' }]);
      }
      snapshotId = cursor.snapshot_id;
      beforeId = cursor.before_id;
    } else {
      snapshotId = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM orders').get().id;
    }

    const conditions = ['id <= ?', 'id < ?'];
    const parameters = [snapshotId, beforeId];
    if (tableId !== null) {
      conditions.push('table_id = ?');
      parameters.push(tableId);
    }
    parameters.push(limit + 1);
    const rows = db.prepare(`
      SELECT id, table_id, total_vnd, created_at
      FROM orders WHERE ${conditions.join(' AND ')}
      ORDER BY id DESC LIMIT ?
    `).all(...parameters);
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    let nextCursor = null;
    if (hasMore) {
      nextCursor = randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      queries.insertCursor.run(nextCursor, tableId, snapshotId, pageRows[pageRows.length - 1].id, expiresAt);
    }
    return send(res, 200, {
      items: pageRows.map((row) => orderFromDb(db, row)),
      nextCursor,
    });
  }

  return async function handleV1(req, res, url) {
    try {
      const menuMatch = url.pathname.match(/^\/v1\/menu\/([^/]+)$/);
      if (req.method === 'GET' && menuMatch) {
        const id = positiveId(menuMatch[1]);
        const row = id === null ? undefined : queries.getMenu.get(id);
        if (!row) problem(res, 'not-found', 'The requested menu item was not found.');
        else send(res, 200, menuItem(row));
        return true;
      }

      if (url.pathname === '/v1/orders' && req.method === 'POST') {
        await placeOrder(req, res);
        return true;
      }
      if (url.pathname === '/v1/orders' && req.method === 'GET') {
        listOrders(url, res);
        return true;
      }

      const orderMatch = url.pathname.match(/^\/v1\/orders\/([^/]+)$/);
      if (req.method === 'GET' && orderMatch) {
        const id = positiveId(orderMatch[1]);
        const row = id === null ? undefined : queries.getOrder.get(id);
        if (!row) problem(res, 'not-found', 'The requested order was not found.');
        else send(res, 200, orderFromDb(db, row));
        return true;
      }

      problem(res, 'not-found', 'No such version 1 API path exists.');
      return true;
    } catch (error) {
      console.error(error);
      if (!res.headersSent) problem(res, 'internal', 'An unexpected error occurred.');
      return true;
    }
  };
}
