/*
 * Seeds ~200 realistic audit_log entries across the last 3 months (drawn
 * from real members/trainers/expenses/payments/memberships/invoices/plans
 * already in the database, attributed to the two seeded login accounts),
 * plus the 4 approval_rules and 6 demo approval_requests (mixed
 * pending/approved/rejected) described in the migration's header comment.
 *
 * Reuses server/src/config/db.js (see seed_finance.js for why the
 * cross-directory require works). Safe to re-run — each part is
 * independently idempotent.
 *
 * Usage: node database/seed_audit.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function randomTimestampInLastNDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, days));
  d.setHours(randInt(7, 21), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

async function batchInsertAuditLog(rows) {
  const columns = ['user_id', 'user_name', 'action', 'entity_type', 'entity_id', 'old_values', 'new_values', 'ip_address', 'created_at'];
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, r) => {
      const offset = r * columns.length;
      columns.forEach((col) => values.push(row[col]));
      return `(${columns.map((_, c) => `$${offset + c + 1}`).join(',')})`;
    });
    await pool.query(`INSERT INTO audit_log (${columns.join(',')}) VALUES ${placeholders.join(',')}`, values);
  }
}

async function seedAuditEntries(actors) {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM audit_log');
  if (already.rows[0].count > 0) {
    console.log('Audit log already seeded, skipping.');
    return;
  }

  const [members, trainers, expenses, payments, memberships, invoices, plans] = await Promise.all([
    pool.query('SELECT * FROM members ORDER BY random() LIMIT 55').then((r) => r.rows),
    pool.query('SELECT * FROM trainers').then((r) => r.rows),
    pool.query('SELECT * FROM expenses ORDER BY random() LIMIT 38').then((r) => r.rows),
    pool.query('SELECT * FROM payments ORDER BY random() LIMIT 38').then((r) => r.rows),
    pool.query('SELECT * FROM memberships ORDER BY random() LIMIT 28').then((r) => r.rows),
    pool.query('SELECT * FROM invoices ORDER BY random() LIMIT 18').then((r) => r.rows),
    pool.query('SELECT * FROM membership_plans').then((r) => r.rows),
  ]);

  const rows = [];
  function push(entityType, entityId, action, oldValues, newValues) {
    const actor = randChoice(actors);
    rows.push({
      user_id: actor.id,
      user_name: actor.name,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues != null ? JSON.stringify(oldValues) : null,
      new_values: newValues != null ? JSON.stringify(newValues) : null,
      ip_address: `192.168.1.${randInt(2, 254)}`,
      created_at: randomTimestampInLastNDays(90),
    });
  }

  members.forEach((m) => {
    push('member', m.id, 'create', null, m);
    if (Math.random() < 0.3) {
      push('member', m.id, 'update', { ...m, phone: `9${randInt(100000000, 999999999)}` }, m);
    }
  });
  trainers.forEach((t) => {
    push('trainer', t.id, 'update', { ...t, availability: 'Mon-Fri 9am-5pm' }, t);
  });
  expenses.forEach((e) => push('expense', e.id, 'create', null, e));
  payments.forEach((p) => push('payment', p.id, 'create', null, p));
  memberships.forEach((m) => push('membership', m.id, 'create', null, m));
  invoices.forEach((i) => push('invoice', i.id, 'create', null, i));
  plans.forEach((p) => push('plan', p.id, 'update', { ...p, price: Number(p.price) - 200 }, p));

  await batchInsertAuditLog(rows);
  console.log(`Seeded ${rows.length} audit log entries.`);
}

async function seedApprovalRules() {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM approval_rules');
  if (already.rows[0].count > 0) {
    console.log('Approval rules already seeded, skipping.');
    return;
  }

  const rules = [
    // threshold_amount is currency for refund/expense, a percentage for
    // discount (20 = 20%), and unused (always requires approval) for
    // membership_deletion — see the migration's header comment.
    { requestType: 'refund', thresholdAmount: 5000 },
    { requestType: 'expense', thresholdAmount: 25000 },
    { requestType: 'membership_deletion', thresholdAmount: null },
    { requestType: 'discount', thresholdAmount: 20 },
  ];
  for (const r of rules) {
    await pool.query(
      'INSERT INTO approval_rules (request_type, threshold_amount, required_role, is_active) VALUES ($1,$2,$3,TRUE)',
      [r.requestType, r.thresholdAmount, 'admin']
    );
  }
  console.log('Seeded 4 approval rules.');
}

async function seedApprovalRequests(staffUser, adminUser) {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM approval_requests');
  if (already.rows[0].count > 0) {
    console.log('Approval requests already seeded, skipping.');
    return;
  }

  const equipmentCategory = (await pool.query(`SELECT id FROM expense_categories WHERE name = 'Equipment' LIMIT 1`)).rows[0];
  const marketingCategory = (await pool.query(`SELECT id FROM expense_categories WHERE name = 'Marketing' LIMIT 1`)).rows[0];
  const samplePayment = (await pool.query('SELECT id, member_id, amount FROM payments ORDER BY random() LIMIT 1')).rows[0];
  const sampleMembership = (await pool.query(
    `SELECT m.id, mem.first_name, mem.last_name FROM memberships m JOIN members mem ON mem.id = m.member_id ORDER BY random() LIMIT 1`
  )).rows[0];
  const sampleMember = (await pool.query('SELECT id, first_name, last_name FROM members ORDER BY random() LIMIT 1')).rows[0];

  const requests = [
    {
      requestType: 'expense', entityType: 'expense',
      payload: { categoryId: equipmentCategory?.id, amount: 45000, expenseDate: todayISO(), vendorName: 'IronWorks Supplies', paymentMethod: 'bank_transfer', description: 'New squat racks and benches' },
      reason: 'Expense of ₹45,000 exceeds the ₹25,000 approval threshold', status: 'pending',
    },
    {
      requestType: 'expense', entityType: 'expense',
      payload: { categoryId: equipmentCategory?.id, amount: 32000, expenseDate: todayISO(), vendorName: 'Cardio Solutions Inc', paymentMethod: 'card', description: 'Treadmill replacement' },
      reason: 'Expense of ₹32,000 exceeds the ₹25,000 approval threshold', status: 'approved',
      reviewNote: 'Approved — equipment was overdue for replacement.',
    },
    {
      requestType: 'expense', entityType: 'expense',
      payload: { categoryId: marketingCategory?.id, amount: 28000, expenseDate: todayISO(), vendorName: 'Local Print Media', paymentMethod: 'upi', description: 'Signage rebrand' },
      reason: 'Expense of ₹28,000 exceeds the ₹25,000 approval threshold', status: 'rejected',
      reviewNote: 'Deferred to next quarter — not urgent.',
    },
    {
      requestType: 'refund', entityType: 'payment', entityId: samplePayment?.id,
      payload: { paymentId: samplePayment?.id, memberId: samplePayment?.member_id, amount: samplePayment?.amount, reason: 'Member requested cancellation within cooling-off period' },
      reason: `Refund of ₹${samplePayment?.amount} exceeds the ₹5,000 approval threshold`, status: 'pending',
    },
    {
      requestType: 'membership_deletion', entityType: 'membership', entityId: sampleMembership?.id,
      payload: { membershipId: sampleMembership?.id, memberName: `${sampleMembership?.first_name} ${sampleMembership?.last_name}`, reason: 'Duplicate membership entered by mistake' },
      reason: 'Membership deletion always requires admin approval', status: 'rejected',
      reviewNote: 'Membership history is append-only by policy — deactivate the member instead.',
    },
    {
      requestType: 'discount', entityType: 'member', entityId: sampleMember?.id,
      payload: { memberId: sampleMember?.id, memberName: `${sampleMember?.first_name} ${sampleMember?.last_name}`, discountPercent: 25, planName: 'Annual' },
      reason: 'Discount of 25% exceeds the 20% approval threshold', status: 'approved',
      reviewNote: 'Approved for annual plan loyalty promotion.',
    },
  ];

  for (const r of requests) {
    const createdAt = randomTimestampInLastNDays(90);
    await pool.query(
      `INSERT INTO approval_requests (request_type, entity_type, entity_id, requested_by, request_payload, reason, status, reviewed_by, reviewed_at, review_note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        r.requestType, r.entityType, r.entityId || null, staffUser.id, JSON.stringify(r.payload), r.reason, r.status,
        r.status === 'pending' ? null : adminUser.id,
        r.status === 'pending' ? null : createdAt,
        r.reviewNote || null,
        createdAt,
      ]
    );
  }
  console.log('Seeded 6 approval requests.');
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  try {
    const adminUser = (await pool.query(`SELECT id, name FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];
    const staffUser = (await pool.query(`SELECT id, name FROM users WHERE role = 'staff' LIMIT 1`)).rows[0];
    if (!adminUser || !staffUser) {
      throw new Error('Expected an admin and a staff user to exist (run database/seed.sql first).');
    }

    await seedAuditEntries([adminUser, staffUser]);
    await seedApprovalRules();
    await seedApprovalRequests(staffUser, adminUser);

    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
