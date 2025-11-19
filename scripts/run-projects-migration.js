require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function runMigration() {
    console.log('🔄 Starting migration...\n')

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in environment variables')
        console.error('Make sure .env.local exists and contains DATABASE_URL')
        process.exit(1)
    }

    console.log('✅ Found DATABASE_URL')

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    })

    try {
        // Test connection
        console.log('Testing database connection...')
        await pool.query('SELECT NOW()')
        console.log('✅ Connected to database\n')

        // Create projects table
        console.log('1. Creating projects table...')
        await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        project_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        color VARCHAR(7) DEFAULT '#3B82F6',
        icon VARCHAR(50) DEFAULT '📊',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('   ✅ Projects table created')

        // Add project_id column to clients
        console.log('2. Adding project_id to clients table...')
        await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL
    `)
        console.log('   ✅ project_id column added')

        // Create index
        console.log('3. Creating index...')
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_project_id ON clients(project_id)
    `)
        console.log('   ✅ Index created')

        // Create trigger function
        console.log('4. Creating update trigger...')
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_projects_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

        await pool.query(`DROP TRIGGER IF EXISTS projects_updated_at ON projects`)

        await pool.query(`
      CREATE TRIGGER projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_projects_updated_at()
    `)
        console.log('   ✅ Trigger created')

        // Insert default project
        console.log('5. Creating default project...')
        const defaultProject = await pool.query(`
      INSERT INTO projects (name, description, project_type, icon, color)
      VALUES ('Default Project', 'Auto-created for existing data sources', 'custom', '📁', '#6B7280')
      ON CONFLICT DO NOTHING
      RETURNING id
    `)

        let defaultProjId
        if (defaultProject.rows.length > 0) {
            defaultProjId = defaultProject.rows[0].id
            console.log(`   ✅ Default project created (ID: ${defaultProjId})`)
        } else {
            // Get existing default project
            const existing = await pool.query(`SELECT id FROM projects WHERE name = 'Default Project' LIMIT 1`)
            if (existing.rows.length > 0) {
                defaultProjId = existing.rows[0].id
                console.log(`   ✅ Default project already exists (ID: ${defaultProjId})`)
            }
        }

        // Assign existing clients to default project
        if (defaultProjId) {
            console.log('6. Assigning existing clients to default project...')
            const updateResult = await pool.query(
                `UPDATE clients SET project_id = $1 WHERE project_id IS NULL`,
                [defaultProjId]
            )
            console.log(`   ✅ ${updateResult.rowCount} clients assigned`)
        }

        console.log('\n🎉 Migration completed successfully!\n')

        // Verification
        const projectCount = await pool.query(`SELECT COUNT(*) as count FROM projects`)
        const clientsWithProject = await pool.query(`SELECT COUNT(*) as count FROM clients WHERE project_id IS NOT NULL`)

        console.log('📊 Verification:')
        console.log(`   • Projects: ${projectCount.rows[0].count}`)
        console.log(`   • Clients with projects: ${clientsWithProject.rows[0].count}`)
        console.log('\n✅ Ready! Restart your server and visit http://localhost:3000/projects\n')

    } catch (error) {
        console.error('\n❌ Migration failed!')
        console.error('Error:', error.message)
        if (error.detail) console.error('Detail:', error.detail)
        if (error.hint) console.error('Hint:', error.hint)
        console.error('\nFull error:', error)
        process.exit(1)
    } finally {
        await pool.end()
    }
}

runMigration()
