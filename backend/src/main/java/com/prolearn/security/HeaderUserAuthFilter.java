// src/main/java/com/prolearn/security/HeaderUserAuthFilter.java
package com.prolearn.security;

import com.prolearn.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class HeaderUserAuthFilter extends OncePerRequestFilter {
    private final UserRepository users;

    public HeaderUserAuthFilter(UserRepository users) { this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String header = req.getHeader("X-User-Id");
            if (header != null && !header.isBlank()) {
                try {
                    UUID id = UUID.fromString(header);
                    var user = users.findById(id).orElse(null);
                    if (user != null) {
                        var auth = new UsernamePasswordAuthenticationToken(
                                user.getEmail(),
                                "N/A",
                                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())) // np. ROLE_TEACHER
                        );
                        // Zostawiamy Twój obecny sposób – ID w details:
                        auth.setDetails(id);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                } catch (IllegalArgumentException ignored) {}
            }
        }
        chain.doFilter(req, res);
    }
}
