

## Problem

The modal already has all 8 columns in the code. The issue is that the base `DialogContent` component has `w-full max-w-lg` hardcoded (line 39 of dialog.tsx). When the component passes `max-w-[90vw] w-auto`, Tailwind's class merging via `cn()` should handle it, but `w-auto` may not override `w-full` properly, causing the modal to stay constrained.

## Plan

**File: `src/components/dashboard/ClientesStatusDetailPopup.tsx`** (line 117)

Change the DialogContent className from:
```
max-w-[90vw] w-auto max-h-[85vh]
```
to:
```
!max-w-[90vw] !w-auto max-h-[85vh]
```

Using `!important` modifiers ensures these classes override the base `max-w-lg` and `w-full` from the dialog component, allowing the modal to expand to fit all table columns.

This is a single-line change that restores full column visibility without modifying the shared dialog component.

