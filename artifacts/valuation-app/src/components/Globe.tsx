import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import GlobeGl from "react-globe.gl";

class GlobeErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Globe failed to render:", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export type Deal = {
  id: string;
  asset: string;
  category: string;
  city: string;
  country: string;
  price: string;
  lat: number;
  lng: number;
  buyerCity: string;
  buyerLat: number;
  buyerLng: number;
};

export const DEALS: Deal[] = [
  { id: "d1", asset: "Rolex Submariner 116610LN", category: "Watch", city: "Geneva", country: "Switzerland", price: "CHF 13,400", lat: 46.2, lng: 6.14, buyerCity: "Hong Kong", buyerLat: 22.3, buyerLng: 114.17 },
  { id: "d2", asset: "Hermès Birkin 30 Togo", category: "Handbag", city: "Paris", country: "France", price: "€18,500", lat: 48.85, lng: 2.35, buyerCity: "New York", buyerLat: 40.71, buyerLng: -74.0 },
  { id: "d3", asset: "Patek Philippe Nautilus", category: "Watch", city: "Tokyo", country: "Japan", price: "¥4.6M", lat: 35.68, lng: 139.69, buyerCity: "Singapore", buyerLat: 1.35, buyerLng: 103.81 },
  { id: "d4", asset: "Cessna 172 Skyhawk", category: "Aircraft", city: "Dallas", country: "USA", price: "$84,200", lat: 32.78, lng: -96.8, buyerCity: "São Paulo", buyerLat: -23.55, buyerLng: -46.63 },
  { id: "d5", asset: "Porsche 911 Carrera 4S", category: "Car", city: "Stuttgart", country: "Germany", price: "€124,000", lat: 48.78, lng: 9.18, buyerCity: "Dubai", buyerLat: 25.2, buyerLng: 55.27 },
  { id: "d6", asset: "Picasso Limited Print", category: "Art", city: "London", country: "UK", price: "£42,000", lat: 51.51, lng: -0.13, buyerCity: "Los Angeles", buyerLat: 34.05, buyerLng: -118.24 },
  { id: "d7", asset: "Mid-Century Eames Lounge", category: "Furniture", city: "Copenhagen", country: "Denmark", price: "DKK 38,500", lat: 55.68, lng: 12.57, buyerCity: "Berlin", buyerLat: 52.52, buyerLng: 13.4 },
  { id: "d8", asset: "Vintage Leica M3", category: "Camera", city: "Wetzlar", country: "Germany", price: "€3,200", lat: 50.56, lng: 8.5, buyerCity: "Seoul", buyerLat: 37.57, buyerLng: 126.98 },
  { id: "d9", asset: "1962 Fender Stratocaster", category: "Instrument", city: "Nashville", country: "USA", price: "$22,500", lat: 36.16, lng: -86.78, buyerCity: "Tokyo", buyerLat: 35.68, buyerLng: 139.69 },
  { id: "d10", asset: "Hublot Big Bang Unico", category: "Watch", city: "Milan", country: "Italy", price: "€18,900", lat: 45.46, lng: 9.19, buyerCity: "Riyadh", buyerLat: 24.71, buyerLng: 46.68 },
  { id: "d11", asset: "Gibson Les Paul '59 Reissue", category: "Instrument", city: "Memphis", country: "USA", price: "$8,400", lat: 35.15, lng: -90.05, buyerCity: "Sydney", buyerLat: -33.87, buyerLng: 151.21 },
  { id: "d12", asset: "Penthouse, 2BR, Marina", category: "Property", city: "Dubai", country: "UAE", price: "AED 4.8M", lat: 25.2, lng: 55.27, buyerCity: "London", buyerLat: 51.51, buyerLng: -0.13 },
  { id: "d13", asset: "Tesla Model S Plaid", category: "Car", city: "Amsterdam", country: "Netherlands", price: "€96,000", lat: 52.37, lng: 4.9, buyerCity: "Oslo", buyerLat: 59.91, buyerLng: 10.75 },
  { id: "d14", asset: "Audemars Piguet Royal Oak", category: "Watch", city: "Zurich", country: "Switzerland", price: "CHF 38,900", lat: 47.38, lng: 8.54, buyerCity: "Mumbai", buyerLat: 19.08, buyerLng: 72.88 },
  { id: "d15", asset: "Hermès Kelly 25 Sellier", category: "Handbag", city: "Hong Kong", country: "China", price: "HK$ 198,000", lat: 22.3, lng: 114.17, buyerCity: "Shanghai", buyerLat: 31.23, buyerLng: 121.47 },
];

function GlobeFallback({ height }: { height: number }) {
  return (
    <div
      className="relative w-full flex items-center justify-center overflow-hidden"
      style={{ height }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full bg-gradient-to-br from-accent/30 via-accent/10 to-transparent border border-accent/20"
          style={{ width: height * 0.85, height: height * 0.85 }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full border border-accent/30 animate-pulse"
          style={{ width: height * 0.75, height: height * 0.75 }}
        />
      </div>
      <div className="relative z-10 text-center text-white/60 text-ui-caps">Global markets</div>
    </div>
  );
}

function GlobeInner({ height = 560 }: { height?: number }) {
  const ref = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: height });

  useEffect(() => {
    const onResize = () => {
      setSize({
        w: Math.min(window.innerWidth - 32, 720),
        h: height,
      });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [height]);

  useEffect(() => {
    if (!ref.current) return;
    const g = ref.current;
    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.55;
    g.controls().enableZoom = false;
    g.pointOfView({ lat: 22, lng: 12, altitude: 2.4 }, 0);
  }, []);

  const points = useMemo(
    () =>
      DEALS.map((d) => ({
        ...d,
        size: 0.6,
        color: "rgba(96, 165, 250, 0.9)",
      })),
    [],
  );

  const arcs = useMemo(
    () =>
      DEALS.map((d) => ({
        startLat: d.lat,
        startLng: d.lng,
        endLat: d.buyerLat,
        endLng: d.buyerLng,
        color: ["rgba(96,165,250,0.05)", "rgba(125,211,252,0.85)"],
      })),
    [],
  );

  return (
    <div className="relative w-full flex items-center justify-center" style={{ height }}>
      <GlobeGl
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.22}
        globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.02}
        pointRadius={0.55}
        pointsMerge={false}
        arcsData={arcs}
        arcColor="color"
        arcStroke={0.35}
        arcDashLength={0.35}
        arcDashGap={1.4}
        arcDashAnimateTime={4500}
        arcAltitudeAutoScale={0.35}
        labelsData={points}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => `${d.city}`}
        labelSize={0.7}
        labelDotRadius={0.25}
        labelColor={() => "rgba(186,230,253,0.9)"}
        labelResolution={2}
        animateIn
      />
    </div>
  );
}

export function Globe({ height = 560 }: { height?: number }) {
  return (
    <GlobeErrorBoundary fallback={<GlobeFallback height={height} />}>
      <GlobeInner height={height} />
    </GlobeErrorBoundary>
  );
}
