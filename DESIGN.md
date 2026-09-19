# CLC Outreach Availability Design Standard

## Status

This document defines the visual and interaction standard for the CLC Outreach Availability web application. It is the reference for new screens, components, and product features.

`src/index.css` is the implementation source of truth. It defines the CSS variables, Tailwind v4 `@theme` mappings, base behavior, and reusable `app-*` component primitives. New UI must use these tokens and primitives instead of inventing color, radius, shadow, or state combinations in individual components.

The product is an operational coordination tool. It should feel calm, trustworthy, focused, and quick to use on a phone between classes or while organizing an outreach activity.

## Design Direction

### Product character

- Practical, bright, and dependable.
- Calm white workspace surfaces with a cyan-teal active accent.
- Dense enough for repeated operational work, with generous spacing around important actions.
- Clear about state: selected, saved, pending, unavailable, restricted, or failed.
- Respectful of personal information and student context.

### Avoid

- Marketing-style hero sections.
- Decorative dashboards that hide the primary task.
- Gradients, glass effects, or floating decorative shapes.
- Indigo, purple, or blue feature-specific palettes.
- Tiny controls that are difficult to use on mobile.
- Information displayed in cards inside other cards.
- Ambiguous icons without labels or accessible names.

## Visual Foundation

### Color tokens

Use semantic tokens rather than one-off colors. The visual source is the supplied mobile application reference: bright white surfaces, a soft cool-gray canvas and fields, charcoal typography, restrained borders, and cyan-teal actions.

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#F3F4F6` | Main page background and application canvas |
| `surface` | `#ffffff` | Panels, forms, navigation |
| `surface-muted` | `#F1F1F1` | Inputs, tab strips, secondary regions |
| `border` | `#D9DDE1` | Default borders and dividers |
| `text` | `#1F2937` | Primary text |
| `muted` | `#6B7280` | Supporting text and metadata |
| `subtle` | `#9CA3AF` | Hints and inactive labels |
| `primary` | `#479EBA` | Main actions, active navigation, visualizations |
| `primary-hover` | `#377F98` | Hover and pressed primary actions |
| `primary-soft` | `#E8F5F8` | Selected backgrounds and badges |
| `primary-muted` | `#B9DCE6` | Teal data/selection middle tone |
| `success` | `#16803C` | Saved, complete, or successful states |
| `success-soft` | `#E9F8EE` | Success banners |
| `warning` | `#A65A00` | Missing setup or attention required |
| `warning-soft` | `#FFF4DC` | Warning banners |
| `error` | `#B91C1C` | Errors, destructive actions, restricted states |
| `error-soft` | `#FEE2E2` | Error banners |

Color must never be the only indicator of state. Pair it with text, an icon, a checkmark, or a change in control content.

### Typography

Use `Avenir Next`, `Segoe UI`, or the platform sans-serif fallback. Typography should prioritize scanning over expressive display treatment.

Recommended hierarchy:

| Style | Size | Weight | Use |
| --- | --- | --- | --- |
| Page title | `24px` | 600-700 | Main screen heading |
| Section title | `18px` | 600-700 | Tool or panel heading |
| Card title | `15-16px` | 600-700 | Event, slot, or student item |
| Body | `14px` | 400-500 | Main supporting content |
| Metadata | `12px` | 400-600 | Dates, roles, status, helper text |
| Label | `11-12px` | 600 | Form labels and uppercase section labels |
| Navigation | `12px` | 500-600 | Desktop and mobile navigation |

Use `line-height: 1.4` for body text and `1.2` to `1.3` for headings. Do not use negative letter spacing. Keep paragraphs short and scannable.

### Shape and elevation

- `--radius-sm`: `8px` for compact controls and small buttons.
- `--radius-md`: `12px` for inputs, buttons, and standard cards.
- `--radius-lg`: `16px` for panels, dialogs, and primary content groups.
- Avoid excessive pill shapes; reserve them for statuses, filters, or compact tags.
- Use thin borders as the primary separation method.
- Use `--shadow-sm` for panels, `--shadow-md` for raised actions, and `--shadow-lg` for dialogs. Borders provide the main separation; shadows must never be used as the only boundary.
- Do not nest framed cards unless the inner item is a genuinely separate repeated record.

### Spacing

Use a consistent 4px base rhythm:

- `4px`: icon-to-label or micro spacing.
- `8px`: compact control gaps.
- `12px`: standard inline and card spacing.
- `16px`: panel padding and section gaps.
- `24px`: major content separation.
- `32px`: page-level vertical spacing.
- `40px+`: large empty-state or page breathing room.

## Layout Principles

### Application shell

Every authenticated workspace uses the same shell model:

1. Sticky header with identity and account actions.
2. Role-specific navigation.
3. Constrained content area.
4. Fixed mobile navigation when the screen is narrow.
5. Main task visible without requiring a marketing-style introduction.

Use a maximum content width around `1024px` for dashboards. Keep page content horizontally padded by at least `16px` on mobile and `24px` on desktop.

### Responsive behavior

The product is mobile-first.

