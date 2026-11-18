import pool from '../backend/config/db.js';

async function seedFarms() {
  const adminRes = await pool.query("SELECT id FROM vivas_users WHERE email = 'admin@vivas.ai'");
  if (adminRes.rows.length === 0) {
    console.log('No admin user found.');
    process.exit();
  }
  const adminId = adminRes.rows[0].id;
  
  await pool.query("DELETE FROM vivas_user_farms WHERE user_id = $1", [adminId]);
  await pool.query("DELETE FROM vivas_farms WHERE owner_id = $1", [adminId]);
  
  const farmsData = [
    {
      farm_name: "Gopikrishna's Farm",
      legal_name: "Gopikrishna Organics",
      city: "Bengaluru",
      state_country: "India",
      total_area_acres: 25.0,
      farm_type: "Organic Vegetables",
      weather_summary: "14.3° C",
      role_in_farm: "Owner",
      last_accessed_at: new Date(Date.now() - 14 * 60 * 60 * 1000)
    },
    {
      farm_name: "gks Farm",
      legal_name: "GKS AgTech",
      city: "Chennai",
      state_country: "India",
      total_area_acres: 18.5,
      farm_type: "Commercial Greenhouse",
      weather_summary: "14.3° C",
      role_in_farm: "Owner",
      last_accessed_at: new Date(Date.now() - 22 * 60 * 60 * 1000)
    },
    {
      farm_name: "farm fresh",
      legal_name: "Farm Fresh NYC LLC",
      city: "New York",
      state_country: "New York, N...",
      total_area_acres: 40.0,
      farm_type: "Hydroponics & Microgreens",
      weather_summary: "55.2° F",
      role_in_farm: "Owner",
      last_accessed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const f of farmsData) {
    const farmRes = await pool.query(
      `INSERT INTO vivas_farms (owner_id, farm_name, legal_name, city, state_country, total_area_acres, farm_type, weather_summary, last_accessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [adminId, f.farm_name, f.legal_name, f.city, f.state_country, f.total_area_acres, f.farm_type, f.weather_summary, f.last_accessed_at]
    );
    const farmId = farmRes.rows[0].id;
    await pool.query(
      `INSERT INTO vivas_user_farms (user_id, farm_id, role_in_farm, is_default)
       VALUES ($1, $2, $3, $4)`,
      [adminId, farmId, f.role_in_farm, f.farm_name === "Gopikrishna's Farm"]
    );
  }

  console.log("Seeded demo farms on live server successfully!");
  process.exit();
}

seedFarms().catch(err => { console.error('Error seeding farms:', err); process.exit(1); });
