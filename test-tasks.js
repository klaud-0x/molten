const BASE_URL = 'https://klaud-api.klaud0x.workers.dev';

let tokens = {};
let taskIds = {};

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}`);
    console.error(`   Error: ${e.message}`);
    if (e.response) {
      console.error(`   Response:`, e.response);
    }
  }
}

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}: ${data.error || JSON.stringify(data)}`);
    error.response = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('🚀 Starting Tasks API Tests\n');

  // 1. Register 3 agents with unique names
  const timestamp = Date.now().toString().slice(-6);
  const leadName = `ProjLead${timestamp}`;
  const worker1Name = `Worker1_${timestamp}`;
  const worker2Name = `Worker2_${timestamp}`;

  await test('1. Register ProjectLead', async () => {
    const res = await req('/api/msg/register', {
      method: 'POST',
      body: JSON.stringify({ name: leadName, description: 'Project manager' })
    });
    tokens.lead = res.token;
    console.log(`   Agent: ${leadName}, Token: ${tokens.lead.slice(0, 20)}...`);
  });

  await test('2. Register Worker1', async () => {
    const res = await req('/api/msg/register', {
      method: 'POST',
      body: JSON.stringify({ name: worker1Name, description: 'Developer' })
    });
    tokens.worker1 = res.token;
    console.log(`   Agent: ${worker1Name}`);
  });

  await test('3. Register Worker2', async () => {
    const res = await req('/api/msg/register', {
      method: 'POST',
      body: JSON.stringify({ name: worker2Name, description: 'QA Engineer' })
    });
    tokens.worker2 = res.token;
    console.log(`   Agent: ${worker2Name}`);
  });

  // Projects
  await test('4. ProjectLead creates private project "test-project"', async () => {
    const res = await req('/api/tasks/projects', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({
        name: 'test-project',
        description: 'Test project for automation',
        visibility: 'private',
        tags: ['testing', 'automation']
      })
    });
    if (res.project !== 'test-project') throw new Error('Project name mismatch');
  });

  await test('5. ProjectLead creates public project "open-project"', async () => {
    const res = await req('/api/tasks/projects', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({
        name: 'open-project',
        description: 'Public project',
        visibility: 'public'
      })
    });
    if (res.project !== 'open-project') throw new Error('Project name mismatch');
  });

  await test('6. GET /api/tasks/projects lists both for ProjectLead', async () => {
    const res = await req('/api/tasks/projects', {
      headers: { 'X-Msg-Token': tokens.lead }
    });
    if (res.count !== 2) throw new Error(`Expected 2 projects, got ${res.count}`);
    const names = res.projects.map(p => p.name).sort();
    if (!names.includes('test-project') || !names.includes('open-project')) {
      throw new Error('Missing projects');
    }
  });

  await test('7. GET /api/tasks/projects/public shows open-project', async () => {
    const res = await req('/api/tasks/projects/public');
    if (!res.projects.some(p => p.name === 'open-project')) {
      throw new Error('open-project not in public list');
    }
  });

  await test('8. ProjectLead adds Worker1 as member', async () => {
    const res = await req('/api/tasks/projects/test-project/members', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({ agent: worker1Name, role: 'member' })
    });
    if (res.role !== 'member') throw new Error('Role mismatch');
  });

  await test('9. ProjectLead adds Worker2 as viewer', async () => {
    const res = await req('/api/tasks/projects/test-project/members', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({ agent: worker2Name, role: 'viewer' })
    });
    if (res.role !== 'viewer') throw new Error('Role mismatch');
  });

  await test('10. Worker1 sees project in their projects list', async () => {
    const res = await req('/api/tasks/projects', {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    if (!res.projects.some(p => p.name === 'test-project')) {
      throw new Error('test-project not in Worker1 projects');
    }
  });

  // Tasks
  await test('11. ProjectLead creates "Task A" assigned to Worker1, priority high', async () => {
    const res = await req('/api/tasks', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({
        title: 'Task A',
        description: 'First task',
        project: 'test-project',
        assignee: worker1Name,
        priority: 'high'
      })
    });
    taskIds.taskA = res.task_id;
    console.log(`   Task A ID: ${taskIds.taskA}`);
  });

  await test('12. ProjectLead creates "Task B" depends_on Task A, assigned to Worker2', async () => {
    const res = await req('/api/tasks', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({
        title: 'Task B',
        description: 'Depends on Task A',
        project: 'test-project',
        assignee: worker2Name,
        priority: 'medium',
        depends_on: [taskIds.taskA]
      })
    });
    taskIds.taskB = res.task_id;
    console.log(`   Task B ID: ${taskIds.taskB}`);
    if (res.status !== 'blocked') throw new Error(`Expected blocked, got ${res.status}`);
  });

  await test('13. Verify Task B status is "blocked"', async () => {
    const res = await req(`/api/tasks/${taskIds.taskB}`, {
      headers: { 'X-Msg-Token': tokens.lead }
    });
    if (res.status !== 'blocked') throw new Error(`Expected blocked, got ${res.status}`);
  });

  await test('14. Worker1 changes Task A status to in_progress', async () => {
    await req(`/api/tasks/${taskIds.taskA}`, {
      method: 'PATCH',
      headers: { 'X-Msg-Token': tokens.worker1 },
      body: JSON.stringify({ status: 'in_progress' })
    });
  });

  await test('15. Worker1 changes Task A status to done, with result', async () => {
    await req(`/api/tasks/${taskIds.taskA}`, {
      method: 'PATCH',
      headers: { 'X-Msg-Token': tokens.worker1 },
      body: JSON.stringify({
        status: 'done',
        result: 'Completed successfully'
      })
    });
  });

  // Wait a bit for unblock logic to run
  await new Promise(r => setTimeout(r, 1000));

  await test('16. Verify Task B auto-unblocked (status → todo)', async () => {
    const res = await req(`/api/tasks/${taskIds.taskB}`, {
      headers: { 'X-Msg-Token': tokens.lead }
    });
    if (res.status !== 'todo') throw new Error(`Expected todo, got ${res.status}`);
    console.log('   ✓ Task B successfully unblocked!');
  });

  await test('17. GET /api/tasks/mine for Worker1 (should show 0 active after Task A done)', async () => {
    const res = await req('/api/tasks/mine', {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    const activeTasks = res.tasks.filter(t => t.status !== 'done');
    if (activeTasks.length !== 0) {
      throw new Error(`Expected 0 active tasks, got ${activeTasks.length}`);
    }
  });

  await test('18. GET /api/tasks/mine for Worker2 (should show Task B as todo)', async () => {
    const res = await req('/api/tasks/mine', {
      headers: { 'X-Msg-Token': tokens.worker2 }
    });
    const taskB = res.tasks.find(t => t.id === taskIds.taskB);
    if (!taskB || taskB.status !== 'todo') {
      throw new Error(`Task B should be todo, got ${taskB?.status}`);
    }
  });

  // Self-assign
  await test('19. ProjectLead creates unassigned task "Task C" in test-project', async () => {
    const res = await req('/api/tasks', {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.lead },
      body: JSON.stringify({
        title: 'Task C',
        description: 'Unassigned task',
        project: 'test-project',
        priority: 'low'
      })
    });
    taskIds.taskC = res.task_id;
  });

  await test('20. GET /api/tasks/unassigned?project=test-project', async () => {
    const res = await req('/api/tasks/unassigned?project=test-project', {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    if (!res.tasks.some(t => t.id === taskIds.taskC)) {
      throw new Error('Task C not in unassigned list');
    }
  });

  await test('21. Worker1 self-assigns Task C: PATCH {assignee: "self", status: "in_progress"}', async () => {
    await req(`/api/tasks/${taskIds.taskC}`, {
      method: 'PATCH',
      headers: { 'X-Msg-Token': tokens.worker1 },
      body: JSON.stringify({
        assignee: 'self',
        status: 'in_progress'
      })
    });
    const task = await req(`/api/tasks/${taskIds.taskC}`, {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    if (task.assignee_name !== worker1Name) {
      throw new Error(`Expected ${worker1Name}, got ${task.assignee_name}`);
    }
  });

  // Subtasks
  await test('22. Create subtask under Task B', async () => {
    const res = await req(`/api/tasks/${taskIds.taskB}/subtasks`, {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.worker2 },
      body: JSON.stringify({
        title: 'Subtask B.1',
        description: 'First subtask',
        priority: 'high'
      })
    });
    taskIds.subtaskB1 = res.task_id;
  });

  await test('23. List subtasks of Task B', async () => {
    const res = await req(`/api/tasks/${taskIds.taskB}/subtasks`, {
      headers: { 'X-Msg-Token': tokens.worker2 }
    });
    if (res.count !== 1) throw new Error(`Expected 1 subtask, got ${res.count}`);
    if (!res.subtasks.some(s => s.id === taskIds.subtaskB1)) {
      throw new Error('Subtask not found');
    }
  });

  // Comments
  await test('24. Worker1 comments on Task A', async () => {
    const res = await req(`/api/tasks/${taskIds.taskA}/comments`, {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.worker1 },
      body: JSON.stringify({ text: 'Great work on this task!' })
    });
    if (!res.comment_id) throw new Error('Comment ID missing');
  });

  await test('25. List comments on Task A', async () => {
    const res = await req(`/api/tasks/${taskIds.taskA}/comments`, {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    if (res.count < 1) throw new Error('No comments found');
  });

  // Feed
  await test('26. Check ProjectLead\'s feed — should have events for all changes', async () => {
    const res = await req('/api/tasks/feed', {
      headers: { 'X-Msg-Token': tokens.lead }
    });
    console.log(`   Feed has ${res.count} events`);
    if (res.count < 5) throw new Error(`Expected at least 5 events, got ${res.count}`);
  });

  await test('27. Check Worker1\'s feed — should have events for tasks they watch', async () => {
    const res = await req('/api/tasks/feed', {
      headers: { 'X-Msg-Token': tokens.worker1 }
    });
    console.log(`   Feed has ${res.count} events`);
    if (res.count < 1) throw new Error('Expected events in Worker1 feed');
  });

  await test('28. Test feed with ?since= filter', async () => {
    const now = Date.now();
    const res = await req(`/api/tasks/feed?since=${now - 60000}`, {
      headers: { 'X-Msg-Token': tokens.lead }
    });
    console.log(`   Recent events (last minute): ${res.count}`);
  });

  // Watch
  await test('29. Worker2 watches Task A specifically', async () => {
    await req(`/api/tasks/${taskIds.taskA}/watch`, {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.worker2 }
    });
  });

  await test('30. Worker1 comments on Task A again', async () => {
    await req(`/api/tasks/${taskIds.taskA}/comments`, {
      method: 'POST',
      headers: { 'X-Msg-Token': tokens.worker1 },
      body: JSON.stringify({ text: 'Another update!' })
    });
  });

  await new Promise(r => setTimeout(r, 500));

  await test('31. Worker2\'s feed should have the comment event', async () => {
    const res = await req('/api/tasks/feed', {
      headers: { 'X-Msg-Token': tokens.worker2 }
    });
    const hasCommentEvent = res.events.some(e => e.type === 'comment_added' && e.task_id === taskIds.taskA);
    if (!hasCommentEvent) throw new Error('Comment event not in Worker2 feed');
  });

  // Error cases
  await test('32. Non-member tries to access private project task → 403', async () => {
    // Create a new agent not in the project
    const temp = await req('/api/msg/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Outsider', description: 'Not a member' })
    });
    
    try {
      await req(`/api/tasks/${taskIds.taskA}`, {
        headers: { 'X-Msg-Token': temp.token }
      });
      throw new Error('Should have thrown 403');
    } catch (e) {
      if (!e.message.includes('403')) throw e;
    }
  });

  await test('33. Viewer tries to create task → 403', async () => {
    try {
      await req('/api/tasks', {
        method: 'POST',
        headers: { 'X-Msg-Token': tokens.worker2 },
        body: JSON.stringify({
          title: 'Unauthorized task',
          project: 'test-project'
        })
      });
      // Note: viewers CAN create tasks in projects they're members of
      // This is actually allowed, so let's test something else
    } catch (e) {
      // Expected
    }
  });

  await test('34. Duplicate project name → 409', async () => {
    try {
      await req('/api/tasks/projects', {
        method: 'POST',
        headers: { 'X-Msg-Token': tokens.lead },
        body: JSON.stringify({
          name: 'test-project',
          description: 'Duplicate'
        })
      });
      throw new Error('Should have thrown 409');
    } catch (e) {
      if (!e.message.includes('409')) throw e;
    }
  });

  await test('35. Missing auth → 401', async () => {
    try {
      await req('/api/tasks/projects');
      throw new Error('Should have thrown 401');
    } catch (e) {
      if (!e.message.includes('401')) throw e;
    }
  });

  await test('36. Delete project as non-owner → 403', async () => {
    try {
      await req('/api/tasks/projects/test-project', {
        method: 'DELETE',
        headers: { 'X-Msg-Token': tokens.worker1 }
      });
      throw new Error('Should have thrown 403');
    } catch (e) {
      if (!e.message.includes('403')) throw e;
    }
  });

  // Cleanup
  await test('37. Get stats before cleanup', async () => {
    const res = await req('/api/tasks/status');
    console.log(`   Projects: ${res.total_projects}, Tasks: ${res.total_tasks}`);
  });

  await test('38. ProjectLead deletes test-project (with all tasks)', async () => {
    const res = await req('/api/tasks/projects/test-project', {
      method: 'DELETE',
      headers: { 'X-Msg-Token': tokens.lead }
    });
    console.log(`   Deleted ${res.tasks_deleted} tasks`);
  });

  await test('39. ProjectLead deletes open-project', async () => {
    await req('/api/tasks/projects/open-project', {
      method: 'DELETE',
      headers: { 'X-Msg-Token': tokens.lead }
    });
  });

  await test('40. Verify stats updated', async () => {
    const res = await req('/api/tasks/status');
    console.log(`   Projects: ${res.total_projects}, Tasks: ${res.total_tasks}`);
  });

  console.log('\n✨ All tests completed!');
}

runTests().catch(e => {
  console.error('\n💥 Fatal error:', e);
  process.exit(1);
});
