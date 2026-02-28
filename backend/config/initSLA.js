const pool = require('./database');

async function initSLA() {
  try {
    // ═══════════════════════════════════════════════════════════════
    // SLA Policies table — defines response & resolution targets
    // per priority level
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sla_policies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        response_time_minutes INTEGER NOT NULL DEFAULT 60,
        resolution_time_minutes INTEGER NOT NULL DEFAULT 480,
        escalation_enabled BOOLEAN DEFAULT true,
        escalation_after_minutes INTEGER DEFAULT 120,
        escalation_to INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_priority_policy UNIQUE (priority)
      );
    `);
    console.log('✅ SLA Policies table created/verified');

    // ═══════════════════════════════════════════════════════════════
    // SLA Breach Log — records every SLA breach event
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sla_breaches (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        breach_type VARCHAR(50) NOT NULL,
        policy_id INTEGER REFERENCES sla_policies(id),
        target_minutes INTEGER,
        actual_minutes INTEGER,
        breached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        escalated BOOLEAN DEFAULT false,
        escalated_to INTEGER REFERENCES users(id),
        notes TEXT
      );
    `);
    console.log('✅ SLA Breaches table created/verified');

    // ═══════════════════════════════════════════════════════════════
    // Add SLA columns to tickets table
    // ═══════════════════════════════════════════════════════════════
    const slaColumns = [
      { name: 'sla_policy_id', type: 'INTEGER REFERENCES sla_policies(id)' },
      { name: 'response_deadline', type: 'TIMESTAMP' },
      { name: 'resolution_deadline', type: 'TIMESTAMP' },
      { name: 'first_response_at', type: 'TIMESTAMP' },
      { name: 'response_breached', type: 'BOOLEAN DEFAULT false' },
      { name: 'resolution_breached', type: 'BOOLEAN DEFAULT false' },
      { name: 'escalated', type: 'BOOLEAN DEFAULT false' },
      { name: 'escalated_to', type: 'INTEGER REFERENCES users(id)' },
      { name: 'escalated_at', type: 'TIMESTAMP' },
    ];

    for (const col of slaColumns) {
      await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    }
    console.log('✅ SLA columns added to tickets table');

    // ═══════════════════════════════════════════════════════════════
    // Insert default SLA policies if none exist
    // ═══════════════════════════════════════════════════════════════
    const existing = await pool.query('SELECT COUNT(*) FROM sla_policies');
    if (parseInt(existing.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO sla_policies (name, priority, response_time_minutes, resolution_time_minutes, escalation_after_minutes)
        VALUES
          ('عاجل', 'urgent', 15, 60, 30),
          ('عالي', 'high', 30, 120, 60),
          ('متوسط', 'medium', 60, 480, 120),
          ('منخفض', 'low', 120, 1440, 240)
      `);
      console.log('✅ Default SLA policies inserted');
    }

    // Create index for faster SLA breach checks
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadlines 
      ON tickets (response_deadline, resolution_deadline) 
      WHERE status NOT IN ('resolved', 'closed')
    `);

    console.log('✅ SLA initialization complete');
  } catch (error) {
    console.error('❌ Error initializing SLA tables:', error.message);
  }
}

module.exports = initSLA;
