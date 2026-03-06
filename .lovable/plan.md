

## Problem

The sidebar collapsed width is controlled by the CSS variable `SIDEBAR_WIDTH_ICON = "3rem"` in `src/components/ui/sidebar.tsx` (line 19), not by the Tailwind class `w-14` in `AppSidebar.tsx`. The `w-14` class is being overridden by the inline CSS variable. Similarly, `SIDEBAR_WIDTH = "16rem"` controls the expanded width.

## Plan

**File: `src/components/ui/sidebar.tsx`**

1. Change `SIDEBAR_WIDTH` from `"16rem"` to `"13rem"` (~208px, matching `w-52`) to keep the expanded sidebar at its current correct width.
2. Change `SIDEBAR_WIDTH_ICON` from `"3rem"` to `"3.5rem"` (~56px, matching `w-14`) to give collapsed icons more breathing room without being too wide.

**File: `src/components/AppSidebar.tsx`**

3. Remove the Tailwind width classes (`w-14`, `w-52`) from the `Sidebar` className since widths are managed by CSS variables -- they have no effect and are misleading.

