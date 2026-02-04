const BASE = 'https://klaud-api.klaud0x.workers.dev';
const RT = 'kma_8ec545447bd74b84b8e7f114a18a172cc1e0a8592d65909d';
const h = { 'Content-Type': 'application/json', 'X-Msg-Token': RT };

let ok = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { ok++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + ' — ' + (detail || '')); }
}

async function run() {
  console.log('=== DM filtering + Ban integration tests ===\n');

  // 1. Set allowlist mode
  await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'allowlist' }) });
  // Clear allowlist
  await fetch(BASE + '/api/msg/allowlist/TestAgent2', { method: 'DELETE', headers: h });
  await fetch(BASE + '/api/msg/allowlist/TestAgent1', { method: 'DELETE', headers: h });

  // 2. Check profile
  const me = await (await fetch(BASE + '/api/msg/me', { headers: h })).json();
  check('Profile has allowlist field', Array.isArray(me.allowlist), 'allowlist: ' + JSON.stringify(me.allowlist));
  check('Profile has dm_policy=allowlist', me.dm_policy === 'allowlist', 'dm_policy: ' + me.dm_policy);
  check('Profile has banned=false', me.banned === false, 'banned: ' + me.banned);

  // 3. Status endpoint
  const st = await (await fetch(BASE + '/api/msg/status')).json();
  const epCount = st.endpoints?.length;
  check('Status has 22 endpoints', epCount === 22, 'got: ' + epCount);

  // 4. Non-banned agent can send DM
  const dm = await (await fetch(BASE + '/api/msg/dm/TestAgent1', { method: 'POST', headers: h, body: JSON.stringify({ body: 'legit message' }) })).json();
  check('Non-banned agent can send DM', dm.ok && dm.delivered === true, JSON.stringify(dm));

  // 5. Cleanup
  await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'open' }) });

  console.log(`\n=== Results: ${ok} passed, ${fail} failed ===`);
}

run().catch(e => console.error(e));