- Mobile: single-column content, bottom navigation, full-width primary actions.
- Tablet: two-column layouts only when both columns remain readable.
- Desktop: wider tables, horizontal navigation, and side-by-side summaries where comparison helps.
- Never require horizontal scrolling for the primary action.
- Tables may scroll horizontally only when a card or stacked layout would be less usable.
- Preserve safe-area space beneath fixed mobile navigation.

### Content hierarchy

Each screen should answer these questions in order:

1. Where am I?
2. What is the current context, such as active semester or event?
3. What decision or action is needed?
4. What happened after I acted?

Do not put secondary analytics above the action a user visits to complete.

## Navigation

### Desktop navigation

Use a horizontal tab strip below the sticky header.

- Active tab: white surface, primary text, subtle elevation.
- Inactive tab: muted text, quiet hover background.
- Labels are short and action-oriented.
- Preserve the same tab order across desktop and mobile.

### Mobile navigation

Use a fixed bottom bar with one item per primary view and a final Profile item.

- Minimum touch target: `44px` by `44px`; preferred height is `56px`.
- Show icon and short label.
- Active state uses a soft primary background and primary text.
- Account actions such as sign out remain in the header or profile view, not in the primary navigation bar.

### Icons

Use Lucide icons consistently.

- Use familiar symbols for navigation and actions.
- Use icon plus text for unfamiliar or consequential actions.
- Every icon-only button must have a tooltip or accessible label.
- Do not draw custom SVG icons when an appropriate Lucide icon exists.

## Component Standards

### Buttons

Primary buttons are for the main action on a screen.

- Primary: solid teal background with white text.
- Secondary: white or muted surface with a border.
- Tertiary: text action for low-emphasis navigation.
- Destructive: danger styling and explicit wording.
- Disabled: visibly unavailable, never merely lower contrast.
- Include a spinner and preserve button width while an async action is pending.

Button labels should describe the result: `Save Availability`, `Create Event`, `Set Active`, `Export CSV`.

Do not use a text-filled rounded rectangle when a familiar icon-only action is sufficient, such as close, back, download, or edit. Provide an accessible name and tooltip for icon-only actions.

### Forms

- Labels are always visible; placeholders are not labels.
- Required fields show a clear required indicator.
- Keep related fields in sections with short headings.
- Use native date controls where possible.
- Validate near the field and summarize submission errors near the form action.
- Preserve entered values after a failed submission.
- Disable duplicate submission while saving.
- Never silently discard an unsaved edit.

### Cards and list items

Use cards for individual records, actionable time slots, event summaries, and detail panels.

A card should have:

- One clear title.
- Supporting metadata below or beside it.
- One obvious primary interaction.
- A stable size or layout so content changes do not shift adjacent controls.

Do not turn every section of the page into a card. Use full-width bands or open layouts for page-level structure.

### Availability controls

Availability is the central interaction and must be fast to scan.

- Present one day at a time on small screens.
- Show a visible indicator when a day contains selected slots.
- Make the entire time-slot row clickable, not only the checkbox.
- Use a checkmark and text/state contrast for selected slots.
- Keep the save action sticky near the bottom on mobile.
- Show the active semester prominently before the grid.
- After saving, show a short success state without blocking the user.

### Heatmap controls

- Use consistent day selectors and time blocks.
- Show counts directly on each slot.
- Allow a user to open the people behind a count.
- Empty slots remain visible and explain that no students are available.
- Exports and copy actions belong together in a compact toolbar.
- Do not make color intensity the only way to compare counts; include numbers.

### Tables and directories

- Use cards on narrow screens and tables on wider screens.
- Keep student identity and academic fields visible in the list.
- Load private contact details only when explicitly requested.
- Keep filters near the list heading.
- Show the result count and an informative empty state.
- Use stable column widths and truncate long content with a full accessible title.

### Modals

Use a modal for focused management tasks such as semester administration or student details.

- Include a clear title and close control.
- Keep the modal within the viewport with internal scrolling.
- Trap focus while open.
- Close on Escape unless the form has unsaved changes that require confirmation.
- Keep destructive actions visually separate from ordinary actions.

## State Design

Every data-driven screen must define these states before implementation:

### Loading

- Preserve the page structure when possible.
- Use a compact spinner with a specific message such as `Loading events...`.
- Do not flash an empty state before the request finishes.

### Empty

Explain what is empty and what the user can do next.

Examples:

- `No events yet.`
- `No students found matching your criteria.`
- `No active semester configured.`

### Success

Use a short, local confirmation after a completed mutation. Success messages should not interrupt the workflow or require dismissal unless they contain important information.

### Error

- Explain what failed in plain language.
- Keep the failed form or selected state intact.
- Offer a recovery action where possible.
- Avoid exposing raw Firebase errors to users.

### Restricted

Explain why the content is unavailable and who can perform the action. Do not reveal private record existence unnecessarily.

## Interaction and Motion

Motion should clarify state, not decorate the interface.

Allowed patterns:

