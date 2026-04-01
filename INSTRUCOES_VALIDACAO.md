# Como Aplicar as Validações no Supabase

## Passo 1: Acessar o Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral

## Passo 2: Criar as Funções

1. Clique em **New Query**
2. Copie todo o conteúdo do arquivo `sql/supabase_appointment_validation.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione `Ctrl + Enter`)

## Passo 3: Verificar se foi criado

Após rodar o SQL, você verá uma mensagem confirmando as funções criadas:

```
✅ check_appointment_conflict
✅ safe_create_appointment
✅ get_available_slots
```

## O que cada função faz:

### `check_appointment_conflict`
Verifica se há algum agendamento conflitante no horário informado.

### `safe_create_appointment`
Cria um agendamento de forma segura, verificando conflitos automaticamente.

### `get_available_slots`
Retorna os horários disponíveis para uma data e serviço específicos.

## Estrutura dos Arquivos Criados

```
moca-chip-app/
├── sql/
│   └── supabase_appointment_validation.sql  ← Rode isso no Supabase
├── src/
│   ├── lib/
│   │   └── appointment-utils.ts             ← Funções auxiliares (opcional)
│   └── app/
│       ├── actions/
│       │   └── admin.ts                     ← addAppointment com validação
│       └── admin/
│           └── agenda/
│               └── page.tsx                 ← Visual com lógica de tracks
```

## Fluxo de Validação

```
Usuário cria agendamento
        ↓
Frontend: verifica visualmente (tracks)
        ↓
Backend (admin.ts): chama check_appointment_conflict
        ↓
Supabase: valida no banco se há conflito
        ↓
Se conflito: retorna erro com detalhes
Se ok: insere o agendamento
```

## Testando

1. Aplique o SQL no Supabase
2. Faça deploy do código na Vercel
3. Tente criar dois agendamentos no mesmo horário
4. O segundo deve retornar erro de conflito
