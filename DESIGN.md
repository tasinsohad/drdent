# Design System Document: The Clinical Sanctuary

## 1. Overview & Creative North Star
### The Creative North Star: "The Ethereal Clinic"
The dental experience is often associated with anxiety and rigid sterility. This design system seeks to subvert those tropes. We are moving away from the "industrial SaaS" look—characterized by heavy borders and flat, stark white grids—toward a **Soft-Minimalist Editorial** experience. 

The goal is to create a digital environment that feels as calming as a high-end wellness spa. We achieve this through **Intentional Asymmetry**, **Tonal Layering**, and **Atmospheric Depth**. By utilizing soft emeralds and calming blues, we provide a sense of professional hygiene while maintaining an inviting, human-centric "breathability."

---

## 2. Colors & Surface Philosophy
We depart from traditional UI by adopting the **"No-Line" Rule**. Structural integrity is maintained not through lines, but through a sophisticated hierarchy of surface tones.

### Color Tokens (Material Design Convention)
*   **Primary (Clinical Authority):** `#006880` (Deep Teal Blue) — Used for primary actions and focused states.
*   **Secondary (Fresh Vitality):** `#006d4a` (Emerald Green) — Used for health indicators, success states, and positive patient outcomes.
*   **Surface (The Canvas):** `#f8f9ff` — A cool, airy base that prevents eye strain.
*   **Surface Containers (The Depth Scale):** 
    *   `surface-container-lowest`: `#ffffff` (Pure white for floating elements)
    *   `surface-container-low`: `#eff4ff` (Standard section background)
    *   `surface-container-highest`: `#d2e4ff` (Sunken or inactive areas)

### The "Glass & Gradient" Rule
To elevate the UI from "standard" to "bespoke," use **Glassmorphism** for navigation sidebars and modal overlays. Use a `backdrop-blur-xl` combined with a semi-transparent `surface-container-lowest` (80% opacity). 

**Signature Texture:** Primary buttons and hero headers should utilize a subtle linear gradient: `from-primary to-primary_dim` (at a 135-degree angle). This adds a "jewel-toned" depth that feels premium and tactile.

---

## 3. Typography: The Editorial Voice
We utilize a dual-font strategy to balance authority with approachability.

*   **Display & Headlines (Manrope):** A modern geometric sans-serif with a wide stance. Use `headline-lg` (2rem) for patient names and `display-sm` (2.25rem) for dashboard overviews. The high x-height of Manrope provides an "open" feel that reduces the perceived complexity of clinical data.
*   **Body & Labels (Inter):** The workhorse for readability. Use `body-md` (0.875rem) for patient notes and `label-sm` (0.6875rem) for metadata. 

**Style Note:** Always use `tracking-tight` on Headlines to create a "locked-in" editorial look, while using `tracking-wide` on Labels for maximum legibility in dense patient records.

---

## 4. Elevation & Depth: Tonal Layering
Traditional dropshadows are forbidden in this system. We use **Ambient Light Mimicry**.

1.  **The Layering Principle:** Place a card (`surface-container-lowest`) on a background (`surface`). The contrast between the two is enough to define the edge. No border is needed.
2.  **Ambient Shadows:** For floating elements like Dropdowns or Patient Cards being dragged, use:
    *   `shadow-color`: 4% opacity of `on-surface` (`#0d3459`)
    *   `blur`: 40px
    *   `y-offset`: 20px
3.  **The "Ghost Border" Fallback:** If a patient card requires a boundary (e.g., in high-contrast mode), use `outline-variant` at 15% opacity. It should feel like a suggestion of a line, not a physical barrier.

---

## 5. Component Specifications

### Patient Kanban Board
*   **The Board:** Avoid vertical lines between columns. Use a subtle shift from `surface` to `surface-container-low` to define column areas.
*   **Kanban Cards:** Use `rounded-lg` (1rem). The header of the card should use `title-sm` in `on-surface`.
*   **Patient Avatars:** Always use a soft `rounded-full` with a 2px offset ring using `surface-container-lowest` to make the image "pop" against the card.

### Interactive Elements
*   **Buttons:** 
    *   **Primary:** Gradient-filled (`primary` to `primary_dim`), `rounded-md` (0.75rem), `px-6 py-3`.
    *   **Secondary (The Emerald Action):** Use `secondary_container` background with `on_secondary_container` text. This creates a "soft green" vibe for booking appointments.
*   **Input Fields:** Ghost-style. Background should be `surface-container-highest` with no border. On focus, transition the background to `surface-container-lowest` and add a 2px `primary` bottom-only highlight.
*   **Dropdown Menus:** Utilize the **Glass & Gradient** rule. A `backdrop-blur-md` combined with `surface-container-lowest` at 90% opacity.

### Cards & Lists
*   **The No-Divider Rule:** In patient lists, do not use `border-b`. Instead, use `margin-bottom: 8px` and a very subtle background hover state (`surface-container-low`). Vertical whitespace is your separator.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical padding. Give the top of a page more breathing room (e.g., `pt-24`) than the sides to create an editorial layout.
*   **Do** use the Emerald Green (`secondary`) for "Ready for Checkout" or "Healthy" statuses to reinforce a sense of freshness.
*   **Do** use `rounded-xl` (1.5rem) for large containers to soften the clinical feel.

### Don’t:
*   **Don’t** use pure black `#000000` for text. Use `on-surface` (`#0d3459`) to keep the palette soft and cohesive.
*   **Don’t** use 1px solid borders to separate sidebar items. Use tonal shifts or "Ghost Borders" only.
*   **Don’t** use sharp corners. The dental practice should feel "safe"—sharp corners evoke the "needle" anxiety we are trying to mitigate.