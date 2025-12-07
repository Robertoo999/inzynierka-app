// src/main/java/com/prolearn/security/SecurityConfig.java
package com.prolearn.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity(jsr250Enabled = true, prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {

    private final JwtService jwtService;

    public SecurityConfig(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           HeaderUserAuthFilter headerUserAuthFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(reg -> reg
                        // preflight/CORS i ogólne
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // health & swagger
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()

                        // auth
                        .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()

                        // lessons (GET publicznie)
                        .requestMatchers(HttpMethod.GET, "/api/lessons/**").permitAll()

                        // tasks
                        .requestMatchers(HttpMethod.GET, "/api/tasks/*/teacher").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/tasks/*").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/tasks/*").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.DELETE, "/api/tasks/*").hasRole("TEACHER")

                        // submissions
                        .requestMatchers(HttpMethod.GET, "/api/tasks/*/submissions").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/tasks/*/submissions/me").hasAnyRole("STUDENT","TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/my/submissions").hasAnyRole("STUDENT","TEACHER")
                        .requestMatchers(HttpMethod.POST, "/api/tasks/*/submissions").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.POST, "/api/submissions/*/grade").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/submissions/*").authenticated()

                        // classes & lessons in class
                        .requestMatchers(HttpMethod.GET, "/api/classes/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/classes").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.POST, "/api/classes/join").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.GET, "/api/classes/*/lessons/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/classes/*/lessons").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.PATCH, "/api/classes/*/lessons/*").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.DELETE, "/api/classes/*/lessons/*").hasRole("TEACHER")

                        // activities
                        .requestMatchers(HttpMethod.POST, "/api/lessons/*/activities").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.PATCH, "/api/activities/*").hasRole("TEACHER")
                        .requestMatchers(HttpMethod.DELETE, "/api/activities/*").hasRole("TEACHER")

                        // debug
                        .requestMatchers("/api/debug/auth").authenticated()

                        // reszta wymaga auth
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"Nieautoryzowany\",\"detail\":\"Wymagane uwierzytelnienie\"}");
                        })
                        .accessDeniedHandler((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"Zabronione\",\"detail\":\"Brak dostępu\"}");
                        })
                )

                // Kolejność filtrów: debug -> dev header -> JWT -> UsernamePasswordAuthenticationFilter
                .addFilterBefore(new RequestDebugFilter(), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(headerUserAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
