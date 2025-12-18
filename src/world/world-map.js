"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var DEFAULT_GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
function lonLatToXY(lon, lat, width, height) {
    // simple equirectangular projection
    var x = ((lon + 180) / 360) * width;
    var y = ((90 - lat) / 180) * height;
    return [x, y];
}
function polygonToPath(coords, width, height) {
    // coords: [ [ [lon,lat], ... ], [hole1], ... ] for a single Polygon
    var parts = coords.map(function (ring) {
        return ring
            .map(function (pt, i) {
            var _a = lonLatToXY(pt[0], pt[1], width, height), x = _a[0], y = _a[1];
            return "".concat(i === 0 ? "M" : "L", " ").concat(x.toFixed(2), " ").concat(y.toFixed(2));
        })
            .join(" ") + " Z";
    });
    return parts.join(" ");
}
function multiPolygonToPath(coords, width, height) {
    return coords.map(function (poly) { return polygonToPath(poly, width, height); }).join(" ");
}
function computeCentroidOfCoords(coords) {
    var _a;
    // coords from a polygon: use simple average of points of the largest ring
    var ring = (_a = coords[0]) !== null && _a !== void 0 ? _a : [];
    if (ring.length === 0)
        return [0, 0];
    var sx = 0, sy = 0;
    for (var _i = 0, ring_1 = ring; _i < ring_1.length; _i++) {
        var _b = ring_1[_i], lon = _b[0], lat = _b[1];
        sx += lon;
        sy += lat;
    }
    return [sx / ring.length, sy / ring.length];
}
var WorldMap = /** @class */ (function (_super) {
    __extends(WorldMap, _super);
    function WorldMap() {
        var _this = _super.call(this) || this;
        _this.width = 960;
        _this.height = 480;
        _this.geojsonUrl = DEFAULT_GEOJSON_URL;
        _this.features = [];
        _this.colors = {};
        _this.labels = {};
        _this.defaultFill = "#d9d9d9";
        _this.highlightFill = "#ffcc00";
        _this.shadow = _this.attachShadow({ mode: "open" });
        var style = document.createElement("style");
        style.textContent = "\n      :host { display: block; position: relative; user-select: none; }\n      .map-container { position: relative; width: 100%; max-width: 100%; }\n      svg { width: 100%; height: auto; display: block; }\n      .country { stroke: #333; stroke-width: 0.3; cursor: pointer; transition: fill .12s, opacity .12s; }\n      .country:hover { opacity: 0.9; filter: brightness(0.95); }\n      .label { font: 10px sans-serif; pointer-events: none; fill: #111; text-anchor: middle; }\n      .tooltip { position: absolute; pointer-events: none; background: rgba(0,0,0,0.75); color: white; padding: 4px 6px; border-radius: 3px; font: 12px sans-serif; transform: translate(-50%, -120%); white-space: nowrap; display: none; z-index: 10; }\n      .inset-slot ::slotted(*) { position: absolute; transform: translate(-50%, -50%); }\n    ";
        var container = document.createElement("div");
        container.className = "map-container";
        _this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        _this.svg.setAttribute("viewBox", "0 0 ".concat(_this.width, " ").concat(_this.height));
        _this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        // group for countries and labels
        var countriesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        countriesGroup.setAttribute("id", "countries");
        _this.svg.appendChild(countriesGroup);
        var labelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        labelsGroup.setAttribute("id", "labels");
        _this.svg.appendChild(labelsGroup);
        // tooltip in shadow
        _this.tooltip = document.createElement("div");
        _this.tooltip.className = "tooltip";
        // slot for insets
        var insetSlotWrapper = document.createElement("div");
        insetSlotWrapper.className = "inset-slot";
        insetSlotWrapper.style.position = "absolute";
        insetSlotWrapper.style.top = "0";
        insetSlotWrapper.style.left = "0";
        insetSlotWrapper.style.right = "0";
        insetSlotWrapper.style.bottom = "0";
        insetSlotWrapper.style.pointerEvents = "none";
        var slot = document.createElement("slot");
        slot.name = "inset";
        slot.addEventListener("slotchange", function () { return _this.positionInsets(); });
        insetSlotWrapper.appendChild(slot);
        container.appendChild(_this.svg);
        _this.shadow.appendChild(style);
        _this.shadow.appendChild(container);
        _this.shadow.appendChild(insetSlotWrapper);
        _this.shadow.appendChild(_this.tooltip);
        _this.onResize = _this.onResize.bind(_this);
        window.addEventListener("resize", _this.onResize);
        return _this;
    }
    WorldMap.prototype.connectedCallback = function () {
        if (this.hasAttribute("geojson")) {
            this.geojsonUrl = this.getAttribute("geojson") || this.geojsonUrl;
        }
        if (this.hasAttribute("default-fill")) {
            this.defaultFill = this.getAttribute("default-fill") || this.defaultFill;
        }
        this.loadAndRender();
    };
    WorldMap.prototype.disconnectedCallback = function () {
        window.removeEventListener("resize", this.onResize);
    };
    WorldMap.prototype.attributeChangedCallback = function () { };
    WorldMap.prototype.loadAndRender = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var resp, geo, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch(this.geojsonUrl)];
                    case 1:
                        resp = _b.sent();
                        if (!resp.ok)
                            throw new Error("GeoJSON fetch failed");
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        geo = _b.sent();
                        // expect FeatureCollection
                        this.features = (_a = geo.features) !== null && _a !== void 0 ? _a : [];
                        this.render();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _b.sent();
                        console.error("WorldMap load error", err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WorldMap.prototype.clearSvg = function () {
        var countriesGroup = this.svg.querySelector("#countries");
        var labelsGroup = this.svg.querySelector("#labels");
        countriesGroup.innerHTML = "";
        labelsGroup.innerHTML = "";
    };
    WorldMap.prototype.render = function () {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.clearSvg();
        var countriesGroup = this.svg.querySelector("#countries");
        var labelsGroup = this.svg.querySelector("#labels");
        var bbox = this.getBoundingClientRect();
        var width = this.width;
        var height = this.height;
        var _loop_1 = function (f) {
            var id = (_e = (_c = (_a = f.id) !== null && _a !== void 0 ? _a : (_b = f.properties) === null || _b === void 0 ? void 0 : _b.iso_a3) !== null && _c !== void 0 ? _c : (_d = f.properties) === null || _d === void 0 ? void 0 : _d.ADMIN) !== null && _e !== void 0 ? _e : Math.random().toString(36).slice(2);
            var geom = f.geometry;
            var pathD = "";
            if (!geom)
                return "continue";
            if (geom.type === "Polygon") {
                pathD = polygonToPath(geom.coordinates, width, height);
            }
            else if (geom.type === "MultiPolygon") {
                pathD = multiPolygonToPath(geom.coordinates, width, height);
            }
            else {
                return "continue";
            }
            var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathD);
            path.setAttribute("data-id", id);
            path.setAttribute("class", "country");
            var fill = (_h = (_f = this_1.colors[id]) !== null && _f !== void 0 ? _f : this_1.colors[(_g = f.properties) === null || _g === void 0 ? void 0 : _g.ADMIN]) !== null && _h !== void 0 ? _h : this_1.defaultFill;
            path.setAttribute("fill", fill);
            // event handlers
            path.addEventListener("mouseenter", function (ev) {
                var _a;
                path.setAttribute("fill", _this.highlightFill);
                _this.showTooltip(((_a = f.properties) === null || _a === void 0 ? void 0 : _a.ADMIN) || id, ev);
            });
            path.addEventListener("mouseleave", function () {
                var _a;
                var fillNow = (_a = _this.colors[id]) !== null && _a !== void 0 ? _a : _this.defaultFill;
                path.setAttribute("fill", fillNow);
                _this.hideTooltip();
            });
            path.addEventListener("mousemove", function (ev) {
                _this.moveTooltip(ev);
            });
            path.addEventListener("click", function () {
                _this.dispatchEvent(new CustomEvent("country-click", { detail: { feature: f }, bubbles: true, composed: true }));
            });
            countriesGroup.appendChild(path);
            // label
            var centroidLonLat = geom.type === "Polygon"
                ? computeCentroidOfCoords(geom.coordinates)
                : computeCentroidOfCoords(geom.coordinates[0]);
            var clon = centroidLonLat[0], clat = centroidLonLat[1];
            var _m = lonLatToXY(clon, clat, width, height), cx = _m[0], cy = _m[1];
            var labelText = (_j = this_1.labels[id]) !== null && _j !== void 0 ? _j : this_1.labels[(_k = f.properties) === null || _k === void 0 ? void 0 : _k.ADMIN];
            if (labelText) {
                var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", "".concat(cx.toFixed(2)));
                text.setAttribute("y", "".concat(cy.toFixed(2)));
                text.setAttribute("class", "label");
                text.textContent = labelText;
                labelsGroup.appendChild(text);
            }
            // save centroid for positioning insets later
            path.__centroid = { lon: centroidLonLat[0], lat: centroidLonLat[1] };
        };
        var this_1 = this;
        for (var _i = 0, _l = this.features; _i < _l.length; _i++) {
            var f = _l[_i];
            _loop_1(f);
        }
        this.positionInsets();
    };
    WorldMap.prototype.showTooltip = function (text, ev) {
        this.tooltip.style.display = "block";
        this.tooltip.textContent = text;
        this.moveTooltip(ev);
    };
    WorldMap.prototype.moveTooltip = function (ev) {
        var rect = this.getBoundingClientRect();
        var x = ev.clientX - rect.left;
        var y = ev.clientY - rect.top;
        this.tooltip.style.left = "".concat(x, "px");
        this.tooltip.style.top = "".concat(y, "px");
    };
    WorldMap.prototype.hideTooltip = function () {
        this.tooltip.style.display = "none";
    };
    WorldMap.prototype.onResize = function () {
        // nothing heavy for now; keep for future improvements
    };
    // API methods
    WorldMap.prototype.setGeoJSON = function (url) {
        this.geojsonUrl = url;
        this.loadAndRender();
    };
    WorldMap.prototype.setCountryColor = function (idOrName, color) {
        this.colors[idOrName] = color;
        this.updateCountryFill(idOrName);
    };
    WorldMap.prototype.setDefaultFill = function (color) {
        var _a;
        this.defaultFill = color;
        // reapply fills
        for (var _i = 0, _b = Array.from(this.svg.querySelectorAll("path.country")); _i < _b.length; _i++) {
            var path = _b[_i];
            var id = path.getAttribute("data-id") || "";
            path.setAttribute("fill", (_a = this.colors[id]) !== null && _a !== void 0 ? _a : this.defaultFill);
        }
    };
    WorldMap.prototype.setCountryLabel = function (idOrName, text) {
        this.labels[idOrName] = text;
        this.render(); // quick re-render to add label
    };
    WorldMap.prototype.updateCountryFill = function (idOrName) {
        var _a;
        for (var _i = 0, _b = Array.from(this.svg.querySelectorAll("path.country")); _i < _b.length; _i++) {
            var path = _b[_i];
            var id = path.getAttribute("data-id") || "";
            if (id === idOrName) {
                path.setAttribute("fill", (_a = this.colors[id]) !== null && _a !== void 0 ? _a : this.defaultFill);
            }
        }
    };
    WorldMap.prototype.positionInsets = function () {
        // position slotted elements (slot name="inset" expected)
        var slot = this.shadow.querySelector('slot[name="inset"]');
        if (!slot)
            return;
        var assigned = slot.assignedElements({ flatten: true });
        if (!assigned.length)
            return;
        var svgRect = this.svg.getBoundingClientRect();
        var viewBox = this.svg.viewBox.baseVal;
        var width = viewBox.width;
        var height = viewBox.height;
        // map country id -> centroid pixel in SVG coordinates (0..width, 0..height)
        var centroids = {};
        for (var _i = 0, _a = Array.from(this.svg.querySelectorAll("path.country")); _i < _a.length; _i++) {
            var path = _a[_i];
            var id = path.getAttribute("data-id") || "";
            var c = path.__centroid;
            if (!c)
                continue;
            var _b = lonLatToXY(c.lon, c.lat, width, height), x = _b[0], y = _b[1];
            // convert to percent of svg since slotted children are absolutely positioned inside overlay wrapper sized to host
            centroids[id] = { x: x, y: y };
        }
        // host bounding to map svg coords to overlay pixel coordinates
        var hostRect = this.getBoundingClientRect();
        var sx = hostRect.width / width;
        var sy = (hostRect.width * (height / width)) / height; // maintain aspect ratio; simpler: use sx
        var scale = hostRect.width / width;
        for (var _c = 0, assigned_1 = assigned; _c < assigned_1.length; _c++) {
            var el = assigned_1[_c];
            // pointer-events should be allowed for insets
            el.style.pointerEvents = "auto";
            el.style.position = "absolute";
            var targetCountry = el.getAttribute("data-country");
            if (targetCountry && centroids[targetCountry]) {
                var c = centroids[targetCountry];
                var left = (c.x / width) * hostRect.width;
                var top_1 = (c.y / height) * (hostRect.width * (height / width));
                el.style.left = "".concat(left, "px");
                el.style.top = "".concat(top_1, "px");
            }
            else {
                // optional coordinates
                var latAttr = el.getAttribute("data-lat");
                var lonAttr = el.getAttribute("data-lon");
                if (latAttr && lonAttr) {
                    var lon = parseFloat(lonAttr);
                    var lat = parseFloat(latAttr);
                    var _d = lonLatToXY(lon, lat, width, height), x = _d[0], y = _d[1];
                    var left = (x / width) * hostRect.width;
                    var top_2 = (y / height) * (hostRect.width * (height / width));
                    el.style.left = "".concat(left, "px");
                    el.style.top = "".concat(top_2, "px");
                }
            }
        }
    };
    return WorldMap;
}(HTMLElement));
customElements.define("world-map", WorldMap);
