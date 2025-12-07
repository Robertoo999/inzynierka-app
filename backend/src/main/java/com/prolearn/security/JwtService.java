package com.prolearn.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * Stabilny klucz: SHA-256 z surowego sekretu (bez Base64); podpis HS256.
 * Unikamy błędu "Illegal base64 character".
 */
@Service
public class JwtService {

    private final Key signingKey;
    private final long expiresMinutes;

    public JwtService(@Value("${app.jwt.secret:dev-secret-prolearn}") String secret,
                      @Value("${app.jwt.expires-minutes:1440}") long expiresMinutes) {
        try {
            byte[] material = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            this.signingKey = Keys.hmacShaKeyFor(material);
        } catch (Exception e) {
            throw new IllegalStateException("Nie udało się zainicjalizować klucza JWT", e);
        }
        this.expiresMinutes = expiresMinutes;
    }

    public String generate(UUID userId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expiresMinutes * 60)))
                .addClaims(Map.of("email", email, "role", role))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