- Short fade or scale entrance for a modal.
- Spinner for an active network operation.
- Small pressed state on touch controls.
- Subtle navigation and selection transitions.

Timing guidance:

- Micro-interactions: `100-160ms`.
- Panels and modal entry: `150-220ms`.
- Never delay access to content for an animation.
- Respect `prefers-reduced-motion`.

## Accessibility

The application should meet WCAG 2.2 AA expectations for normal product use.

- Maintain visible keyboard focus.
- Use semantic headings in order.
- Associate labels and inputs programmatically.
- Use buttons for actions and links for navigation.
- Provide text alternatives for meaningful images.
- Do not rely on color alone.
- Maintain sufficient contrast for text, borders, and control states.
- Ensure every interactive control is reachable and usable by keyboard.
- Announce async success and error states to assistive technology when appropriate.
- Keep touch targets at least `44px` square.
- Respect reduced motion and increased text-size preferences.

## Privacy and Trust

The interface handles student identity and contact information, so visual design must reinforce careful data use.

- Clearly distinguish public directory data from private contact details.
- Do not show private fields in broad lists unless operationally necessary.
- Use explicit wording before destructive actions.
- Avoid placing email addresses or phone numbers in exports unless the user has organizer permission and the export requires them.
- Avoid copying sensitive data to the clipboard without a clear action label.
- Use role-specific language rather than exposing implementation details.

## Content Style

Use concise, direct, respectful language.

Prefer:

- `Save Availability`
- `No active semester`
- `Unable to load events. Please try again.`
- `Set Active`
- `View Details`

Avoid:

- Long explanatory paragraphs inside operational screens.
- Vague labels such as `Submit`, `Continue`, or `Manage` when a more specific label fits.
- Blaming language such as `You entered invalid data`.
- Technical error codes in user-facing copy.
- All-caps body text.

## Design Tokens for Implementation

The active shared stylesheet exposes the core tokens as CSS variables:

```css
:root {
  --color-background: #f3f4f6;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f1f1;
  --color-border: #d9dde1;
  --color-text: #1f2937;
  --color-muted: #6b7280;
  --color-primary: #479eba;
  --color-primary-hover: #377f98;
  --color-primary-soft: #e8f5f8;
  --color-success: #16803c;
  --color-warning: #a65a00;
  --color-error: #b91c1c;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgb(31 41 55 / 0.08);
  --shadow-md: 0 5px 16px rgb(31 41 55 / 0.1);
  --shadow-lg: 0 16px 36px rgb(31 41 55 / 0.16);
}
```

Tailwind utility classes may continue to be used, but new components should use the mapped semantic utilities (`bg-primary`, `text-muted`, `border-border`, `rounded-app-md`, and `shadow-app-sm`) or the shared `app-*` primitives instead of inventing nearby colors or inconsistent radii.

## Screen Standards

### Login

- Center the sign-in task vertically without making it feel like a marketing landing page.
- Use the CLC mark as the primary brand signal.
- Explain the sign-in method and show configuration or authentication errors inline.
- Keep the Google sign-in action prominent and full width.

### Student availability

- Show active semester context first.
- Make day navigation and selected state obvious.
- Keep slot selection simple enough to complete with one hand.
- Make save status visible and recoverable.

### Student events

- Group slots under event dates.
- Show joined slots with a checkmark and clear selected styling.
- Preserve the event name and date hierarchy.
- State that tapping again leaves a signup only when that behavior is available.

### Organizer heatmap

- Put response count and semester context above the visualization.
- Use numbers, not only color, to communicate availability.
- Keep copy and export actions close to the data they export.
- Make names available from the selected slot without navigating away.

### Organizer directory

- Keep search and faculty filter visible near the heading.
- Use a responsive card/table transformation.
- Protect private details behind an intentional details action.

### Profile

- Separate basic identity, academic information, and personal details into clear sections.
- Make incomplete required fields easy to identify.
- Use a read-only presentation after completion when editing is not needed.
- Keep the return-to-dashboard action predictable.

## Future Feature Rules

Every new feature should answer the following before implementation:

1. Which role uses it?
2. What is the primary action?
3. What data is public, private, or organizer-only?
4. What are loading, empty, success, error, and restricted states?
5. How does it work on a narrow screen?
6. What happens if the network request is repeated or interrupted?
7. How will the action be represented in Firestore rules and audit history?

New features should reuse existing navigation, tokens, control states, and feedback patterns. A feature is not design-complete until its mobile layout, keyboard behavior, error handling, and privacy boundary are defined.

## Quality Checklist

Before merging a new screen or component:

- [ ] The primary task is obvious within the first viewport.
- [ ] The screen works at mobile and desktop widths.
- [ ] Buttons and controls have stable dimensions.
- [ ] Loading, empty, success, error, and restricted states exist.
- [ ] Keyboard focus and labels are usable.
- [ ] Color is not the only state indicator.
- [ ] Private data is shown only to the intended role.
- [ ] Copy is concise and action-specific.
- [ ] The component uses existing tokens and icon conventions.
- [ ] Reduced-motion behavior has been considered.
