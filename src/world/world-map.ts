// File: src/world/world-map.ts
const SVG_NS = "http://www.w3.org/2000/svg" as "http://www.w3.org/1999/xhtml";

export type CountryColorMap = Record<string, string>;
export type CountryLabelMap = Record<string, string>;

import countryCodes from "./country-codes.json" with {type: "json"};

const byCountryName = countryCodes.reduce((acc, entry) => {
    acc[entry['official_name_en'].toString().toLocaleLowerCase()] = entry['ISO3166-1-Alpha-2'];
    acc[entry['UNTERM English Short'].replace(' (the)','').toString().toLocaleLowerCase()] = entry['ISO3166-1-Alpha-2'];
    acc[entry['CLDR display name'].toString().toLocaleLowerCase()] = entry['ISO3166-1-Alpha-2'];
    acc[entry['ISO4217-currency_country_name'].toString().toLocaleLowerCase()] = entry['ISO3166-1-Alpha-2'];
    return acc;
}, {} as Record<string, string>);
console.log("byCountryName", byCountryName);

const langByCountryCode = countryCodes.reduce((acc, entry) => {
    acc[entry['ISO3166-1-Alpha-2']] = entry['Languages'];
    return acc;
}, {} as Record<string, string[]>);
console.log("langByCountryCode", langByCountryCode);


const DEFAULT_GEOJSON_URL =
    "./custom.geo.json";

// -function lonLatToXY(lon: number, lat: number, width: number, height: number) {
//     -    // simple equirectangular projection
//         -    const x = ((lon + 180) / 360) * width;
//     -    const y = ((90 - lat) / 180) * height;
//     -    return [x, y];
//     -}
function polygonToPath(coords: number[][][]) {
    // width/height unused; function signature preserved for compatibility
    const parts = coords.map((ring) => {
        return (
            ring
                .map((pt, i) => {
                    const [x, y] = [pt[0], pt[1]];
                    return `${i === 0 ? "M" : "L"} ${x.toFixed(6)} ${y.toFixed(6)}`;
                })
                .join(" ") + " Z"
        );
    });
    return parts.join(" ");
}

function multiPolygonToPath(coords: number[][][][]) {
    return coords.map((poly) => polygonToPath(poly)).join(" ");
}

function computeCentroidOfCoords(coords: number[][][]): [number, number] {
    const ring = coords[0] ?? [];
    if (ring.length === 0) return [0, 0];
    let sx = 0,
        sy = 0;
    for (const [lon, lat] of ring) {
        sx += lon;
        sy += lat;
    }
    return [sx / ring.length, sy / ring.length];
}

class WorldMap extends HTMLElement {
    shadow: ShadowRoot;
    svg!: SVGSVGElement;
    tooltip!: HTMLDivElement;
    // viewBox coordinates represent lon/lat space: width=360, height=180
    vbX = -180;
    vbY = -90;
    vbWidth = 360;
    vbHeight = 180;

    geojsonUrl = DEFAULT_GEOJSON_URL;
    features: any[] = [];
    colors: CountryColorMap = {};
    labels: CountryLabelMap = {};
    defaultFill = "forestgreen";
    highlightFill = "#ffcc00";
    oceanFill = "#a4c8e1";

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = `
      :host { display: block; position: relative; user-select: none; }
      .map-container { position: relative; width: 100%; max-width: 100%; }
      svg { width: 100%; height: auto; display: block; background-color: ${this.oceanFill}; }
      .country { stroke: #333; stroke-width: .1; cursor: pointer; opacity: 0.8; transition: fill .12s, opacity .12s; }
      .country:hover { stroke: #000; opacity: 0.95; filter: brightness(0.95); }
      .label { font: 10px sans-serif; pointer-events: none; fill: #111; text-anchor: middle; }
      .tooltip { position: absolute; pointer-events: none; background: rgba(0,0,0,0.75); color: white; padding: 4px 6px; border-radius: 3px; font: 12px sans-serif; transform: translate(-50%, -120%); white-space: nowrap; display: none; z-index: 10; }
      .inset-slot ::slotted(*) { position: absolute; transform: translate(-50%, -50%); }
        .country.color1 { fill: oklch(70% 0.105 20deg); }
        .country.color2 { fill: oklch(70% 0.105 35deg); }
        .country.color3 { fill: oklch(70% 0.105 60deg); }
        .country.color4 { fill: oklch(70% 0.105 90deg); }
        .country.color5 { fill: oklch(70% 0.105 135deg); }
        .country.color6 { fill: oklch(70% 0.105 180deg); }
        .country.color7 { fill: oklch(70% 0.10 225deg); }
    `;

