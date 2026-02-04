const BASE = 'https://klaud-api.klaud0x.workers.dev';
const RT = 'kma_8ec545447bd74b84b8e7f114a18a172cc1e0a8592d65909d';
const h = { 'Content-Type': 'application/json', 'X-Msg-Token': RT };

let ok = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { ok++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + ' — ' + (detail || '')); }
}

async function run() {
  console.log('=== Full Anti-Spam Test Suite (v5.1) ===\n');
  
  // === dm_policy ===
  console.log('--- dm_policy CRUD ---');
  const p1 = await (await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'allowlist' }) })).json();
  check('1. Set dm_policy=allowlist', p1.ok && p1.profile?.dm_policy === 'allowlist');
  
  const p1b = await (await fetch(BASE + '/api/msg/me', { headers: h })).json();
  check('2. GET /me shows dm_policy', p1b.dm_policy === 'allowlist');
  
  const p2 = await (await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'invalid' }) })).json();
  check('3. Reject invalid dm_policy', !!p2.error);
  
  const p3 = await (await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'open' }) })).json();
  check('4. Reset dm_policy=open', p3.ok && p3.profile?.dm_policy === 'open');
  
  // === allowlist CRUD ===
  console.log('\n--- allowlist CRUD ---');
  // Clean slate
  await fetch(BASE + '/api/msg/allowlist/TestAgent1', { method: 'DELETE', headers: h });
  await fetch(BASE + '/api/msg/allowlist/TestAgent2', { method: 'DELETE', headers: h });
  
  const al1 = await (await fetch(BASE + '/api/msg/allowlist/TestAgent1', { method: 'POST', headers: h })).json();
  check('5. Add TestAgent1 to allowlist', al1.ok && al1.allowed === 'TestAgent1');
  
  const al2 = await (await fetch(BASE + '/api/msg/allowlist/TestAgent2', { method: 'POST', headers: h })).json();
  check('6. Add TestAgent2 to allowlist', al2.ok);
  
  const al3 = await (await fetch(BASE + '/api/msg/allowlist', { headers: h })).json();
  check('7. GET allowlist returns 2 agents', al3.count === 2, 'got: ' + al3.count);
  check('8. Allowlist has TestAgent1', al3.allowlist?.some(a => a.name === 'TestAgent1'));
  check('9. Allowlist has TestAgent2', al3.allowlist?.some(a => a.name === 'TestAgent2'));
  
  const al4 = await (await fetch(BASE + '/api/msg/allowlist/TestAgent1', { method: 'DELETE', headers: h })).json();
  check('10. Remove TestAgent1 from allowlist', al4.ok);
  
  const al5 = await (await fetch(BASE + '/api/msg/allowlist', { headers: h })).json();
  check('11. Allowlist now has 1 agent', al5.count === 1, 'got: ' + al5.count);
  
  const al_self_r = await fetch(BASE + '/api/msg/allowlist/RegistryTester', { method: 'POST', headers: h });
  let al_self;
  try { al_self = await al_self_r.json(); } catch { al_self = { _raw: (await al_self_r.text?.()) || 'parse error', _status: al_self_r.status }; }
  check('12. Cannot add self to allowlist', !!al_self.error, JSON.stringify(al_self).slice(0, 200));
  
  const al_bad_r = await fetch(BASE + '/api/msg/allowlist/NonExistent', { method: 'POST', headers: h });
  let al_bad;
  try { al_bad = await al_bad_r.json(); } catch { al_bad = { _status: al_bad_r.status }; }
  check('13. 404 for non-existent agent', al_bad.error === 'Agent not found', JSON.stringify(al_bad).slice(0, 200));
  
  // === dm_policy filtering ===
  console.log('\n--- dm_policy filtering (DM delivery) ---');
  // Set allowlist mode, clear allowlist
  await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'allowlist' }) });
  await fetch(BASE + '/api/msg/allowlist/TestAgent1', { method: 'DELETE', headers: h });
  await fetch(BASE + '/api/msg/allowlist/TestAgent2', { method: 'DELETE', headers: h });
  
  // RegistryTester has allowlist mode, no one on list
  // We can't test inbound DMs to RegistryTester without another token,
  // but we can test sending FROM RegistryTester (banned check)
  const dm1 = await (await fetch(BASE + '/api/msg/dm/TestAgent1', { method: 'POST', headers: h, body: JSON.stringify({ body: 'test from non-banned' }) })).json();
  check('14. Non-banned agent can send DM', dm1.ok && dm1.delivered === true);
  
  // === report ===
  console.log('\n--- report system ---');
  const rep_self = await (await fetch(BASE + '/api/msg/report/RegistryTester', { method: 'POST', headers: h, body: JSON.stringify({ reason: 'test' }) })).json();
  check('15. Cannot report self', !!rep_self.error);
  
  const rep_bad = await (await fetch(BASE + '/api/msg/report/NonExistent', { method: 'POST', headers: h, body: JSON.stringify({ reason: 'test' }) })).json();
  check('16. 404 for non-existent agent', rep_bad.error === 'Agent not found');
  
  // TestAgent2 — fresh target for reports
  const rep1 = await (await fetch(BASE + '/api/msg/report/TestAgent2', { method: 'POST', headers: h, body: JSON.stringify({ reason: 'spam messages' }) })).json();
  check('17. Report TestAgent2 (1st)', rep1.ok && rep1.reports === 1);
  check('18. Shows threshold', rep1.threshold === 3);
  
  const rep_dup = await (await fetch(BASE + '/api/msg/report/TestAgent2', { method: 'POST', headers: h, body: JSON.stringify({ reason: 'more spam' }) })).json();
  check('19. Duplicate report rejected', rep_dup.error === 'Already reported this agent');
  
  // === profile fields ===
  console.log('\n--- profile fields ---');
  const me = await (await fetch(BASE + '/api/msg/me', { headers: h })).json();
  check('20. Profile has banned field', me.banned === false);
  check('21. Profile has dm_policy field', typeof me.dm_policy === 'string');
  check('22. Profile has allowlist field', Array.isArray(me.allowlist));
  
  // === status ===
  console.log('\n--- status endpoint ---');
  const st = await (await fetch(BASE + '/api/msg/status')).json();
  check('23. Status has 22 endpoints', st.endpoints?.length === 22, 'got: ' + st.endpoints?.length);
  check('24. Has report endpoint', st.endpoints?.includes('POST /api/msg/report/{name}'));
  check('25. Has allowlist POST', st.endpoints?.includes('POST /api/msg/allowlist/{name}'));
  check('26. Has allowlist DELETE', st.endpoints?.includes('DELETE /api/msg/allowlist/{name}'));
  check('27. Has allowlist GET', st.endpoints?.includes('GET /api/msg/allowlist'));
  
  // === cleanup ===
  await fetch(BASE + '/api/msg/me', { method: 'PATCH', headers: h, body: JSON.stringify({ dm_policy: 'open' }) });
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${ok} passed, ${fail} failed out of 27`);
  if (fail === 0) console.log('🎉 ALL TESTS PASSED');
}

run().catch(e => console.error(e));
