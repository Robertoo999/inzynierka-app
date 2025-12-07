package com.prolearn.debug;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class DebugAuthController {
    @GetMapping(value = "/api/debug/auth", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> me(Authentication auth) {
        if (auth == null) return Map.of("authenticated", false);
        List<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .sorted().toList();
        return Map.of(
                "authenticated", auth.isAuthenticated(),
                "principal", String.valueOf(auth.getPrincipal()),
                "details", String.valueOf(auth.getDetails()),
                "authorities", authorities
        );
    }
}
