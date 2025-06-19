Feature: Login de usuário
  Como um usuário do sistema
  Quero poder acessar minha conta com segurança
  Para acessar e gerenciar minhas tarefas pessoais

  Background:
    Given que o usuário "John" está cadastrado com o e-mail "john@user.example" e a senha "123456"
    And está na página de login

  Scenario: Login com credenciais válidas
    When informa o e-mail "john@user.example" e a senha "123456"
    And envia o formulário de login
    Then deve ser redirecionado para a página de tarefas
    And deve visualizar a lista de tarefas

  Scenario: Login com senha incorreta
    When informa o e-mail "john@user.example" e a senha "12345"
    And envia o formulário de login
    Then deve visualizar a mensagem de erro "Falha no login. Verifique suas credenciais."
    And deve permanecer na página de login

  Scenario: Registrar um novo usuário com sucesso
    Dado que o banco de dados está limpo
    E estou na página de registro
    Quando registro o usuário "novo.simples.<timestamp>@teste.com" com o nome "Usuario Simples" e a senha "SenhaSimples123"
    Então devo ser redirecionado para a página de login

  Scenario: Tentativa de registro com e-mail duplicado
    Dado que o banco de dados está limpo
    E o usuário "duplicado.simples.<timestamp>@teste.com" está cadastrado com o nome "Usuario Duplicado" e a senha "senhaForte123"
    E estou na página de registro
    Quando registro o usuário "Usuario Duplicado" com o e-mail "duplicado.simples.<timestamp>@teste.com" e a senha "senhaForte123"
    Então deve visualizar a mensagem de erro "Usuário já cadastrado"
    E deve permanecer na página de registro

  Scenario: Atualizar o título de uma tarefa existente
    Dado que o banco de dados está limpo
    E o usuário "update.tarefa.<timestamp>@teste.com" está cadastrado e logado com a senha "SenhaUpdate123"
    E uma tarefa com o título "Tarefa Antiga" foi criada
    Quando navego para a página de tarefas
    E clico no botão de editar da tarefa "Tarefa Antiga"
    E preencho o título "Tarefa Atualizada E2E"
    E envio o formulário de tarefa
    Então deve visualizar a tarefa "Tarefa Atualizada E2E" na lista
    E não deve visualizar a tarefa "Tarefa Antiga" na lista