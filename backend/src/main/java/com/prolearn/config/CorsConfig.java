// src/main/java/com/prolearn/config/CorsConfig.java
package com.prolearn.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var c = new CorsConfiguration();
        // Allow origins based on environment variable CORS_ORIGIN (comma-separated).
        // If not set, fall back to permissive pattern for local development.
        String env = System.getenv("CORS_ORIGIN");
        if (env != null && !env.isBlank()) {
            var list = java.util.Arrays.stream(env.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
            c.setAllowedOrigins(list);
        } else {
            // During local development allow any origin pattern so frontend dev server
            // (Vite) can call backend on any localhost port. In production this should
            // be restricted; allowedOriginPatterns allows wildcarding per-spec.
            c.setAllowedOriginPatterns(List.of("*"));
        }
        c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization","Content-Type","Accept","X-Requested-With"));
        c.setExposedHeaders(List.of("Authorization","Content-Type"));
    c.setAllowCredentials(false); // używamy Bearer, nie cookies

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
}
