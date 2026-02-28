const pool = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    // Devices stats
    const devicesQuery = `
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_devices,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_devices,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_devices
      FROM devices
    `;
    const devicesResult = await pool.query(devicesQuery);
    const devicesStats = devicesResult.rows[0];

    // Devices by type
    const devicesByTypeQuery = `
      SELECT dt.name_ar as type, COUNT(d.id) as count
      FROM device_types dt
      LEFT JOIN devices d ON dt.id = d.device_type_id
      GROUP BY dt.id, dt.name_ar
      ORDER BY count DESC
    `;
    const devicesByType = await pool.query(devicesByTypeQuery);

    // Employees stats
    const employeesQuery = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees
      FROM employees
    `;
    const employeesResult = await pool.query(employeesQuery);
    const employeesStats = employeesResult.rows[0];

    // Departments stats
    const departmentsQuery = `SELECT COUNT(*) as total_departments FROM departments`;
    const departmentsResult = await pool.query(departmentsQuery);
    const departmentsStats = departmentsResult.rows[0];

    // Maintenance stats
    const maintenanceQuery = `
      SELECT 
        COUNT(*) as total_maintenance,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_maintenance,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_maintenance,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_maintenance,
        SUM(COALESCE(cost, 0)) as total_cost
      FROM maintenance_records
      WHERE start_date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const maintenanceResult = await pool.query(maintenanceQuery);
    const maintenanceStats = maintenanceResult.rows[0];

    // Assignments stats
    const assignmentsQuery = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN is_current = true THEN 1 END) as active_assignments
      FROM device_assignments
    `;
    const assignmentsResult = await pool.query(assignmentsQuery);
    const assignmentsStats = assignmentsResult.rows[0];

    // Subscriptions stats
    const subscriptionsQuery = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon,
        SUM(CASE WHEN billing_cycle = 'monthly' THEN COALESCE(cost, 0) ELSE 0 END) as monthly_cost,
        SUM(CASE WHEN billing_cycle = 'yearly' THEN COALESCE(cost, 0) ELSE 0 END) as yearly_cost
      FROM subscriptions
    `;
    const subscriptionsResult = await pool.query(subscriptionsQuery);
    const subscriptionsStats = subscriptionsResult.rows[0];

    // Inventory stats
    const inventoryQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(current_stock) as total_quantity,
        COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_items
      FROM products
    `;
    const inventoryResult = await pool.query(inventoryQuery);
    const inventoryStats = inventoryResult.rows[0];

    // Recent activities (last 10)
    const activitiesQuery = `
      SELECT 
        'device' as type,
        'تم إضافة جهاز جديد: ' || serial_number as description,
        created_at as timestamp
      FROM devices
      WHERE created_at IS NOT NULL
      UNION ALL
      SELECT 
        'employee' as type,
        'تم إضافة موظف جديد: ' || full_name as description,
        created_at as timestamp
      FROM employees
      WHERE created_at IS NOT NULL
      UNION ALL
      SELECT 
        'maintenance' as type,
        'سجل صيانة جديد: ' || description as description,
        created_at as timestamp
      FROM maintenance_records
      WHERE created_at IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const activitiesResult = await pool.query(activitiesQuery);

    // Tickets stats
    const ticketsQuery = `
      SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status IN ('new','open','in_progress')) as open_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status IN ('resolved','closed')) as resolved_tickets,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')) as urgent_open,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_tickets,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_tickets
      FROM tickets
    `;
    const ticketsResult = await pool.query(ticketsQuery);
    const ticketsStats = ticketsResult.rows[0];

    // Monthly costs trend (last 6 months)
    const costsTrendQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(COALESCE(cost, 0)) as total_cost
      FROM maintenance_records
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    const costsTrendResult = await pool.query(costsTrendQuery);

    // Monthly maintenance count (last 6 months) — for bar chart
    const maintenanceMonthlyQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', gs.month), 'MM/YYYY') as month_label,
        TO_CHAR(DATE_TRUNC('month', gs.month), 'YYYY-MM') as month_key,
        COUNT(mr.id)::int as count,
        COALESCE(SUM(mr.cost), 0)::int as cost
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
      ) AS gs(month)
      LEFT JOIN maintenance_records mr
        ON DATE_TRUNC('month', mr.created_at) = DATE_TRUNC('month', gs.month)
      GROUP BY gs.month
      ORDER BY gs.month
    `;
    const maintenanceMonthly = await pool.query(maintenanceMonthlyQuery);

    // Devices added per month (last 6 months)
    const devicesMonthlyQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', gs.month), 'MM/YYYY') as month_label,
        COUNT(d.id)::int as count
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
      ) AS gs(month)
      LEFT JOIN devices d
        ON DATE_TRUNC('month', d.created_at) = DATE_TRUNC('month', gs.month)
      GROUP BY gs.month
      ORDER BY gs.month
    `;
    const devicesMonthly = await pool.query(devicesMonthlyQuery);

    // Employees by department
    const empByDeptQuery = `
      SELECT dept.name as dept, COUNT(e.id)::int as count
      FROM departments dept
      LEFT JOIN employees e ON e.department_id = dept.id AND e.is_active = true
      GROUP BY dept.id, dept.name
      HAVING COUNT(e.id) > 0
      ORDER BY count DESC
      LIMIT 8
    `;
    const empByDept = await pool.query(empByDeptQuery);

    // Tickets monthly (last 6 months)
    const ticketsMonthlyQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', gs.month), 'MM/YYYY') as month_label,
        COUNT(t.id)::int as total,
        COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed'))::int as resolved
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
      ) AS gs(month)
      LEFT JOIN tickets t
        ON DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', gs.month)
      GROUP BY gs.month
      ORDER BY gs.month
    `;
    const ticketsMonthly = await pool.query(ticketsMonthlyQuery);

    // Warranty expiring soon (next 60 days)
    const warrantyQuery = `
      SELECT d.id, d.brand || ' ' || d.model as name, d.asset_tag,
        d.warranty_end,
        (d.warranty_end - CURRENT_DATE)::int as days_left,
        dt.name as device_type
      FROM devices d
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.warranty_end IS NOT NULL
        AND d.warranty_end >= CURRENT_DATE
        AND d.warranty_end <= CURRENT_DATE + INTERVAL '60 days'
      ORDER BY d.warranty_end ASC
      LIMIT 10
    `;
    const warrantyExpiring = await pool.query(warrantyQuery);

    // Tasks summary
    const tasksQuery = `
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'todo')::int as todo,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'review')::int as review,
        COUNT(*) FILTER (WHERE status = 'done')::int as done,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done')::int as overdue
      FROM tasks
    `;
    const tasksStats = await pool.query(tasksQuery);

    res.json({
      devices: {
        ...devicesStats,
        by_type: devicesByType.rows
      },
      employees: employeesStats,
      departments: departmentsStats,
      maintenance: maintenanceStats,
      assignments: assignmentsStats,
      subscriptions: subscriptionsStats,
      inventory: inventoryStats,
      tickets: ticketsStats,
      tasks: tasksStats.rows[0],
      recent_activities: activitiesResult.rows,
      costs_trend: costsTrendResult.rows,
      charts: {
        maintenance_monthly: maintenanceMonthly.rows,
        devices_monthly: devicesMonthly.rows,
        emp_by_dept: empByDept.rows,
        tickets_monthly: ticketsMonthly.rows,
        warranty_expiring: warrantyExpiring.rows,
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

module.exports = {
  getDashboardStats
};
