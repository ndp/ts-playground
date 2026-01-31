import {multiPolygonToPath, polygonToPath} from './polygon-to-path.js'
import {maybeFetchText} from './util.js'

const SVG_NS = "http://www.w3.org/2000/svg" as "http://www.w3.org/1999/xhtml";

export type CountryLabelMap = Record<string, string>;
type LabelResolverFunction = (iso: string) => string | null | Promise<string | null>;
type LabelResolver = LabelResolverFunction | 'name' | 'iso2' | 'iso3' | 'flag' | null;

type CountryInfo = {
    name: string;
    iso2: string;
    iso3: string;
    labelX: number;
    labelY: number;
    label: { lon: number; lat: number }
    geometry: {
        type: string;
        coordinates: number[][][] | number[][][][];
    };
    properties: {
        mapcolor7: string;
        subregion: string;
    };
}

type BuildCountryOptions = {
    tooltip: string;
} & CountryInfo;

type CountriesInfo = Record<string, CountryInfo>


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

    labels: CountryLabelMap = {};

    private countries: CountriesInfo = {};
    private selectedCountryIso2: string | null = null;

    // New: label resolver storage
    private labelResolver: LabelResolver = null;
    private isDataLoaded = false

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

    async dataLoaded() {
        this.isDataLoaded = this.isDataLoaded ?? this.ensureDataLoaded();
        return this.isDataLoaded;
    }

    async ensureDataLoaded() {
        if (Object.keys(this.countries).length === 0) {
            await this.load();
        }
        return true
    }

    async load() {
        try {
            const resp = await fetch(DEFAULT_GEOJSON_URL);
            if (!resp.ok) throw new Error("GeoJSON fetch failed");
            const geo = await resp.json();
            for (const f of geo.features) {
                const record = {
                    name: f.properties.name,
                    iso2: f.properties?.iso_a2_eh ?? f.properties?.iso_a2 ?? null,
                    iso3: f.properties?.iso_a3_eh ?? f.properties?.iso_a3 ?? null,
                    labelX: f.properties?.label_x,
                    labelY: f.properties?.label_y,
                    label: {
                        lon: f.properties?.label_x,
                        lat: f.properties?.label_y
                    },
                    geometry: f.geometry,
                    properties: f.properties
                }
                this.countries[record.iso2] = record;
            }

        } catch (err) {
            console.error("WorldMap load error", err);
        }
    }

    async loadAndRender() {
        await this.load()
        await this.render()
    }

    clearSvg() {
        this.countriesGroup.innerHTML = "";
        this.labelsGroup.innerHTML = "";
    }

    async render() {
        this.clearSvg();
        this.renderCountriesGroup()
        this.renderCountryLabels()
        this.positionInsets();
    }


    async renderCountriesGroup() {
        this.countriesGroup.innerHTML = "";
        for (const iso2 in this.countries) {
            const country = this.countries[iso2]
            const path = this.buildCountryPath({
                ...country,
                tooltip: `${(country.name)}`
            })
            if (!path) console.error(`Failed to build path for country: ${(country.name)} (${iso2}/${(country.iso3)})`);
            if (!path) continue

            this.countriesGroup.appendChild(path);
        }
    }

    async renderCountryLabels() {
        this.labelsGroup.innerHTML = "";
        for (const iso2 in this.countries) {
            const country = this.countries[iso2]

            const countryLabel = await this.buildCountryLabel(country);
            if (countryLabel)
                this.labelsGroup.appendChild(countryLabel)

        }
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

    selectCountry(iso2: string | null) {
        // if same selection, no-op
        if (this.selectedCountryIso2 === iso2) return;

        this.deselectAllCountries()

        this.selectedCountryIso2 = iso2;

        if (!iso2) return;

        this.showSelectedCountry(iso2)

        this.dispatchEvent(new CustomEvent("country-selected", {
            detail: {iso2: this.selectedCountryIso2},
            bubbles: true,
            composed: true
        }));
    }

    showSelectedCountry(iso2: string) {
        const newPath = this.svg.querySelector<SVGPathElement>(`path.country[data-iso2="${iso2}"]`);
        if (!newPath) return; // throw?
        newPath.classList.add("selected");
        newPath.parentNode!.appendChild(newPath) // put it in the front
    }

    // New public API: setLabelResolver
    setLabelResolver(resolver: LabelResolver) {
        this.labelResolver = resolver;
        // re-render to pick up new labels; don't await in caller

        this.svg.classList[resolver === 'flag' ? 'add' : 'remove']('flag-labels');
        this.svg.classList[resolver === 'name' ? 'add' : 'remove']('tiny-labels');
        this.svg.classList[resolver === 'iso3' ? 'add' : 'remove']('small-labels');
        this.svg.classList[resolver === 'iso2' ? 'add' : 'remove']('med-labels');
        void this.renderCountryLabels();
    }

// Resolve a label for a country using: explicit map -> resolver (fn or preset) -> null
    private async resolveLabel({iso2, iso3, name}: {
        iso2: string,
        iso3: string,
        name: string
    }): Promise<string | null> {
        if (!iso2) return null;

        if (this.labels[iso2]) return this.labels[iso2];

// 2) resolver function or preset
        if (this.labelResolver === null) return null
        if (this.labelResolver === 'name') {
            return name
        } else if (this.labelResolver === 'iso2') {
            return iso2;
        } else if (this.labelResolver === 'iso3') {
            return iso3;
        } else if (this.labelResolver === 'flag') {
            if (iso2.length === 2) {
                const cp = [...iso2].map(c => 127397 + c.charCodeAt(0));
                return String.fromCodePoint(...cp);
            }
        } else {
            try {
                const res = await this.labelResolver(iso2);
                if (res) return res;
            } catch (err) {
                console.error('label resolver error', err);
            }
        }

        return null;
    }

    async positionInsets() {
        await this.dataLoaded()
        const slot = this.shadow.querySelector('slot[name="inset"]') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({flatten: true}) as HTMLElement[];
        if (!assigned.length) return;

        const hostRect = this.getBoundingClientRect();
        const svgCTM = this.svg.getScreenCTM();
        if (!svgCTM) return;

        for (const el of assigned) {

            const targetCountry = el.getAttribute("data-country");
            let lon: number | null = null;
            let lat: number | null = null;
            //console.log(`Positioning inset for element:`, el, `targetCountry=${targetCountry}`);
            if (targetCountry) {
                //console.log(`Positioning inset for country: ${targetCountry}`);
                const c = this.countries[targetCountry]?.label;
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
                el.style.setProperty('--x', `${px}px`);
                el.style.setProperty('--y', `${py}px`);
            }
        }
    }


    createSVGElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
        return document.createElementNS(SVG_NS, tagName) as unknown as SVGElementTagNameMap[K];
    }


    buildCountryPath({iso2, iso3, geometry, properties, tooltip}: BuildCountryOptions) {
        let pathD = "";
        if (geometry.type === "Polygon") {
            pathD = polygonToPath(geometry.coordinates as number[][][]);
        } else if (geometry.type === "MultiPolygon") {
            pathD = multiPolygonToPath(geometry.coordinates as number[][][][]);
        } else {
            return null
        }

        const path = this.createSVGElement("path") as unknown as SVGPathElement;
        path.setAttribute("d", pathD);
        if (iso2) path.setAttribute("data-iso2", iso2);
        if (iso3) path.setAttribute("data-iso3", iso3);
        path.setAttribute("class", `country color${properties.mapcolor7} ${properties.subregion?.replace(/\s+/g, "-").toLowerCase() || ""}`);

        // if (this.selectedCountryIso2 && this.selectedCountryIso2 === iso3) {
        //     path.classList.add("selected");
        //     path.parentNode!.appendChild(path) // put it in the front
        // }

        path.addEventListener("mouseenter", (ev) => {
            this.showTooltip(tooltip, ev as MouseEvent);
        });
        path.addEventListener("mouseleave", () => {
            this.hideTooltip();
        });
        path.addEventListener("mousemove", (ev) => this.moveTooltip(ev as MouseEvent));
        path.addEventListener("click", () =>
            this.dispatchEvent(
                new CustomEvent("country-click", {
                    detail: {
                        iso2,
                        iso3,
                        selected: this.selectedCountryIso2 === iso2
                    },
                    bubbles: true,
                    composed: true
                })
            )
        );
        return path
    }


    async buildCountryLabel({iso2, iso3, name, labelX, labelY}: {
        iso2: string,
        iso3: string,
        name: string,
        labelX: number,
        labelY: number
    }): Promise<SVGElement | null> {
        const labelHtml = await this.resolveLabel({iso2, iso3, name});

        if (!labelHtml) return null

        // if resolver returned HTML (naive check), render via foreignObject to allow innerHTML
        const looksLikeHtml = /<\w+[^>]*>/.test(labelHtml);
        if (looksLikeHtml) {
            const fo = this.createSVGElement("foreignObject") as unknown as SVGElement;
            fo.setAttribute("x", `${labelX.toFixed(6)}`);
            fo.setAttribute("y", `${-labelY.toFixed(6)}`);
            // a minimal width/height; callers can style via CSS
            fo.setAttribute("width", "120");
            fo.setAttribute("height", "24");
            const div = document.createElement("div");
            // ensure XHTML namespace for foreignObject child
            div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            div.className = "label-fo";
            div.innerHTML = labelHtml;
            (fo as any).appendChild(div);
            return fo;
        } else {
            const text = this.createSVGElement("text") as unknown as SVGTextElement;
            text.setAttribute("x", `${labelX.toFixed(6)}`);
            text.setAttribute("y", `${-labelY.toFixed(6)}`);
            text.setAttribute("class", "label");
            text.textContent = labelHtml;
            return text;
        }

    }

}


WorldMap.stylesheetPromise = maybeFetchText(new URL('../../src/world/world-map.css', import.meta.url))

customElements.define("world-map", WorldMap);

export default WorldMap;

