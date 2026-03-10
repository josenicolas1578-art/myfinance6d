

# Fix: Checklist items appearing at bottom instead of top

## Problem
The checklist items are pushed to the bottom because the `TabsContent` and its parent containers don't properly propagate height. The `ChecklistTab` uses `h-full` but the `TabsContent` wrapper doesn't have a defined height, so flex layout collapses.

## Changes

### `src/pages/NotasPage.tsx`
- Change the `Tabs` wrapper to use `overflow-hidden` alongside `flex-1 min-h-0`
- Ensure the "notas" `TabsContent` also uses flex column layout when active, same as checklist

### `src/components/ChecklistTab.tsx`  
- The component itself looks correct — the issue is purely the parent not giving it height

### Root cause
The `TabsContent` component's default class doesn't include flex/height properties. The `data-[state=active]:flex` trick was added but the parent `Tabs` container needs `overflow-hidden` to constrain the height properly, and the `TabsContent` for checklist needs explicit height.

### Fix summary
On the checklist `TabsContent`, add `h-full` or use `flex-1` with proper overflow. The `Tabs` container already has `flex-1 min-h-0` but may need `overflow-hidden`. The simplest fix: add `overflow-hidden` to the Tabs and ensure the checklist TabsContent has proper height constraints.

