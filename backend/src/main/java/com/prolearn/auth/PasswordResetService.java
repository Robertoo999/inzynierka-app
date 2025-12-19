package com.prolearn.auth;

import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {
    private final PasswordResetTokenRepository tokens;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final Environment env;
    private final SecureRandom rng = new SecureRandom();

    public PasswordResetService(PasswordResetTokenRepository tokens, UserRepository users, PasswordEncoder encoder, Environment env) {
        this.tokens = tokens;
        this.users = users;
        this.encoder = encoder;
        this.env = env;
    }

    public Optional<String> createTokenForEmail(String email) {
        Optional<User> uOpt = users.findByEmail(email);
        if (uOpt.isEmpty()) return Optional.empty();
        User u = uOpt.get();
        // create raw token
        byte[] b = new byte[32]; rng.nextBytes(b);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(b);

        PasswordResetToken t = new PasswordResetToken();
        t.setId(UUID.randomUUID());
        t.setUser(u);
        t.setTokenHash(encoder.encode(raw));
        t.setExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
        tokens.save(t);

        // dev-mode: log the link
        String[] active = env.getActiveProfiles();
        for (String p : active) if ("dev".equals(p)) {
            System.out.println("Password reset link (dev): http://localhost:5173/reset-password?token=" + raw);
            break;
        }

        return Optional.of(raw);
    }

    public Optional<User> consumeIfValid(String rawToken) {
        List<PasswordResetToken> candidates = tokens.findAllByUsedFalseAndExpiresAtAfter(Instant.now());
        for (PasswordResetToken c : candidates) {
            if (encoder.matches(rawToken, c.getTokenHash())) {
                // mark used
                c.setUsed(true);
                tokens.save(c);
                return Optional.of(c.getUser());
            }
        }
        return Optional.empty();
    }
}
