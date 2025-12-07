package com.prolearn.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;
import java.util.Locale;
import java.util.UUID;

/**
 * Ustawia Authentication z:
 *  - principal: email
 *  - details:  UUID użytkownika (z sub)
 *  - authorities: ["TEACHER","ROLE_TEACHER"] / ["STUDENT","ROLE_STUDENT"]
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        try {
            Claims c = jwtService.parse(token);
            String email = c.get("email", String.class);
            String role = c.get("role", String.class);
            String sub = c.getSubject();

            if (!StringUtils.hasText(email) || !StringUtils.hasText(role) || !StringUtils.hasText(sub)) {
                SecurityContextHolder.clearContext();
                chain.doFilter(request, response);
                return;
            }

            String norm = role.trim().toUpperCase(Locale.ROOT);
            List<GrantedAuthority> auths = List.of(
                    new SimpleGrantedAuthority(norm),
                    new SimpleGrantedAuthority("ROLE_" + norm)
            );

            UUID userId = null;
            try { userId = UUID.fromString(sub); } catch (Exception ignored) {}

            var auth = new JwtAuthenticationToken(email, auths, userId);
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
        }

        chain.doFilter(request, response);
    }

    private static class JwtAuthenticationToken extends AbstractAuthenticationToken {
        private final String principalEmail;
        private final UUID userId;

        JwtAuthenticationToken(String principalEmail, List<GrantedAuthority> authorities, UUID userId) {
            super(authorities);
            this.principalEmail = principalEmail;
            this.userId = userId;
            setAuthenticated(true);
        }

        @Override public Object getCredentials() { return ""; }
        @Override public Object getPrincipal() { return principalEmail; }
        @Override public Object getDetails() { return userId; }
    }
}
