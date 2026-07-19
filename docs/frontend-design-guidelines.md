# Frontend Design Guidelines

This project has not installed a separate `frontend-design` Codex skill. The frontend should still follow a shared design contract so future UI work stays consistent.

## Product Feel

BookingCare Mini is a clinical booking and operations product. The UI should feel calm, clear, trustworthy, and efficient. Public pages can be warmer and more visual, while admin and doctor screens should prioritize dense scanning, predictable controls, and fast repeated action.

## Existing Stack

- React with Vite.
- Bootstrap 5 utilities and components.
- Central stylesheet: `frontend/src/styles/app.css`.
- Existing design tokens live in `:root` and should be reused before adding new hard-coded colors.

## Core Rules

- Use the existing color tokens for primary, semantic status, borders, text, shadows, and surfaces.
- Keep operational screens compact: tables, filters, action bars, and status badges should be easy to scan.
- Use cards for repeated items, modals, and framed tools. Avoid nesting cards inside other cards.
- Use stable dimensions for controls, badges, counters, grids, avatar/photo regions, and appointment/status tiles so dynamic text does not shift the layout.
- Do not scale font size directly with viewport width. Use fixed rem sizes or bounded `clamp()` only for page-level headings.
- Keep letter spacing at `0` for normal text. Uppercase labels may use modest positive spacing.
- Prefer icon-only buttons with accessible labels for familiar actions when the icon is already available in the project. Use text buttons for primary commands.
- Avoid one-note palettes. The current sky/teal base should be balanced with neutral surfaces and semantic amber/emerald/red states.
- Text must wrap or truncate intentionally inside buttons, badges, cards, filters, and navigation.
- Every interactive element needs visible focus styling.

## Page Patterns

- Public landing/home: first viewport should immediately show the booking value, primary action, and a real product state such as schedule, doctors, clinics, or specialties.
- Directory pages: search/filter controls should sit near results and remain compact on mobile.
- Detail pages: show identity, availability, location, and booking action early.
- Doctor/admin pages: no marketing heroes; use concise headers, KPI rows, filters, tables/lists, and obvious next actions.

## Implementation Checklist

- Reuse tokens in `frontend/src/styles/app.css`.
- Check mobile widths at 360px, 390px, 768px, and desktop around 1366px.
- Confirm no horizontal scrolling, text overlap, or clipped primary actions.
- Run `npm run build` in `frontend` before handoff.
