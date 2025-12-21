const SVG_NS = "http://www.w3.org/2000/svg" as "http://www.w3.org/1999/xhtml";

export type CountryLabelMap = Record<string, string>;

import countryCodes from "./country-codes.json" with {type: "json"};

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
    const parts = coords.map((ring) => {
        return (
            ring
                .map((pt, i) => {
                    const lon = pt[0];
                    const lat = pt[1];
                    const x = lon;
                    const y = -lat; // invert latitude for SVG Y
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
    let sx = 0, sy = 0;
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
    vbX = -180;
    vbY = -90;
    vbWidth = 360;
    vbHeight = 180;

    geojsonUrl = DEFAULT_GEOJSON_URL;
    features: any[] = [];
    labels: CountryLabelMap = {};
    countryCentroids: Record<string, { lon: number; lat: number }> = {};

    // New: selection state and lookup maps
    private selectedCountryIso3: string | null = null; // stored as iso2 when possible
    private iso2ToIso3: Record<string, string> = {};
    private iso3ToIso2: Record<string, string> = {};

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        const container = document.createElement("div");
        container.className = "map-container";

        this.svg = document.createElementNS(SVG_NS, "svg") as unknown as SVGSVGElement;
        this.svg.setAttribute("viewBox", `${this.vbX} ${this.vbY} ${this.vbWidth} ${this.vbHeight}`);
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        const countriesGroup = document.createElementNS(SVG_NS, "g") as SVGGElement;
        countriesGroup.setAttribute("id", "countries");
        this.svg.appendChild(countriesGroup);

        const labelsGroup = document.createElementNS(SVG_NS, "g") as SVGGElement;
        labelsGroup.setAttribute("id", "labels");
        this.svg.appendChild(labelsGroup);

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
        this.shadow.appendChild(container);
        this.shadow.appendChild(insetSlotWrapper);
        this.shadow.appendChild(this.tooltip);

        this.onResize = this.onResize.bind(this);
        window.addEventListener("resize", this.onResize);
    }

    async connectedCallback() {
        if (this.hasAttribute("geojson")) {
            this.geojsonUrl = this.getAttribute("geojson") || this.geojsonUrl;
        }

        const sheet = new CSSStyleSheet()
        sheet.replaceSync(await WorldMap.stylesheetPromise)
        this.shadowRoot.adoptedStyleSheets = [sheet]


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

        // rebuild lookup maps each render
        this.iso2ToIso3 = {};
        this.iso3ToIso2 = {};

        for (const f of this.features) {
            const name = f.properties.name;
            const iso2 = f.properties?.iso_a2_eh ?? f.properties?.iso_a2 ?? null;
            const iso3 = f.properties?.iso_a3_eh ?? f.properties?.iso_a3 ?? null;
            if (iso2) this.iso2ToIso3[iso2] = iso3 ?? "";
            if (iso3) this.iso3ToIso2[iso3] = iso2 ?? "";

            const labelX = f.properties?.label_x;
            const labelY = f.properties?.label_y;
            const labelLonLat = [labelX, labelY];


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
            path.setAttribute("data-iso2", iso2);
            path.setAttribute("data-iso3", iso3);
            path.setAttribute("class", `country color${f.properties.mapcolor7} ${f.properties.subregion?.replace(/\s+/g, "-").toLowerCase() || ""}`);

            // apply selected visual if matches current selection
            if (this.selectedCountryIso3 && (this.selectedCountryIso3 === iso2 || this.selectedCountryIso3 === iso3)) {
                path.classList.add("selected");
            }

            path.addEventListener("mouseenter", (ev) => {
                this.showTooltip(`${name} (${iso2 ?? "?"}/${iso3 ?? "?"})`, ev as MouseEvent);
            });
            path.addEventListener("mouseleave", () => {
                this.hideTooltip();
            });
            path.addEventListener("mousemove", (ev) => this.moveTooltip(ev as MouseEvent));
            path.addEventListener("click", () =>
                this.dispatchEvent(
                    new CustomEvent("country-click", {
                        detail: {feature: f, iso2, iso3, name, lang: langByCountryCode[iso2]},
                        bubbles: true,
                        composed: true
                    })
                )
            );

            countriesGroup.appendChild(path);

            const [clon, clat] = labelLonLat;
            const cx = labelLonLat[0];
            const cy = -labelLonLat[1]; // invert latitude for SVG Y

            const labelText = this.labels[iso2] ?? this.labels[f.properties?.ADMIN];
            if (labelText) {
                const text = document.createElementNS(SVG_NS, "text") as unknown as SVGTextElement;
                text.setAttribute("x", `${cx.toFixed(6)}`);
                text.setAttribute("y", `${cy.toFixed(6)}`);
                text.setAttribute("class", "label");
                text.textContent = labelText;
                labelsGroup.appendChild(text);
                console.log(`Label for ${name} (${iso2}/${iso3}): ${labelText}`);
            }

            // record centroids for insets and lookups (store raw lon/lat)
            this.countryCentroids[iso2] = {
                lon: labelLonLat[0],
                lat: labelLonLat[1]
            };
            this.countryCentroids[iso3] = {
                lon: f.properties?.label_x ?? clon,
                lat: f.properties?.label_y ?? clat
            };
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

    setGeoJSON(url: string) {
        this.geojsonUrl = url;
        this.loadAndRender();
    }

    // New public API: set selected country (code may be iso2 or iso3). Pass null to clear.
    setSelectedCountry(iso3: string | null) {
        iso3 = iso3 ? iso3.trim().toUpperCase() : null;

        // if same selection, no-op
        if (this.selectedCountryIso3 === iso3) return;

        // clear previous
        if (this.selectedCountryIso3) {
            const prevPath = this.svg.querySelector<SVGPathElement>(`path.country[data-iso3="${this.selectedCountryIso3}"]`);
            if (prevPath)
                prevPath.classList.remove("selected");
        }


        this.selectedCountryIso3 = iso3;
        if (this.selectedCountryIso3) {
            const newPath = this.svg.querySelector<SVGPathElement>(`path.country[data-iso3="${this.selectedCountryIso3}"]`);
            if (newPath) newPath.classList.add("selected");
        }

        this.dispatchEvent(new CustomEvent("country-selected", {
            detail: {selectedIso3: this.selectedCountryIso3},
            bubbles: true,
            composed: true
        }));
    }

    getSelectedCountry(): string | null {
        return this.selectedCountryIso3;
    }

// TypeScript
    positionInsets() {
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({ flatten: true }) as HTMLElement[];
        if (!assigned.length) return;

        const hostRect = this.getBoundingClientRect();
        const svgCTM = this.svg.getScreenCTM();
        if (!svgCTM) return;

        for (const el of assigned) {
            (el as HTMLElement).style.pointerEvents = "auto";
            (el as HTMLElement).style.position = "absolute";

            const targetCountry = el.getAttribute("data-country");
            let lon: number | null = null;
            let lat: number | null = null;

            if (targetCountry) {
                const key = targetCountry.toUpperCase();
                const c = this.countryCentroids[key];
                if (c) {
                    lon = c.lon;
                    lat = c.lat;
                }
            } else {
                const latAttr = el.getAttribute("data-lat");
                const lonAttr = el.getAttribute("data-lon");
                if (latAttr && lonAttr) {
                    lon = parseFloat(lonAttr);
                    lat = parseFloat(latAttr);
                }
            }

            if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) continue;

            // convert SVG coordinate to screen coordinate
            // SVG Y is inverted in this coordinate system
            const pt = new DOMPoint(lon, -lat).matrixTransform(svgCTM);
            const px = pt.x - hostRect.left;
            const py = pt.y - hostRect.top;

            if (Number.isFinite(px) && Number.isFinite(py)) {
                el.style.left = `${px}px`;
                el.style.top = `${py}px`;
            }
        }
    }

    xpositionInsets() {
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({flatten: true}) as HTMLElement[];
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
                const key = targetCountry.toUpperCase();
                const c = this.countryCentroids[key];
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

WorldMap.stylesheetPromise = maybeFetchText(new URL('../../src/world/world-map.css', import.meta.url))


customElements.define("world-map", WorldMap);


export async function maybeFetchText(url) {
    try {
        const res = await fetch(url.href);
        if (res.ok)
            return await res.text();
    } catch (e) {
        // ignore and return empty
    }
    return '';
}