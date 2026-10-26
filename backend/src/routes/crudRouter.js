import { Router } from 'express';
import pool from '../db/mysql.js';

// Builds a REST router (list / get / create / update / delete) for a simple table.
// `columns` is the whitelist of writable columns, which keeps the dynamic SQL safe.
export default function crudRouter({ table, idColumn, columns, orderBy = idColumn }) {
  const router = Router();

  const pick = (body) =>
    Object.fromEntries(columns.filter((c) => body[c] !== undefined).map((c) => [c, body[c] === '' ? null : body[c]]));

  router.get('/', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const data = pick(req.body);
      const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const data = pick(req.body);
      if (!Object.keys(data).length) return res.status(400).json({ error: 'No valid fields to update' });
      const [result] = await pool.query(`UPDATE ${table} SET ? WHERE ${idColumn} = ?`, [data, req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [req.params.id]);
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const [result] = await pool.query(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
