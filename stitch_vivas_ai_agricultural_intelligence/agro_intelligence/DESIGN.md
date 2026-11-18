---
name: Agro-Intelligence
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#414844'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#2c694e'
  on-secondary: '#ffffff'
  secondary-container: '#aeeecb'
  on-secondary-container: '#316e52'
  tertiary: '#3b1f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#56340e'
  on-tertiary-container: '#cd9d6d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#b1f0ce'
  secondary-fixed-dim: '#95d4b3'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#0e5138'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#f0bd8b'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f18'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  container-max: 1280px
---

## Brand & Style
The design system for this professional agricultural AI presentation theme centers on a "Precision Institutional" aesthetic. It balances the grounded, reliable nature of traditional agriculture with the sharp, clinical precision of modern artificial intelligence. 

The visual language draws from **Modern Corporate** and **Minimalist** influences, utilizing heavy whitespace to ensure data clarity. It incorporates "Satellite-Tech" overlays—subtle dot-grid patterns and thin vector line-work—to evoke a sense of high-tech monitoring and geospatial intelligence. The emotional response should be one of profound trust, technological superiority, and environmental stewardship.

## Colors
The palette is rooted in a spectrum of greens to symbolize growth and sustainability, contrasted against tech-focused neutrals.

- **Primary (#1B4332):** Used for structural elements, heavy headings, and primary navigation/sidebar backgrounds. It provides the "Institutional" anchor.
- **Secondary (#2D6A4F):** Used for active states, primary buttons, and success indicators.
- **Earthy Gold (#D4A373):** Reserved exclusively for data highlights, callouts, and differentiating key metrics in charts to ensure visibility against the green tones.
- **Background (#F8F9FA):** A slightly warm off-white to reduce eye strain during long technical presentations while maintaining high contrast.
- **Text (#212529):** Deep charcoal used for body copy to maintain superior legibility without the harshness of pure black.

## Typography
This design system utilizes a dual-font strategy to differentiate between brand narrative and technical data.

- **Montserrat** is the primary voice, used for all headlines. Its geometric construction feels modern and authoritative.
- **Inter** is the workhorse for body text, chosen for its exceptional legibility in data-dense layouts.
- **JetBrains Mono** is introduced as a utility font for data labels, coordinates, and technical metadata, reinforcing the "Precision AI" narrative.

For mobile layouts, headline sizes scale down significantly to maintain a clean hierarchy on smaller devices.

## Layout & Spacing
The layout follows a **Fixed Grid** model for presentations, ensuring that technical diagrams and charts remain centered and digestible.

- **Grid:** A 12-column grid is used for desktop layouts with a 24px gutter.
- **Rhythm:** All spacing is derived from an 8px base unit. 
- **Structure:** Content should be grouped into distinct logical sections using generous vertical padding (80px - 120px) to prevent the "data-clutter" common in agricultural software. 
- **Technical Overlays:** Background elements (like dot grids) should align strictly to the 8px unit to maintain the "precision" feel.

## Elevation & Depth
To maintain an institutional and professional feel, the design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Surfaces:** Use subtle shifts in background color (e.g., a slightly darker tint of the off-white) to define card areas.
- **Outlines:** Elements like input fields and cards use a 1px border (#DEE2E6).
- **Depth:** When depth is required (e.g., for modal dialogues or dropdowns), use "Ambient Shadows"—extremely soft, blurred shadows with a low opacity (5-10%) and a slight tint of the primary green to keep the shadow feeling "natural" and integrated.

## Shapes
The shape language is "Soft-Technical." Elements use a **0.25rem (4px)** base radius. This small radius keeps the UI feeling modern and approachable without losing the serious, "engineered" look of sharp corners. Larger cards and containers may use up to 0.75rem (12px) to create a clear container hierarchy.

## Components
- **Buttons:** Primary buttons use the Secondary Green (#2D6A4F) with white Montserrat Bold text. They should have a flat appearance or a very subtle 1px bottom border for a "tactile" feel.
- **Data Cards:** Cards should feature a 1px border and a JetBrains Mono label at the top-left (e.g., "SENSOR_01 // ACTIVE").
- **Chips:** Used for status indicators (e.g., "In-Growth," "Harvest-Ready"). These should use desaturated versions of the palette with high-contrast text.
- **Input Fields:** Clean, rectangular with 4px corners. Focus states should use a 2px stroke of the Earthy Gold to draw the eye.
- **Charts:** All data visualizations must use the Earthy Gold (#D4A373) as the primary data line/bar to contrast against the green structural elements of the UI. 
- **Technical Accents:** Use thin (1px) lines and 4px "plus" symbols at grid intersections to mimic blueprint or satellite telemetry software.