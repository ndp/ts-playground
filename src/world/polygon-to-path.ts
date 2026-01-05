// -function lonLatToXY(lon: number, lat: number, width: number, height: number) {
//     -    // simple equirectangular projection
//         -    const x = ((lon + 180) / 360) * width;
//     -    const y = ((90 - lat) / 180) * height;
//     -    return [x, y];
//     -}
export function polygonToPath(coords: number[][][]) {
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

export function multiPolygonToPath(coords: number[][][][]) {
    return coords.map((poly) => polygonToPath(poly)).join(" ");
}