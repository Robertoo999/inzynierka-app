package com.prolearn.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @Value("${app.name:prolearn-backend}")
    private String serviceName;

    @Value("${app.version:unknown}")
    private String version;

    @GetMapping(value = "/api/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", serviceName,
                "version", version
        );
    }
}
