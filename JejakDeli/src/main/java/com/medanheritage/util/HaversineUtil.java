package com.medanheritage.util;

/**
 * Utilitas untuk menghitung jarak antar dua koordinat GPS
 * menggunakan Formula Haversine.
 */
public class HaversineUtil {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    /**
     * Menghitung jarak dalam meter antara dua koordinat GPS.
     *
     * Formula Haversine:
     *   a = sin²(ΔLat/2) + cos(lat1)·cos(lat2)·sin²(ΔLon/2)
     *   c = 2·atan2(√a, √(1−a))
     *   d = R·c
     *
     * @param lat1 Latitude titik asal (derajat)
     * @param lon1 Longitude titik asal (derajat)
     * @param lat2 Latitude titik tujuan (derajat)
     * @param lon2 Longitude titik tujuan (derajat)
     * @return Jarak dalam meter
     */
    public static double calculateDistance(double lat1, double lon1,
                                           double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }
}
