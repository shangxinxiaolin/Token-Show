# Token Show workbench redesign

Workflow: UI UX Pro Max → Frontend Design → Web Design Guidelines.

## Direction and tokens
- Midnight #080f1b: application canvas and integrated window chrome.
- Slate #101e31: data surfaces; #233b53: structural separators.
- Ice #51e6ed: current client and primary actions.
- Violet #b2a1ff: reasoning and secondary chart series.
- Mist #e7f3ff: primary text; #9ab0c8: supporting text.
- Light counterpart: #edf4f8 canvas, #f9fcff surface, #007c91 accent.
- Segoe UI / Microsoft YaHei for readable desktop labels; Cascadia Mono / Consolas only for numerical readings.

## Layout
Left-aligned navigation and content. A dedicated five-client selector sits above the period toolbar. Six readings form a compact instrument strip with a wider total readout; the trend plot gets two thirds of the chart area, token composition the remaining third. Recent requests retains the same client selector.

```
Navigation | View title                     Local data
           | OpenCode | DSH | Antigravity | Claude | Codex
           | Active client       Date range     Refresh
           | Total / Input / Cache / Cost / Requests / Today
           | Usage timeline                 | Token composition
           | Local source status and last refresh
```

## Plan critique before implementation
Removed the decorative telemetry eyebrow and panel corner accents. Replaced client-share doughnut (always 100% in single-client mode) with disjoint token categories. Client selectors show selection explicitly rather than misleading zero totals for inactive clients. Keep cyber emphasis on the selected client and plotted data, not repeated glow effects. Preserve native offline fonts and the integrated title bar.
