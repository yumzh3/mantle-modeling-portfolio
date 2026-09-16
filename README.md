# Mantle melting and crystallization portfolio

Serve this folder with a static HTTP server. No runtime dependencies or build step are required.

The two explorers share one sampled degree across their schematic and three plots. Looping play, pause, reset and keyboard scrubbing are supported. Plots use fixed axes. Mineral colors are consistent between both schematics. Deterministic irregular Voronoi regions represent exact total-system phase fractions; boundary polygons are split to conserve area. Melting mixes phases throughout, while crystallization fills regions from the edges inward. Mineral line plots use the separately supplied normalized proportions.

## Sources and column mapping

`../figures/melting_xtal_plot_data.xlsx`, read using cached numeric values without changing the workbook:

| Sheet | Use | Columns |
| --- | --- | --- |
| melting_plot | Melting degree and total phases | A; A:F |
| melting_plot | Residual mineral proportions | A, G:K |
| melting_plot | Melt MgO and La | A, L; A, M |
| melting_plot | Modeled/experimental MgO; K₂O | N:O; P:Q |
| crystallization_plot | Degree and total phases | A; R and B:D |
| crystallization_plot | Crystallized mineral proportions | A, E:G |
| crystallization_plot | Residual magma MgO and La | A, H; A, I |
| crystallization_plot | Natural/model magma MgO–FeO | J:K; L:M |
| crystallization_plot | Natural/model olivine Fo–Ni | N:O; P:Q |

The updated crystallization sheet now stores increasing crystallization degree in A and remaining melt in R. H and I contain trajectory MgO and La. Independent comparison datasets have different lengths; only pairs with two numeric values are plotted (1167 natural basalt, 111 modeled magma, 821 natural olivine, 139 modeled olivine; five points per melting comparison). Missing pairs are omitted, never replaced by zero.

The initial melting state is supplied by the researcher: 0% melt, 52.5% olivine, 15% orthopyroxene, 25% clinopyroxene, 7.5% garnet, 0% spinel. The first spreadsheet step follows garnet-to-spinel conversion. An explicit initial state precedes the 28 calculated steps. Crystallization starts at 100% melt before 185 calculated steps. Concentrations absent at the initial states are null and are not plotted or interpolated; normalized crystal proportions are undefined before any crystals exist.

The complete method text and structured equations are imported from `../website idea.docx` as native MathML. Eq. c1 uses F as the remaining melt fraction, consistent with F = 1 − ΣFa; its explanatory sentence is corrected accordingly. The original duplicate c2 numbering is preserved. The Ni equation, definitions and comparison paragraph come from the updated document.

Overview: `../figures/modified-workflow.svg`. Ni figure: `../figures/Ni_partition_comparison.pdf`, rendered with pdftoppm to a 2200px PNG. Original supplied files remain unchanged.

`scripts/import-content.py` contains the source extraction and SVG comparison plotting logic. Requires Python openpyxl and lxml. The HTML imports replace original placeholder blocks; review editorial changes if importing a revised document. Native browser MathML avoids a network math-rendering dependency.

## Verification

Run `node --test tests/explorer.test.cjs`. Tests cover synchronization, backward scrubbing, validation, source endpoints, starting states, exact polygon area conservation, deterministic geometry and repeated playback cycles. Desktop and mobile use the existing 760px grid breakpoint; equations scroll locally if necessary.

Playback uses a ten-second trajectory and a 0.75-second hold at the final state before restarting. Melting mineral labels stay beside their initial values; crystallization labels stay at their final positions and show short connectors only at the final frame. Axis ranges follow the September 15 annotations. Element plots have no duplicate headings or legends. Equation numbers share a fixed grid column; narrow screens scroll each equation locally. Ni content stacks vertically at all viewport widths.

## Phase continuity and layout refinements

Schematic geometry now evolves through the full ordered trajectory. Each step transfers area only from phases with a net decrease to phases with a net increase. Existing melt is preserved throughout melting, and existing minerals are preserved throughout crystallization. Only the shrinking portion is subdivided. Cached frame histories make backward scrubbing, reset and replay deterministic. This illustrates net phase changes from the supplied proportions; it does not infer specific mineral reaction pathways. Reaction coefficients are not required for this visualization.

An additional test checks phase areas at every step and tracks 180 fixed spatial points across each trajectory to detect recycling of melt or crystals. Comparison ticks, marker sizes and legend sizes follow the latest annotations. Content shares a 900px maximum width with equal side margins, prose is justified, and section backgrounds are white. Comparison and Ni figures use 90% width, the overview 80%, and desktop playback controls 75%. Mobile playback controls retain the full content width to keep buttons and sliders usable. Approved copy is maintained in `scripts/polish-content.py` and reapplied after source imports.
