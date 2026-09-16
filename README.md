# Mantle Melting and Magma Crystallization Modeling

An interactive research website by **Mingzhen Yu** exploring how mantle melting and magma crystallization shape the chemical compositions of melts and minerals.

The site introduces the modeling methods, visualizes example trajectories, and compares model predictions with experimental and natural data. It also presents a nickel partitioning parameterization for olivine and melt.

## Explore the research

- **Mantle melting:** decompression melting, changing residual mineral proportions, and the evolution of melt MgO and La concentrations, with comparisons to experimental data.
- **Magma crystallization:** mineral formation and residual magma evolution, with comparisons to natural basalt and olivine compositions.
- **Nickel partitioning:** equations describing nickel distribution between olivine and melt, and comparisons with previous parameterizations.

Each interactive explorer includes a phase schematic and three linked plots. Use **Play**, **Pause**, **Reset**, or the degree slider to follow the trajectory. Expand the method sections to read the mass-balance relationships and numerical approach.

The explorers display precomputed example trajectories; they do not run new geochemical calculations in the browser. Schematic shapes and spatial arrangements are for illustration only. Their colored areas represent phase fractions, while the mineral-proportion plots show proportions normalized within the solid assemblage.

For the Python melting and crystallization calculations, see the separate [melt_xtal repository](https://github.com/yumzh3/melt_xtal/).

## Run locally

The website uses HTML, CSS, and JavaScript, with SVG charts and native MathML equations. No build step, package installation, or backend is required to view it.

From the repository folder, start a local server using Python 3:

```sh
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) in a modern browser. Stop the server with **Ctrl+C**.

The same files can be hosted on a static website service such as GitHub Pages, with `index.html` as the entry point.

## Repository structure

| File or folder | Purpose |
| --- | --- |
| `index.html` | Research narrative, equations, references, and page structure |
| `styles.css` | Responsive layout and visual styling |
| `model-data.js` | Precomputed trajectories used by the explorers |
| `model-explorer.js` | Interactive charts, phase schematics, and playback controls |
| `script.js` | Site navigation behavior |
| `assets/` | Website figures and favicon |
| `scripts/` | Content and data preparation utilities |
| `tests/` | Checks for explorer behavior and phase-area conservation |
| `exports/` | Supporting workflow illustration exports |

The preparation utilities use the author's source workbook, research document, and figures from outside this repository folder. Those inputs are not needed to view or host the website; the prepared content and data are included here.

## Development checks

With Node.js installed, run:

```sh
node --test tests/explorer.test.cjs
```

The tests cover synchronized plots, backward scrubbing, data validation, trajectory endpoints, phase-area conservation, phase continuity, and looping playback.

## References and data sources

The website provides references alongside the relevant methods and figures. Selected sources include:

- [Langmuir, Klein & Plank (1992)](https://doi.org/10.1029/GM071p0183) — mantle melting framework.
- [Weaver & Langmuir (1990)](https://doi.org/10.1016/0098-3004(90)90074-4) — magma crystallization modeling.
- Walter (1998) — melting reactions and experimental melting comparisons.
- Salters & Stracke (2004) — depleted mantle composition used in the melting example.
- [Sobolev et al. (2005)](https://www.nature.com/articles/nature03411) — natural data used in the crystallization comparisons.
- [Beattie (1993)](https://link.springer.com/article/10.1007/bf00712982) and [Matzen et al. (2017)](https://link.springer.com/article/10.1007/s00410-016-1319-8) — nickel partitioning comparisons.
- [Yu & Langmuir (2023), *Chemical Geology*](https://doi.org/10.1016/j.chemgeo.2023.121745) — nickel partitioning parameterization and its application to basalt and olivine compositions.
- [Langmuir & Yu (2024), AGU](https://ui.adsabs.harvard.edu/abs/2024AGUFMV41A...01L/abstract) — related research.

## Author and acknowledgments

**Mingzhen Yu** is a PhD-trained quantitative geoscientist and Harvard postdoctoral researcher working across geochemistry, scientific modeling, and data analysis.

Research content, mantle melting implementation, crystallization extensions, and the new nickel partitioning parameterization are by Mingzhen Yu. The original Python crystallization implementation is by Jocelyn Fuentes. Website layout and formatting were refined with assistance from OpenAI Codex.

For research questions, contact [Mingzhen Yu](mailto:myu@g.harvard.edu).
