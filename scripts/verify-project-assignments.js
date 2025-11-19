require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function verifyProjectAssignments() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    })

    try {
        console.log('🔍 Checking project assignments...\n')

        // Check for Default Project
        const defaultProject = await pool.query(`
      SELECT id, name, icon FROM projects WHERE name = 'Default Project'
    `)

        if (defaultProject.rows.length === 0) {
            console.log('❌ No Default Project found. Creating one...')
            const newProject = await pool.query(`
        INSERT INTO projects (name, description, project_type, icon, color)
        VALUES ('Default Project', 'Auto-created for existing data sources', 'custom', '📁', '#6B7280')
        RETURNING id
      `)
            console.log(`✅ Created Default Project (ID: ${newProject.rows[0].id})`)
        } else {
            console.log(`✅ Default Project exists (ID: ${defaultProject.rows[0].id})`)
        }

        // Check clients without projects
        const unassignedClients = await pool.query(`
      SELECT COUNT(*) as count FROM clients WHERE project_id IS NULL
    `)

        if (parseInt(unassignedClients.rows[0].count) > 0) {
            console.log(`\n⚠️  Found ${unassignedClients.rows[0].count} clients without a project`)
            console.log('   Assigning them to Default Project...')

            const defaultProjId = defaultProject.rows[0].id
            const updateResult = await pool.query(`
        UPDATE clients SET project_id = $1 WHERE project_id IS NULL
      `, [defaultProjId])

            console.log(`✅ Assigned ${updateResult.rowCount} clients to Default Project`)
        } else {
            console.log(`\n✅ All clients are assigned to projects!`)
        }

        // Show summary
        console.log('\n📊 Summary:')
        const summary = await pool.query(`
      SELECT 
        p.name as project_name,
        p.icon,
        COUNT(c.id) as client_count
      FROM projects p
      LEFT JOIN clients c ON c.project_id = p.id
      GROUP BY p.id, p.name, p.icon
      ORDER BY p.name
    `)

        summary.rows.forEach(row => {
            console.log(`   ${row.icon} ${row.project_name}: ${row.client_count} clients`)
        })

        console.log('\n✅ All data is properly organized by projects!\n')

    } catch (error) {
        console.error('\n❌ Error:', error.message)
        process.exit(1)
    } finally {
        await pool.end()
    }
}

verifyProjectAssignments()
