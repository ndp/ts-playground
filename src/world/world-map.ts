import {multiPolygonToPath, polygonToPath} from './polygon-to-path.js'
import {maybeFetchText} from './util.js'

const SVG_NS = "http://www.w3.org/2000/svg" as "http://www.w3.org/1999/xhtml";

export type CountryLabelMap = Record<string, string>;
type LabelResolverFunction = (iso: string, feature?: any) => string | null | Promise<string | null>;
type LabelResolver = LabelResolverFunction | 'name' | 'iso2' | 'iso3' | 'flag' | null;

const DEFAULT_GEOJSON_URL =
    "./custom.geo.json";

class WorldMap extends HTMLElement {
    shadow: ShadowRoot;
    static stylesheetPromise: Promise<string>;
    svg!: SVGSVGElement;
    tooltip!: HTMLDivElement;
    countriesGroup!: SVGGElement
    labelsGroup!: SVGGElement
    vbX = -180;
    vbY = -90;
    vbWidth = 360;
    vbHeight = 180;

    features: any[] = [];
    labels: CountryLabelMap = {};
    countryCentroids: Record<string, { lon: number; lat: number }> = {};

    // New: selection state and lookup maps
    private selectedCountryIso3: string | null = null; // stored as iso2 when possible

    // New: label resolver storage
    private labelResolver: LabelResolver = null;

    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

        const container = document.createElement("div");
        container.className = "map-container";

        this.svg = this.createSVGElement("svg") as unknown as SVGSVGElement;
        this.svg.setAttribute("viewBox", `${this.vbX} ${this.vbY} ${this.vbWidth} ${this.vbHeight}`);
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        this.countriesGroup = this.createSVGElement("g") as SVGGElement;
        this.countriesGroup.setAttribute("id", "countries");
        this.svg.appendChild(this.countriesGroup);

        this.labelsGroup = this.createSVGElement("g") as SVGGElement;
        this.labelsGroup.setAttribute("id", "labels");
        this.svg.appendChild(this.labelsGroup);

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
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(await WorldMap.stylesheetPromise)
        this.shadow.adoptedStyleSheets = [sheet]


        await this.loadAndRender();
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.onResize);
    }

    async loadAndRender() {
        try {
            const resp = await fetch(DEFAULT_GEOJSON_URL);
            if (!resp.ok) throw new Error("GeoJSON fetch failed");
            const geo = await resp.json();
            this.features = geo.features ?? [];
            await this.render();
        } catch (err) {
            console.error("WorldMap load error", err);
        }
    }

    clearSvg() {
        this.countriesGroup.innerHTML = "";
        this.labelsGroup.innerHTML = "";
    }

    async render() {
        this.clearSvg();

        for (const f of this.features) {
            const name = f.properties.name;
            const iso2 = f.properties?.iso_a2_eh ?? f.properties?.iso_a2 ?? null;
            const iso3 = f.properties?.iso_a3_eh ?? f.properties?.iso_a3 ?? null;

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

            const path = this.createSVGElement("path") as unknown as SVGPathElement;
            path.setAttribute("d", pathD);
            if (iso2) path.setAttribute("data-iso2", iso2);
            if (iso3) path.setAttribute("data-iso3", iso3);
            path.setAttribute("class", `country color${f.properties.mapcolor7} ${f.properties.subregion?.replace(/\s+/g, "-").toLowerCase() || ""}`);

            if (this.selectedCountryIso3 && this.selectedCountryIso3 === iso3) {
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
                        detail: {
                            feature: f,
                            iso2,
                            iso3,
                            name
                        },
                        bubbles: true,
                        composed: true
                    })
                )
            );

            this.countriesGroup.appendChild(path);

            const [clon, clat] = labelLonLat;
            const cx = labelLonLat[0];
            const cy = -labelLonLat[1]; // invert latitude for SVG Y

