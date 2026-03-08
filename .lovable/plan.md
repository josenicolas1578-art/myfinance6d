

## Problem
The current flow after tutorial sends the user directly to Profile. The user wants:
1. Tutorial cards shown first (these already exist and are correct)
2. After tutorial ends, user lands on **Chat page** (not Profile)
3. Chat is **blocked** with a message saying the form is mandatory + a button to go to Profile
4. The chat blocking screen already exists (`formCompleted === false`) but needs a better message and button

## Changes

### 1. `src/pages/DashboardLayout.tsx`
- Change `completeTutorial` to navigate to `/dashboard/chat` instead of `/dashboard/perfil`
- This way the user sees the blocked chat screen after the tutorial

### 2. `src/pages/ChatPage.tsx` (the blocked screen, lines 250-270)
- Redesign the `formCompleted === false` block:
  - Better copy: "Para utilizar a plataforma de forma livre, é necessário responder um formulário obrigatório na aba Perfil"
  - Replace the current button text with "Preencher Formulário" (clear CTA)
  - Make it more visually appealing with neon-glow styling to match the app theme

### 3. `src/components/OnboardingTutorial.tsx`
- Change the last card's button text from "Ir para o Perfil" to "Começar" or "Entendi" since it will now go to chat, not directly to profile
- Update the last card description to remove the "preencher na aba Perfil" part since that instruction will appear on the chat blocked screen instead

No database changes needed. The tutorial cards content (6 steps about the platform, AI, charts, summaries, goals) is already correct.

