const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:2402@localhost:5432/WDP'
});

async function run() {
  try {
    const userId = 1;
    const entRes = await pool.query('SELECT id, name FROM "Enterprise" WHERE "userId" = $1', [userId]);
    if (entRes.rows.length === 0) {
      console.log('No enterprise for userId 1');
      return;
    }
    const entId = entRes.rows[0].id;
    console.log(`Enterprise ID: ${entId} (${entRes.rows[0].name})`);
    
    const areasRes = await pool.query('SELECT * FROM "EnterpriseServiceArea" WHERE "enterpriseId" = $1', [entId]);
    console.log('SERVICE AREAS:');
    console.log(JSON.stringify(areasRes.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
