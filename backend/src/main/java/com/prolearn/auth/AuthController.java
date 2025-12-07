package com.prolearn.auth;

import com.prolearn.auth.dto.AuthResponse;
import com.prolearn.auth.dto.LoginRequest;
import com.prolearn.auth.dto.RegisterRequest;
import com.prolearn.auth.dto.ChangePasswordRequest;
import com.prolearn.security.JwtService;
import com.prolearn.user.Role;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        if (users.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email jest już używany");
        }
        Role role;
        try {
            role = Role.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rola musi być STUDENT albo TEACHER");
        }

        User u = new User();
        u.setEmail(req.getEmail());
        u.setRole(role);
        u.setPasswordHash(encoder.encode(req.getPassword()));
        if (req.getFirstName() != null) u.setFirstName(req.getFirstName());
        if (req.getLastName() != null) u.setLastName(req.getLastName());
        u = users.save(u);

        String token = jwt.generate(u.getId(), u.getEmail(), u.getRole().name());
        return new AuthResponse(token, u.getEmail(), u.getRole().name(), u.getFirstName(), u.getLastName());
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        var u = users.findByEmail(req.getEmail())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nieprawidłowe dane logowania"));

        if (!encoder.matches(req.getPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nieprawidłowe dane logowania");
        }

        String token = jwt.generate(u.getId(), u.getEmail(), u.getRole().name());
        return new AuthResponse(token, u.getEmail(), u.getRole().name(), u.getFirstName(), u.getLastName());
    }

    @PostMapping(value = "/change-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AuthResponse changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        java.util.UUID userId = com.prolearn.security.SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        User u = users.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nie znaleziono użytkownika"));

        if (!encoder.matches(req.getOldPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stare hasło nieprawidłowe");
        }
        if (req.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nowe hasło musi mieć co najmniej 6 znaków");
        }
        u.setPasswordHash(encoder.encode(req.getNewPassword()));
        users.save(u);
        // issue fresh token to reflect password change
        String token = jwt.generate(u.getId(), u.getEmail(), u.getRole().name());
        return new AuthResponse(token, u.getEmail(), u.getRole().name(), u.getFirstName(), u.getLastName());
    }
}

