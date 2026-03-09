

# Plano: Nova aba "IA" com chat livre e memória

## O que será feito

Adicionar uma nova aba "IA" entre "Gráficos" e "Notas" na navegação, com ícone de robô (`Bot` do lucide-react). Será um chat livre com IA que lembra de toda a conversa do usuário.

## Mudanças

### 1. Database Migration
- Criar tabela `ia_messages` com colunas: `id`, `user_id`, `role`, `content`, `created_at`
- RLS policies para que cada usuário veja apenas suas mensagens
- Permitir INSERT, SELECT e DELETE

### 2. Edge Function: `supabase/functions/ia-chat/index.ts`
- Nova edge function separada do chat financeiro
- System prompt de assistente livre/genérico (sem contexto financeiro)
- Usa Lovable AI com `google/gemini-3-flash-preview`
- Streaming SSE igual ao chat existente

### 3. Nova página: `src/pages/IAPage.tsx`
- Interface de chat similar ao `ChatPage`, mas simplificada (sem topics/agents)
- Carrega todas as mensagens anteriores do banco na inicialização (memória completa)
- Envia o histórico completo para a IA a cada mensagem
- Streaming token-by-token
- Salva cada mensagem no banco

### 4. Navegação: `src/components/BottomNav.tsx`
- Adicionar tab `{ id: "ia", label: "IA", icon: Bot, path: "/dashboard/ia" }` entre Gráficos e Notas

### 5. Roteamento: `src/App.tsx`
- Adicionar `<Route path="ia" element={<IAPage />} />`