        const container = document.createElement("div");
        container.className = "map-container";

        // create SVG with viewBox matching lon/lat ranges
        this.svg = document.createElementNS(SVG_NS, "svg") as unknown as SVGSVGElement;
        this.svg.setAttribute("viewBox", `${this.vbX} ${this.vbY} ${this.vbWidth} ${this.vbHeight}`);
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        this.svg.setAttribute('transform', 'scale(1,-1)');

        // groups
        const countriesGroup = document.createElementNS(SVG_NS, "g") as SVGGElement;
        countriesGroup.setAttribute("id", "countries");
        this.svg.appendChild(countriesGroup);

        const labelsGroup = document.createElementNS(SVG_NS, "g") as SVGGElement;
        labelsGroup.setAttribute("id", "labels");
        this.svg.appendChild(labelsGroup);

        // tooltip and inset slot
        this.tooltip = document.createElement("div");
        this.tooltip.className = "tooltip";

        const insetSlotWrapper = document.createElement("div");
        insetSlotWrapper.className = "inset-slot";
        insetSlotWrapper.style.position = "absolute";
        insetSlotWrapper.style.top = "0";
        insetSlotWrapper.style.left = "0";
        insetSlotWrapper.style.right = "0";
        insetSlotWrapper.style.bottom = "0";
        insetSlotWrapper.style.pointerEvents = "none";

        const slot = document.createElement("slot");
        slot.name = "inset";
        slot.addEventListener("slotchange", () => this.positionInsets());
        insetSlotWrapper.appendChild(slot);

        container.appendChild(this.svg);
        this.shadow.appendChild(style);
        this.shadow.appendChild(container);
        this.shadow.appendChild(insetSlotWrapper);
        this.shadow.appendChild(this.tooltip);

