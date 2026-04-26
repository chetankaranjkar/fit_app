import sql from 'mssql'

const pool = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER ?? 'localhost',
  database: process.env.DB_NAME,
  options: {
    encrypt: (process.env.DB_ENCRYPT ?? 'false').toLowerCase() === 'true',
    trustServerCertificate: true,
  },
})

let connecting: Promise<sql.ConnectionPool> | null = null

export async function getDbPool() {
  if (pool.connected) return pool
  if (!connecting) {
    connecting = pool.connect()
  }
  return connecting
}
