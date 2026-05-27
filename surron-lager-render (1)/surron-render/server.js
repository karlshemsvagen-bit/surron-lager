// Surron Lager — Server för Render.com (Node.js + PostgreSQL)
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Add a PostgreSQL database in Render and connect it to this service.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ DATABAS ============
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      price DOUBLE PRECISION DEFAULT 0,
      zone TEXT NOT NULL,
      shelf TEXT NOT NULL,
      bin TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_stock_code ON stock(code);
    CREATE INDEX IF NOT EXISTS idx_stock_location ON stock(zone, shelf, bin);

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type TEXT NOT NULL,
      code TEXT,
      name TEXT,
      location TEXT,
      qty INTEGER,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts DESC);
  `);
  console.log('Database initialized.');
}

function rowToStock(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    price: parseFloat(row.price) || 0,
    location: { zone: row.zone, shelf: row.shelf, bin: row.bin },
    qty: row.qty
  };
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

// ============ STOCK API ============
app.get('/api/stock', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stock ORDER BY zone, shelf, bin');
    res.json(result.rows.map(rowToStock));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/stock/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, price, location, qty } = req.body;
  if (!code || !location || qty == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await pool.query(`
      INSERT INTO stock (id, code, name, price, zone, shelf, bin, qty, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT(id) DO UPDATE SET
        code=EXCLUDED.code, name=EXCLUDED.name, price=EXCLUDED.price,
        zone=EXCLUDED.zone, shelf=EXCLUDED.shelf, bin=EXCLUDED.bin,
        qty=EXCLUDED.qty, updated_at=NOW()
    `, [id, code, name || '', price || 0, location.zone, location.shelf, location.bin, qty]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM stock WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/stock/batch', async (req, res) => {
  const { operations } = req.body;
  if (!Array.isArray(operations)) return res.status(400).json({ error: 'operations must be array' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const op of operations) {
      if (op.type === 'set') {
        const item = op.item;
        await client.query(`
          INSERT INTO stock (id, code, name, price, zone, shelf, bin, qty, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT(id) DO UPDATE SET
            code=EXCLUDED.code, name=EXCLUDED.name, price=EXCLUDED.price,
            zone=EXCLUDED.zone, shelf=EXCLUDED.shelf, bin=EXCLUDED.bin,
            qty=EXCLUDED.qty, updated_at=NOW()
        `, [item.id, item.code, item.name || '', item.price || 0,
            item.location.zone, item.location.shelf, item.location.bin, item.qty]);
      } else if (op.type === 'delete') {
        await client.query('DELETE FROM stock WHERE id = $1', [op.id]);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ============ HISTORY API ============
app.get('/api/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  try {
    const result = await pool.query(
      'SELECT id, ts, type, code, name, location, qty, note FROM history ORDER BY ts DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows.map(r => ({ ...r, ts: r.ts.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/history', async (req, res) => {
  const { type, code, name, location, qty, note } = req.body;
  const id = uid();
  try {
    await pool.query(`
      INSERT INTO history (id, ts, type, code, name, location, qty, note)
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
    `, [id, type, code || null, name || null, location || null, qty || 0, note || null]);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    await pool.query('DELETE FROM history');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Hälsokoll för Render
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ============ START ============
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Surron Lager server running on port ${PORT}`);
    });
  })
  .catch(e => {
    console.error('Failed to initialize database:', e);
    process.exit(1);
  });
