// File: src/components/world-map.ts
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
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

function lonLatToXY(lon: number, lat: number, width: number, height: number) {
    // simple equirectangular projection
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
}

function polygonToPath(coords: number[][][], width: number, height: number) {
    // coords: [ [ [lon,lat], ... ], [hole1], ... ] for a single Polygon
    const parts = coords.map((ring) => {
        return ring
            .map((pt, i) => {
                const [x, y] = lonLatToXY(pt[0], pt[1], width, height);
                return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ") + " Z";
    });
    return parts.join(" ");
}

function multiPolygonToPath(coords: number[][][][], width: number, height: number) {
    return coords.map((poly) => polygonToPath(poly, width, height)).join(" ");
}

function computeCentroidOfCoords(coords: number[][][]): [number, number] {
    // coords from a polygon: use simple average of points of the largest ring
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
    width = 960;
    height = 480;
    geojsonUrl = DEFAULT_GEOJSON_URL;
    features: any[] = [];
    colors: CountryColorMap = {};
    labels: CountryLabelMap = {};
    defaultFill = "forestgreen";
    highlightFill = "#ffcc00";
    oceanFill = "#a4c8e1";

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        const style = document.createElement("style");
        style.textContent = `
      :host { display: block; position: relative; user-select: none; }
      .map-container { position: relative; width: 100%; max-width: 100%; }
      svg { width: 100%; height: auto; display: block; background-color: ${this.oceanFill}; }
      .country { stroke: #333; stroke-width: 0.3; cursor: pointer; opacity: 0.5; transition: fill .012s, opacity .012s; }
      .country:hover { stroke: #000; opacity: 0.9; filter: brightness(0.95); }}"
      .label { font: 10px sans-serif; pointer-events: none; fill: #111; text-anchor: middle; }
      .tooltip { position: absolute; pointer-events: none; background: rgba(0,0,0,0.75); color: white; padding: 4px 6px; border-radius: 3px; font: 12px sans-serif; transform: translate(-50%, -120%); white-space: nowrap; display: none; z-index: 10; }
      .inset-slot ::slotted(*) { position: absolute; transform: translate(-50%, -50%); }
    `;

        const container = document.createElement("div");
        container.className = "map-container";

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // group for countries and labels
        const countriesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        countriesGroup.setAttribute("id", "countries");
        this.svg.appendChild(countriesGroup);

        const labelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        labelsGroup.setAttribute("id", "labels");
        this.svg.appendChild(labelsGroup);

        // tooltip in shadow
        this.tooltip = document.createElement("div");
        this.tooltip.className = "tooltip";

        // slot for insets
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

    attributeChangedCallback() {
    }

    async loadAndRender() {
        try {
            const resp = await fetch(this.geojsonUrl);
            if (!resp.ok) throw new Error("GeoJSON fetch failed");
            const geo = await resp.json();
            // expect FeatureCollection
            this.features = geo.features ?? [];
            this.render();
        } catch (err) {
            console.error("WorldMap load error", err);
        }
    }

    clearSvg() {
        const countriesGroup = this.svg.querySelector("#countries");
        const labelsGroup = this.svg.querySelector("#labels");
        countriesGroup!.innerHTML = "";
        labelsGroup!.innerHTML = "";
    }

    render() {
        this.clearSvg();
        const countriesGroup = this.svg.querySelector("#countries")!;
        const labelsGroup = this.svg.querySelector("#labels")!;

        const bbox = this.getBoundingClientRect();
        const width = this.width;
        const height = this.height;

        for (const f of this.features) {
            const name = f.properties.name
            let id
            if (f.properties['ISO3166-1-Alpha-2'] !== '-99')
                id = f.properties['ISO3166-1-Alpha-2'];
            if (!id) {
                id = byCountryName[name.toString().toLocaleLowerCase()]
            }
            if (!id) console.error("No country code for", name, {f});
            const geom = f.geometry;
            let pathD = "";
            if (!geom) continue;
            if (geom.type === "Polygon") {
                pathD = polygonToPath(geom.coordinates as number[][][], width, height);
            } else if (geom.type === "MultiPolygon") {
                pathD = multiPolygonToPath(geom.coordinates as number[][][][], width, height);
            } else {
                continue;
            }
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathD);
            path.setAttribute("data-id", id);
            path.setAttribute("class", "country");
            const fill = this.colors[id] ?? this.colors[f.properties?.ADMIN] ?? this.defaultFill;
            path.setAttribute("fill", fill);

            // event handlers
            path.addEventListener("mouseenter", (ev) => {
                //path.setAttribute("fill", this.highlightFill);
                this.showTooltip(`${name} (${id})`, ev as MouseEvent);
            });
            path.addEventListener("mouseleave", () => {
                const fillNow = this.colors[id] ?? this.defaultFill;
                path.setAttribute("fill", fillNow);
                this.hideTooltip();
            });
            path.addEventListener("mousemove", (ev) => {
                this.moveTooltip(ev as MouseEvent);
            });
            path.addEventListener("click", () => {
                this.dispatchEvent(new CustomEvent("country-click", {
                    detail: {feature: f, id, name, lang: langByCountryCode[id]},
                    bubbles: true,
                    composed: true
                }));
            });

            countriesGroup.appendChild(path);

            // label
            const centroidLonLat =
                geom.type === "Polygon"
                    ? computeCentroidOfCoords(geom.coordinates as number[][][])
                    : computeCentroidOfCoords((geom.coordinates as number[][][][])[0]);
            const [clon, clat] = centroidLonLat;
            const [cx, cy] = lonLatToXY(clon, clat, width, height);
            const labelText = this.labels[id] ?? this.labels[f.properties?.ADMIN];
            if (labelText) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", `${cx.toFixed(2)}`);
                text.setAttribute("y", `${cy.toFixed(2)}`);
                text.setAttribute("class", "label");
                text.textContent = labelText;
                labelsGroup.appendChild(text);
            }

            // save centroid for positioning insets later
            (path as any).__centroid = {lon: centroidLonLat[0], lat: centroidLonLat[1]};
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
        // nothing heavy for now; keep for future improvements
    }

    // API methods

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
        // reapply fills
        for (const path of Array.from(this.svg.querySelectorAll("path.country"))) {
            const id = path.getAttribute("data-id") || "";
            (path as SVGPathElement).setAttribute("fill", this.colors[id] ?? this.defaultFill);
        }
    }

    setCountryLabel(idOrName: string, text: string) {
        this.labels[idOrName] = text;
        this.render(); // quick re-render to add label
    }

    updateCountryFill(idOrName: string) {
        for (const path of Array.from(this.svg.querySelectorAll<SVGPathElement>("path.country"))) {
            const id = path.getAttribute("data-id") || "";
            if (id === idOrName) {
                (path as SVGPathElement).setAttribute("fill", this.colors[id] ?? this.defaultFill);
            }
        }
    }

    positionInsets() {
        // position slotted elements (slot name="inset" expected)
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({flatten: true}) as HTMLElement[];
        if (!assigned.length) return;

        const svgRect = this.svg.getBoundingClientRect();
        const viewBox = this.svg.viewBox.baseVal;
        const width = viewBox.width;
        const height = viewBox.height;

        // map country id -> centroid pixel in SVG coordinates (0..width, 0..height)
        const centroids: Record<string, { x: number; y: number }> = {};
        for (const path of Array.from(this.svg.querySelectorAll<SVGPathElement>("path.country"))) {
            const id = path.getAttribute("data-id") || "";
            const c = (path as any).__centroid;
            if (!c) continue;
            const [x, y] = lonLatToXY(c.lon, c.lat, width, height);
            // convert to percent of svg since slotted children are absolutely positioned inside overlay wrapper sized to host
            centroids[id] = {x, y};
        }

        // host bounding to map svg coords to overlay pixel coordinates
        const hostRect = this.getBoundingClientRect();
        const sx = hostRect.width / width;
        const sy = (hostRect.width * (height / width)) / height; // maintain aspect ratio; simpler: use sx
        const scale = hostRect.width / width;

        for (const el of assigned) {
            // pointer-events should be allowed for insets
            (el as HTMLElement).style.pointerEvents = "auto";
            (el as HTMLElement).style.position = "absolute";
            const targetCountry = el.getAttribute("data-country");
            if (targetCountry && centroids[targetCountry]) {
                const c = centroids[targetCountry];
                const left = (c.x / width) * hostRect.width;
                const top = (c.y / height) * (hostRect.width * (height / width));
                el.style.left = `${left}px`;
                el.style.top = `${top}px`;
            } else {
                // optional coordinates
                const latAttr = el.getAttribute("data-lat");
                const lonAttr = el.getAttribute("data-lon");
                if (latAttr && lonAttr) {
                    const lon = parseFloat(lonAttr);
                    const lat = parseFloat(latAttr);
                    const [x, y] = lonLatToXY(lon, lat, width, height);
                    const left = (x / width) * hostRect.width;
                    const top = (y / height) * (hostRect.width * (height / width));
                    el.style.left = `${left}px`;
                    el.style.top = `${top}px`;
                }
            }
        }
    }
}

customElements.define("world-map", WorldMap);
