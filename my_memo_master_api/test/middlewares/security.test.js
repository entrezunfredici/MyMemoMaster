jest.mock('../../models/index', () => ({
  instance: { sync: jest.fn() },
  sequelize: { transaction: jest.fn() },
  User: {}, Role: {}, Subject: {}, LeitnerSystem: {},
  LeitnerCard: {}, LeitnerBox: {}, LeitnerSystemsUsers: {},
  Unit: {}, Response: {}, Fields: {}, FieldsType: {},
  Diagramme: {}, Test: {}, Question: {}, Tutorials: {},
}));

jest.mock('../../jobs/fifo.cron', () => ({ startFifoCron: jest.fn() }));
jest.mock('../../helpers/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../helpers/sendEmail', () => jest.fn());

jest.mock('../../services/User.service', () => ({
  findByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  verifyPassword: jest.fn(),
  updateLoginDate: jest.fn(),
  setResetPasswordCode: jest.fn(),
  setPassword: jest.fn(),
  setRole: jest.fn(),
  deleteRole: jest.fn(),
  verifyValidEmailCode: jest.fn(),
  verifyResetPasswordCode: jest.fn(),
}));

jest.mock('../../services/Role.service', () => ({ findOne: jest.fn() }));

process.env.AUTH_JWT_SECRET = 'test-secret';
process.env.VITE_FRONT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
describe('Sécurité — CORS', () => {
  it('autorise une requête depuis une origine configurée', async () => {
    const res = await request(app)
      .get('/api-docs')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('ne retourne pas access-control-allow-origin pour une origine inconnue', async () => {
    const res = await request(app)
      .get('/api-docs')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('répond aux requêtes preflight OPTIONS avec les méthodes autorisées', async () => {
    const res = await request(app)
      .options('/api/v1/users/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    // cors() répond 204 sur un preflight valide
    expect(res.status).toBe(204);
    const methods = res.headers['access-control-allow-methods'];
    expect(methods).toContain('POST');
    expect(methods).toContain('GET');
    expect(methods).toContain('PUT');
    expect(methods).toContain('DELETE');
  });

  it('inclut Content-Type et Authorization dans les en-têtes autorisés', async () => {
    const res = await request(app)
      .options('/api/v1/users/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────────────────────
describe('Sécurité — Rate limiting', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('authLimiter — retourne 429 après 5 tentatives sur /users/login', async () => {
    process.env.NODE_ENV = 'production';

    // IP unique par test pour éviter les collisions avec d'autres suites
    const ip = `10.0.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    const sendReq = () =>
      request(app)
        .post('/api/v1/users/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'Password1' });

    for (let i = 0; i < 5; i++) {
      await sendReq();
    }

    const res = await sendReq();
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Trop de tentatives, réessayez dans 15 minutes.');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('registerLimiter — retourne 429 après 10 tentatives sur /users/register', async () => {
    process.env.NODE_ENV = 'production';

    const ip = `10.1.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    const sendReq = () =>
      request(app)
        .post('/api/v1/users/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Bob', email: 'bob@example.com', password: 'Password1' });

    for (let i = 0; i < 10; i++) {
      await sendReq();
    }

    const res = await sendReq();
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Trop de créations de compte, réessayez dans 1 heure.');
  });

  it('rate limiters sont désactivés en environnement test (NODE_ENV=test)', async () => {
    process.env.NODE_ENV = 'test';

    const ip = `10.2.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;

    // 12 requêtes bien au-delà du seuil de 5 — aucune ne doit être bloquée
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/v1/users/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).not.toBe(429);
    }
  });

  it('apiLimiter — retourne 429 après 200 requêtes sur une route quelconque', async () => {
    process.env.NODE_ENV = 'production';

    const ip = `10.3.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    const sendReq = () =>
      request(app)
        .get('/api/v1/roles')
        .set('X-Forwarded-For', ip);

    for (let i = 0; i < 200; i++) {
      await sendReq();
    }

    const res = await sendReq();
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Trop de requêtes, réessayez plus tard.');
  });
});
