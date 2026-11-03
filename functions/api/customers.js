function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function id() {
  return `BD-CUST-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
  const query = search
    ? 'SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? OR email LIKE ? ORDER BY name LIMIT ?'
    : 'SELECT * FROM customers ORDER BY name LIMIT ?';
  const values = search ? [`%${search}%`, `%${search}%`, `%${search}%`, limit] : [limit];
  const result = await env.DB.prepare(query).bind(...values).all();
  return json({ data: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  // Accept both the API field name and the legacy form field name.
  const name = String(body?.name || body?.customerName || '').trim();
  if (!name) return json({ error: 'Customer name is required.' }, 400);
  const record = {
    id: String(body.id || id()),
    name,
    mobile: String(body.mobile || '').trim(),
    alt_mobile: String(body.alt_mobile || body.alt || '').trim(),
    email: String(body.email || '').trim(),
    address: String(body.address || '').trim(),
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    pin: String(body.pin || '').trim(),
    gst: String(body.gst || '').trim(),
    type: String(body.type || '').trim(),
    dob: String(body.dob || '').trim()
  };
  await env.DB.prepare(`INSERT INTO customers
    (id,name,mobile,alt_mobile,email,address,city,state,pin,gst,type,dob)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    record.id, record.name, record.mobile, record.alt_mobile, record.email,
    record.address, record.city, record.state, record.pin, record.gst,
    record.type, record.dob
  ).run();
  await env.DB.prepare('INSERT INTO audit_logs (action, detail) VALUES (?, ?)')
    .bind('Create', `${record.id} saved`).run();
  return json({ data: record }, 201);
}