// Use resolver (priority: explicit labels map -> resolver -> none)
            const requestedKey = iso2 ?? f.properties?.ADMIN ?? null;
            const labelHtml = await this.resolveLabel(requestedKey, f);

            if (labelHtml) {
                // if resolver returned HTML (naive check), render via foreignObject to allow innerHTML
                const looksLikeHtml = /<\w+[^>]*>/.test(labelHtml);
                if (looksLikeHtml) {
                    const fo = this.createSVGElement("foreignObject") as unknown as SVGElement;
                    fo.setAttribute("x", `${cx.toFixed(6)}`);
                    fo.setAttribute("y", `${cy.toFixed(6)}`);
                    // a minimal width/height; callers can style via CSS
                    fo.setAttribute("width", "120");
                    fo.setAttribute("height", "24");
                    const div = document.createElement("div");
                    // ensure XHTML namespace for foreignObject child
                    div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                    div.className = "label-fo";
                    div.innerHTML = labelHtml;
                    (fo as any).appendChild(div);
                    this.labelsGroup.appendChild(fo);
                } else {
                    const text = this.createSVGElement("text") as unknown as SVGTextElement;
                    text.setAttribute("x", `${cx.toFixed(6)}`);
                    text.setAttribute("y", `${cy.toFixed(6)}`);
                    text.setAttribute("class", "label");
                    text.textContent = labelHtml;
                    this.labelsGroup.appendChild(text);
                }
                // helpful debug
                // console.log(`Label for ${name} (${iso2}/${iso3}): ${labelHtml}`);
            }

// record centroids for insets and lookups (store raw lon/lat)
            if (iso2) {
                this.countryCentroids[iso2] = {
                    lon: labelLonLat[0],
                    lat: labelLonLat[1]
                };
            }
            if (iso3) {
                this.countryCentroids[iso3] = {
                    lon: f.properties?.label_x ?? clon,
                    lat: f.properties?.label_y ?? clat
                };
            }
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

    deselectAllCountries() {
        [...this.svg.querySelectorAll('.selected')].forEach(e => e.classList.remove('selected'))
    }

    setSelectedCountry(iso3: string | null) {

        iso3 = iso3 ? iso3.trim().toUpperCase() : null;

        // if same selection, no-op
        if (this.selectedCountryIso3 === iso3) return;

        this.deselectAllCountries()

        this.selectedCountryIso3 = iso3;

        if (!iso3) return;

        const newPath = this.svg.querySelector<SVGPathElement>(`path.country[data-iso3="${iso3}"]`);
        if (!newPath) return; // throw?
        newPath.classList.add("selected");
        newPath.parentNode!.appendChild(newPath) // put it in the front

        this.dispatchEvent(new CustomEvent("country-selected", {
            detail: {selectedIso3: this.selectedCountryIso3},
            bubbles: true,
            composed: true
        }));
    }

    // New public API: setLabelResolver
    setLabelResolver(resolver: LabelResolver) {
        this.labelResolver = resolver;
        // re-render to pick up new labels; don't await in caller

        this.svg.classList[resolver === 'flag' ? 'add' : 'remove']('flag-labels');
        this.svg.classList[resolver === 'name' ? 'add' : 'remove']('tiny-labels');
        this.svg.classList[resolver === 'iso3' ? 'add' : 'remove']('small-labels');
        this.svg.classList[resolver === 'iso2' ? 'add' : 'remove']('med-labels');
        void this.render();
    }

// Resolve a label for a country using: explicit map -> resolver (fn or preset) -> null
    private async resolveLabel(key: string | null, feature?: any): Promise<string | null> {
        if (!key) return null;
        const isoKey = key.toUpperCase();

// 1) explicit labels map (allow both iso2 and ADMIN keys)
        if (this.labels[isoKey]) return this.labels[isoKey];
        if (this.labels[key]) return this.labels[key];

// 2) resolver function or preset
        if (typeof this.labelResolver === 'function') {
            try {
                const res = await (this.labelResolver as LabelResolverFunction)(isoKey, feature);
                if (res) return res;
            } catch (err) {
                console.error('label resolver error', err);
            }
        } else if (typeof this.labelResolver === 'string') {
            const preset = this.labelResolver;
            if (preset === 'name') {
                return feature?.properties?.name ?? null;
            } else if (preset === 'iso2') {
                return (feature?.properties?.iso_a2_eh ?? feature?.properties?.iso_a2 ?? isoKey) ?? null;
            } else if (preset === 'iso3') {
                return (feature?.properties?.iso_a3_eh ?? feature?.properties?.iso_a3 ?? null) ?? null;
            } else if (preset === 'flag') {
                if (isoKey.length === 2) {
                    const cp = [...isoKey].map(c => 127397 + c.charCodeAt(0));
                    return String.fromCodePoint(...cp);
                }
            }
        }

        return null;
    }

    positionInsets() {
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({flatten: true}) as HTMLElement[];
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
                console.log(`Positioning inset for country: ${targetCountry}`);
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


    createSVGElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
        return document.createElementNS(SVG_NS, tagName) as unknown as SVGElementTagNameMap[K];
    }
}

WorldMap.stylesheetPromise = maybeFetchText(new URL('../../src/world/world-map.css', import.meta.url))

customElements.define("world-map", WorldMap);

export default WorldMap;
