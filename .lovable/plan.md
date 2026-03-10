
# Fix: Checklist items starting from top

## Problem
The scrollable content area inside `ChecklistTab` uses `flex-1` which makes it expand to fill all available space. However, items appear at the bottom because the parent `TabsContent` height calculation with `h-[calc(100%-3rem)]` combined with the flex layout causes the content to be pushed down.

## Solution
Change the `ChecklistTab` scrollable content div to use `justify-start` explicitly and remove the `flex-1` that causes the content area to expand unnecessarily. The content should simply flow from top to bottom naturally.

### `src/components/ChecklistTab.tsx`
- Change the scrollable content div from `flex-1 overflow-y-auto` to just `overflow-y-auto` so items align to the top naturally without flex expansion pushing them down.
