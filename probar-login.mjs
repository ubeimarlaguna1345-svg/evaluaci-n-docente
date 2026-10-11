import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';
import readline from 'node:readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  const correo = 'admin@ucundinamarca.edu.co';

  const resultado = await pool.query(
    'SELECT contrasena_hash, activo FROM usuarios WHERE LOWER(correo) = LOWER($1)',
    [correo]
  );

  if (resultado.rowCount === 0) {
    console.log('Usuario no encontrado.');
  } else {
    const clave = await rl.question('Escribe la contraseña del administrador: ');
    const coincide = await bcrypt.compare(
      clave,
      resultado.rows[0].contrasena_hash
    );

    console.log('Usuario activo:', resultado.rows[0].activo);
    console.log('Contraseña coincide:', coincide);
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  rl.close();
  await pool.end();
}