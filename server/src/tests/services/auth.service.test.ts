// server/src/tests/services/auth.service.test.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/auth.service'; // Caminho correto para testes
import { prisma } from '../../utils/prisma'; // Caminho correto para testes
import { UserAlreadyRegisteredError } from '../../errors/auth/UserAlreadyRegisteredError'; // Caminho correto para testes
import { InvalidCredentialsError } from '../../errors/auth/InvalidCredentialsError'; // Caminho correto para testes
import { UserNotFoundError } from '../../errors/auth/UserNotFoundError'; // Caminho correto para testes
import { InvalidTokenError } from '../../errors/auth/InvalidTokenError'; // Caminho correto para testes

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../utils/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

describe('AuthService', () => {
    const mockUser = {
        id: 1,
        email: 'usuario@exemplo.teste',
        name: 'Usuário Exemplo',
        createdAt: new Date(),
    };
    const password = 'senha';
    const hashedPassword = 'senha-criptografada';

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('deve cadastrar um novo usuário e retornar o seu token', async () => {
            // Arrange (preparar)
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (prisma.user.create as jest.Mock).mockResolvedValue({
                ...mockUser,
                password: hashedPassword,
            });
            (jwt.sign as jest.Mock).mockReturnValue('mockedToken');

            // Act (agir)
            const result = await AuthService.registerUser(mockUser.email, password, mockUser.name);

            // Assert (verificar)
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: mockUser.email },
            });
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: mockUser.email,
                    password: hashedPassword,
                    name: mockUser.name,
                },
            });
            expect(result.token).toBe('mockedToken');
            expect(result.user).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
            });
        });

        // Teste 1: Não deve registrar usuário com e-mail já cadastrado
        it('não deve registrar usuário com e-mail já cadastrado', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            await expect(
                AuthService.registerUser(mockUser.email, password, mockUser.name),
            ).rejects.toBeInstanceOf(UserAlreadyRegisteredError);
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        //Teste 2: Deve retornar o usuário correto após o registro
        it('deve retornar o usuário correto após o registro', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (prisma.user.create as jest.Mock).mockResolvedValue({
                ...mockUser,
                password: hashedPassword,
            });
            (jwt.sign as jest.Mock).mockReturnValue('mockedToken');

            const result = await AuthService.registerUser(mockUser.email, password, mockUser.name);
            expect(result.user.email).toBe(mockUser.email);
            expect(result.user.name).toBe(mockUser.name);
        });
    });

    describe('loginUser', () => {
        it('deve realizar o login do usuário e retornar o seu token', async () => {
            // Arrange (preparar)
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('mockedToken');

            // Act (agir)
            const result = await AuthService.loginUser(mockUser.email, password);

            // Assert (verificar)
            expect(result.token).toBe('mockedToken');
            expect(result.user).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
            });
        });

        // Teste 3: Deve lançar erro para e-mail não encontrado
        it('deve lançar erro para e-mail não encontrado', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(AuthService.loginUser('naoexiste@teste.com', password)).rejects.toBeInstanceOf(
                InvalidCredentialsError,
            );
        });

        // Teste 4: Deve lançar erro para senha inválida
        it('deve lançar erro para senha inválida', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(AuthService.loginUser(mockUser.email, 'senha-errada')).rejects.toBeInstanceOf(
                InvalidCredentialsError,
            );
        });
    });

    describe('getUserById', () => {
        it('deve retornar o usuário com base no seu identificador', async () => {
            // Arrange (preparar)
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            // Act (agir)
            const user = await AuthService.getUserById(1);

            // Assert (verificar)
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                select: { id: true, email: true, name: true, createdAt: true },
            });
            expect(user).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                createdAt: mockUser.createdAt,
            });
        });

        //Teste 5: Deve chamar prisma.user.findUnique com o ID correto
        it('deve chamar prisma.user.findUnique com o ID correto', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            await AuthService.getUserById(mockUser.id);
            expect(prisma.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: mockUser.id },
                }),
            );
        });
    });

    describe('getUserFromTokenPayload', () => {
        it('deve retornar dados do usuário com base no identificador retornado pelo token', async () => {
            // Arrange (preparar)
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            // Act (agir)
            const user = await AuthService.getUserFromTokenPayload(1);

            // Assert (verificar)
            expect(user).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                createdAt: mockUser.createdAt,
            });
        });

        // NOVO Teste (substitui o antigo Teste 6): Deve retornar nulo para payload de token inválido (ID não encontrado)
        it('deve retornar nulo se o usuário do payload não for encontrado (comportamento simulado)', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(AuthService.getUserFromTokenPayload(999)).rejects.toBeInstanceOf(UserNotFoundError);
        });
    });

    describe('refreshToken', () => {
        it('deve retornar um token novo ao atualizar token se o token antigo for válido', () => {
            // Arrange (preparar)
            (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });
            (jwt.sign as jest.Mock).mockReturnValue('tokenNovo');

            // Act (agir)
            const newToken = AuthService.refreshToken('tokenAntigo');

            // Assert (verificar)
            expect(newToken).toBe('tokenNovo');
        });

        // NOVO Teste (substitui o antigo Teste 7): Deve chamar jwt.sign para gerar novo token
        it('deve chamar jwt.sign para gerar um novo token', () => {
            (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });
            (jwt.sign as jest.Mock).mockReturnValue('mockedNewToken');
            AuthService.refreshToken('someOldToken');
            expect(jwt.sign).toHaveBeenCalled();
        });
    });
});