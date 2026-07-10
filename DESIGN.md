# StarVault Imprint Design Direction

## Lineage

Primary: Alice-inspired macOS Tahoe productivity desk.
Secondary: Raycast-style command density for fast repository triage.

This direction borrows interaction and visual principles from the local Alice app, not private assets, character content, or proprietary UI copy. The product should feel calm, warm, translucent, and precise enough for daily work.

## Product Role

This is not a marketing website. It is an opportunity intelligence desk for scanning many repositories, triaging risk, and deciding whether to watch, fork, learn from, or ignore a project.

## UI Principles

- The first viewport must show the real work surface: metrics, filters, ranked opportunities, and the selected project.
- Replace spreadsheet-like scanning with a feed of readable opportunity rows and a clear dossier panel.
- Put decision signals first: opportunity score, risk, license, momentum, repository URL, and next action.
- Filters should behave like a side command tray: presets first, detailed filters secondary, no full-screen tag wall.
- Settings should feel operational and calm; API key configuration belongs there, not in the main scan flow.
- Learning must be transparent: show short-term signals, long-term preferences, recovery anchors, and evolution records instead of hiding self-tuning behind black boxes.
- Avoid decorative visuals that do not improve scanning or trust.

## Visual System

- Background: warm paper base with a translucent sidebar and a white rounded workspace surface.
- Accent: neutral graphite for primary action, warm gold for attention, blue for external/system signals, green for success, red for danger.
- Shape: 8px controls, 12px cards, 16px major panels, with soft borders and restrained shadows.
- Typography: compact but humane; long descriptions use generous line height, dense controls use role-based small labels.
- Motion: 120-180ms hover, selection, and panel transitions; no decorative animation loops.

## Density

Desktop should prioritize split view: opportunity feed on the left, project dossier on the right.
Medium widths stack the dossier below the feed.
Mobile keeps filter chips scrollable and turns rows into full-width decision cards.

## Alice-Inspired Learning Patterns

- Recovery Anchor: make the last meaningful scan/selection and next suggested action visible.
- Work Items: treat tuning recommendations as small improvement tasks with a status-like presentation.
- Observation Log: show recent behavior and model tuning events as an inspectable journal.
- Context Compression: preserve recent raw behavior, compress older history into summaries with evidence, and keep user-editable preferences visible.