        this.onResize = this.onResize.bind(this);
        window.addEventListener("resize", this.onResize);
    }

    connectedCallback() {
        if (this.hasAttribute("geojson")) {
            this.geojsonUrl = this.getAttribute("geojson") || this.geojsonUrl;
        }
        if (this.hasAttribute("default-fill")) {
            this.defaultFill = this.getAttribute("default-fill") || this.defaultFill;
        }
        this.loadAndRender();
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.onResize);
    }

    async loadAndRender() {
        try {
            const resp = await fetch(this.geojsonUrl);
            if (!resp.ok) throw new Error("GeoJSON fetch failed");
            const geo = await resp.json();
            this.features = geo.features ?? [];
            this.render();
        } catch (err) {
            console.error("WorldMap load error", err);
        }
    }

    clearSvg() {
        const countriesGroup = this.svg.querySelector("#countries");
        const labelsGroup = this.svg.querySelector("#labels");
        if (countriesGroup) countriesGroup.innerHTML = "";
        if (labelsGroup) labelsGroup.innerHTML = "";
    }

    render() {
        this.clearSvg();
        const countriesGroup = this.svg.querySelector("#countries")!;
        const labelsGroup = this.svg.querySelector("#labels")!;

        for (const f of this.features) {
            const name = f.properties.name;
            let id = f.properties?.["ISO3166-1-Alpha-2"];
            if (id === "-99" || !id) id = byCountryName[name.toString().toLocaleLowerCase()];
            if (!id) console.error("No country code for", name, { f });

            const geom = f.geometry;
            let pathD = "";
            if (!geom) continue;
            if (geom.type === "Polygon") {
                pathD = polygonToPath(geom.coordinates as number[][][]);
            } else if (geom.type === "MultiPolygon") {
                pathD = multiPolygonToPath(geom.coordinates as number[][][][]);
            } else {
                continue;
            }

            const path = document.createElementNS(SVG_NS, "path") as unknown as SVGPathElement;
            path.setAttribute("d", pathD);
            path.setAttribute("data-id", id);
            path.setAttribute("class", `country color${f.properties.mapcolor7}`);
            const fill = this.colors[id] ?? this.colors[f.properties?.ADMIN] ?? this.defaultFill;
            path.setAttribute("fill", fill);

            path.addEventListener("mouseenter", (ev) => {
                this.showTooltip(`${name} (${id})`, ev as MouseEvent);
            });
            path.addEventListener("mouseleave", () => {
                const fillNow = this.colors[id] ?? this.defaultFill;
                path.setAttribute("fill", fillNow);
                this.hideTooltip();
            });
            path.addEventListener("mousemove", (ev) => this.moveTooltip(ev as MouseEvent));
            path.addEventListener("click", () =>
                this.dispatchEvent(
                    new CustomEvent("country-click", {
                        detail: { feature: f, id, name, lang: langByCountryCode[id] },
                        bubbles: true,
                        composed: true,
                    })
                )
            );

            countriesGroup.appendChild(path);

            // label
            const centroidLonLat =
                geom.type === "Polygon"
                    ? computeCentroidOfCoords(geom.coordinates as number[][][])
                    : computeCentroidOfCoords((geom.coordinates as number[][][][])[0]);
            const [clon, clat] = centroidLonLat;
            const [cx, cy] = [clon, clat];
            const labelText = this.labels[id] ?? this.labels[f.properties?.ADMIN];
            if (labelText) {
                const text = document.createElementNS(SVG_NS, "text") as unknown as SVGTextElement;
                text.setAttribute("x", `${cx.toFixed(6)}`);
                text.setAttribute("y", `${cy.toFixed(6)}`);
                text.setAttribute("class", "label");
                text.textContent = labelText;
                labelsGroup.appendChild(text);
            }

            (path as any).__centroid = { lon: centroidLonLat[0], lat: centroidLonLat[1] };
        }

        this.positionInsets();
    }

    showTooltip(text: string, ev: MouseEvent) {
        this.tooltip.style.display = "block";
        this.tooltip.textContent = text;
        this.moveTooltip(ev);
    }

    moveTooltip(ev: MouseEvent) {
        const rect = this.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        this.tooltip.style.display = "none";
    }

    onResize() {
        this.positionInsets();
    }

    // API methods (unchanged)
    setGeoJSON(url: string) {
        this.geojsonUrl = url;
        this.loadAndRender();
    }
    setCountryColor(idOrName: string, color: string) {
        this.colors[idOrName] = color;
        this.updateCountryFill(idOrName);
    }
    setDefaultFill(color: string) {
        this.defaultFill = color;
        for (const path of Array.from(this.svg.querySelectorAll("path.country"))) {
            const id = path.getAttribute("data-id") || "";
            (path as SVGPathElement).setAttribute("fill", this.colors[id] ?? this.defaultFill);
        }
    }
    setCountryLabel(idOrName: string, text: string) {
        this.labels[idOrName] = text;
        this.render();
    }
    updateCountryFill(idOrName: string) {
        for (const path of Array.from(this.svg.querySelectorAll<SVGPathElement>("path.country"))) {
            const id = path.getAttribute("data-id") || "";
            if (id === idOrName) (path as SVGPathElement).setAttribute("fill", this.colors[id] ?? this.defaultFill);
        }
    }

    positionInsets() {
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({ flatten: true }) as HTMLElement[];
        if (!assigned.length) return;

        const viewBox = this.svg.viewBox.baseVal;
        const vbX = viewBox.x;
        const vbY = viewBox.y;
        const vbW = viewBox.width;
        const vbH = viewBox.height;

        const hostRect = this.getBoundingClientRect();

        for (const el of assigned) {
            (el as HTMLElement).style.pointerEvents = "auto";
            (el as HTMLElement).style.position = "absolute";
            const targetCountry = el.getAttribute("data-country");
            let px = NaN;
            let py = NaN;

            if (targetCountry) {
                // find centroid for country
                const path = this.svg.querySelector<SVGPathElement>(`path[data-id="${targetCountry}"]`);
                const c = path ? (path as any).__centroid : null;
                if (c) {
                    const [x, y] = [c.lon, -c.lat];
                    px = ((x - vbX) / vbW) * hostRect.width;
                    py = ((y - vbY) / vbH) * hostRect.height;
                }
            } else {
                const latAttr = el.getAttribute("data-lat");
                const lonAttr = el.getAttribute("data-lon");
                if (latAttr && lonAttr) {
                    const lon = parseFloat(lonAttr);
                    const lat = parseFloat(latAttr);
                    const [x, y] = [lon, -lat];
                    px = ((x - vbX) / vbW) * hostRect.width;
                    py = ((y - vbY) / vbH) * hostRect.height;
                }
            }

            if (Number.isFinite(px) && Number.isFinite(py)) {
                el.style.left = `${px}px`;
                el.style.top = `${py}px`;
            }
        }
    }
}

customElements.define("world-map", WorldMap);
