// server/src/tests/routes/task.routes.test.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../utils/prisma';

// Mover o mock do middleware de autenticação para dentro do describe
// para que ele possa ser ajustado dinamicamente com o userId criado.
// O nome da função real é 'authenticate', precisamos spy on it.
import * as authMiddleware from '../../middlewares/auth.middleware'; // Importar o módulo inteiro

describe('Task Routes Integration', () => {
    let authToken: string;
    let createdUserId: number; // Usar este ID para o mock do middleware

    // Mock do middleware de autenticação ajustado para usar o userId real do teste.
    // Isso deve ser feito ANTES que os controllers importem o middleware.
    // É mais robusto mockar o 'authenticate' globalmente, mas com o valor dinâmico.
    let authenticateMock: jest.SpyInstance;

    beforeAll(async () => {
        // Garante que o banco de dados esteja limpo antes de todos os testes desta suíte.
        await prisma.$transaction([
            prisma.task.deleteMany(),
            prisma.user.deleteMany(),
        ]);
        // Mock the authenticate middleware to use the dynamic userId
        // This needs to be done early enough so app.ts uses this mocked version.
        // For integration tests, it's often simpler to make a separate user for each test
        // and pass their ID.
        // Given the original structure, the intent was to use a mock.
        authenticateMock = jest.spyOn(authMiddleware, 'authenticate');
    });

    beforeEach(async () => {
        // Limpeza do banco de dados antes de cada teste para garantir um estado limpo.
        await prisma.$transaction([
            prisma.task.deleteMany(),
            prisma.user.deleteMany(),
        ]);

        const userData = {
            email: `usuario.tarefa.${Date.now()}@teste.com`, // Email único para cada teste
            password: 'senha_segura_123',
            name: 'Usuário Tarefa',
        };

        // Registrar o usuário real
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send(userData);

        authToken = registerResponse.body.token;
        createdUserId = registerResponse.body.user.id;

        // Configurar o mock do authenticate para usar o userId real criado.
        // O mock agora intercepta a chamada real ao middleware e injeta o ID correto.
        authenticateMock.mockImplementation((req: any, res: any, next: any) => {
            req.userId = createdUserId; // Usa o ID do usuário REAL criado no beforeEach
            next();
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        authenticateMock.mockRestore(); // Restaura o mock após todos os testes
    });

    // Teste de Integração 2: Criação e Listagem de Tarefas
    it('deve permitir a criação de uma tarefa e sua listagem para o usuário autenticado', async () => {
        const taskData = {
            title: 'Minha primeira tarefa de integração',
            description: 'Descrição detalhada da tarefa de integração.',
            priority: 'high',
            dueDate: '2025-12-31T23:59:59Z',
        };

        // 1. Criar uma tarefa com o usuário autenticado (agora com o userId correto via mock)
        const createResponse = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`) // Token real ainda é enviado
            .send(taskData);

        expect(createResponse.statusCode).toBe(StatusCodes.CREATED); // Espera 201
        expect(createResponse.body.title).toBe(taskData.title);
        // O userId agora deve ser o do usuário realmente criado
        expect(createResponse.body.userId).toBe(createdUserId);
        expect(createResponse.body).toHaveProperty('id');
        expect(createResponse.body).toHaveProperty('createdAt');

        const taskId = createResponse.body.id;

        // 2. Listar as tarefas do usuário e verificar se a tarefa criada aparece
        const listResponse = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`);

        expect(listResponse.statusCode).toBe(StatusCodes.OK);
        expect(listResponse.body).toBeInstanceOf(Array);
        expect(listResponse.body.length).toBe(1);

        const listedTask = listResponse.body[0];
        expect(listedTask.id).toBe(taskId);
        expect(listedTask.title).toBe(taskData.title);
        expect(listedTask.userId).toBe(createdUserId); // userId real
    });

    // Teste adicional de listagem de tarefas vazia
    it('deve retornar um array vazio se o usuário não tiver tarefas', async () => {
        // Como o beforeEach cria um usuário, mas nenhuma tarefa é criada antes deste teste
        // uma listagem inicial deve ser vazia.
        const listResponse = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`);

        expect(listResponse.statusCode).toBe(StatusCodes.OK);
        expect(listResponse.body).toEqual([]);
    });
});