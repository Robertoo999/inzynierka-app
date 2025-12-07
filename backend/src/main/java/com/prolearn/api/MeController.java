package com.prolearn.api;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class MeController {

    @GetMapping(value = "/api/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return Map.of("authenticated", false);
        }
        String email = (String) auth.getPrincipal();
        String role = auth.getAuthorities().stream().findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");
        UUID userId = (UUID) auth.getDetails();
        return Map.of(
                "authenticated", true,
                "userId", userId.toString(),
                "email", email,
                "role", role
        );
    }
}
