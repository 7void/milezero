/**
 * Service for fetching real road network navigation geometries (driving routes)
 * via Mapbox Directions API with OSRM and linear fallback.
 */

export interface DrivingRouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  isRealRoadRoute: boolean;
}

const routeCache = new Map<string, DrivingRouteResult>();

export async function fetchDrivingRoute(
  waypoints: [number, number][],
  mapboxToken?: string,
): Promise<DrivingRouteResult> {
  if (!waypoints || waypoints.length < 2) {
    return {
      coordinates: waypoints || [],
      distanceKm: 0,
      durationMinutes: 0,
      isRealRoadRoute: false,
    };
  }

  // Filter and sanitize coordinates [lng, lat]
  const validWaypoints = waypoints.filter(
    (pt) =>
      Array.isArray(pt) &&
      pt.length >= 2 &&
      Number.isFinite(pt[0]) &&
      Number.isFinite(pt[1]),
  );

  if (validWaypoints.length < 2) {
    return {
      coordinates: validWaypoints,
      distanceKm: 0,
      durationMinutes: 0,
      isRealRoadRoute: false,
    };
  }

  const cacheKey = validWaypoints
    .map(([lng, lat]) => `${lng.toFixed(4)},${lat.toFixed(4)}`)
    .join(';');

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  const coordsString = validWaypoints
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(';');

  const token =
    mapboxToken ||
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_MAPBOX_TOKEN) ||
    '';

  // 1. Try Mapbox Directions API
  if (token && token.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const result: DrivingRouteResult = {
            coordinates: route.geometry.coordinates as [number, number][],
            distanceKm: Number((route.distance / 1000).toFixed(2)),
            durationMinutes: Math.round(route.duration / 60),
            isRealRoadRoute: true,
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('Mapbox Directions request failed, falling back:', err);
    }
  }

  // 2. Try Public OSRM Road Router Fallback
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const result: DrivingRouteResult = {
          coordinates: route.geometry.coordinates as [number, number][],
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          durationMinutes: Math.round(route.duration / 60),
          isRealRoadRoute: true,
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('OSRM router request failed:', err);
  }

  // 3. Fallback to direct waypoints
  const fallbackResult: DrivingRouteResult = {
    coordinates: validWaypoints,
    distanceKm: 0,
    durationMinutes: 0,
    isRealRoadRoute: false,
  };
  return fallbackResult;
}
