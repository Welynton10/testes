// server/src/tests/routes/auth.routes.test.ts

import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../utils/prisma';
import { JWT_SECRET } from '../../config';
import jwt from 'jsonwebtoken';

beforeAll(async () => {
    // Garante que o banco de dados esteja limpo antes de todos os testes desta suíte.
    await prisma.$transaction([
        prisma.task.deleteMany(),
        prisma.user.deleteMany(),
    ]);
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe('Auth Routes Integration', () => {
    beforeEach(async () => {
        // Limpar o banco de dados antes de CADA teste para garantir isolamento.
        await prisma.$transaction([
            prisma.task.deleteMany(),
            prisma.user.deleteMany(),
        ]);
    });

    // Teste de Integração 1: Registro e Login de Usuário
    it('deve permitir o registro de um novo usuário e seu login subsequente', async () => {
        const userData = {
            email: 'integracao@teste.com',
            password: 'senhaforte123',
            name: 'Usuário Integração',
        };

        // 1. Registrar o usuário
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(userData);

        expect(registerResponse.statusCode).toBe(StatusCodes.CREATED);
        expect(registerResponse.body).toHaveProperty('token');
        expect(registerResponse.body.user.email).toBe(userData.email);
        expect(registerResponse.body.user.name).toBe(userData.name);

        const registeredToken = registerResponse.body.token;
        const decodedRegisterToken = jwt.verify(registeredToken, JWT_SECRET as string) as { userId: number };
        expect(decodedRegisterToken.userId).toBeDefined();

        // 2. Tentar fazer login com o usuário recém-registrado
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: userData.password,
            });

        expect(loginResponse.statusCode).toBe(StatusCodes.OK);
        expect(loginResponse.body).toHaveProperty('token');
        expect(loginResponse.body.user.email).toBe(userData.email);
        expect(loginResponse.body.user.name).toBe(userData.name);

        const loggedInToken = loginResponse.body.token;
        const decodedLoginToken = jwt.verify(loggedInToken, JWT_SECRET as string) as { userId: number };
        expect(decodedLoginToken.userId).toBe(decodedRegisterToken.userId);
    });

    // Teste para registro com e-mail duplicado (CORRIGIDO O STATUS CODE)
    it('não deve registrar usuário com e-mail duplicado', async () => {
        const userData = {
            email: 'duplicado@teste.com',
            password: 'senhaforte123',
            name: 'Usuário Duplicado',
        };

        // Primeiro registro
        await request(app)
            .post('/api/auth/register')
            .send(userData);

        // Segundo registro com o mesmo e-mail
        const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

        expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST); // O que sua API retorna (400)
        expect(response.body).toHaveProperty('message');
        // CORRIGIDO: Mensagem de erro exata que sua API retorna
        expect(response.body.message).toBe('Usuário já cadastrado'); // <--- Esta linha foi modificada
    });
});