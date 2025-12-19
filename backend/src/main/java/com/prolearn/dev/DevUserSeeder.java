package com.prolearn.dev;

import com.prolearn.user.Role;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Simple dev-only seeder: creates two test accounts (teacher + student) on startup if they don't exist.
 * Passwords are stored using the application's PasswordEncoder.
 */
@Component
public class DevUserSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public DevUserSeeder(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            upsertUser("teacher@test.local", "Test123!", Role.TEACHER);
            upsertUser("student@test.local", "Test123!", Role.STUDENT);
        } catch (Exception e) {
            // swallow errors during startup seeding to avoid breaking startup in unusual envs
            System.err.println("DevUserSeeder failed: " + e.getMessage());
        }
    }

    /**
     * Create or update the test user. This method is idempotent and will ensure the
     * account exists and its password/role match the expected test values.
     */
    private void upsertUser(String email, String rawPassword, Role role) {
        users.findByEmail(email).ifPresentOrElse(u -> {
            u.setPasswordHash(encoder.encode(rawPassword));
            u.setRole(role);
            users.save(u);
            System.out.println("Updated dev user password/role: " + email + " (role=" + role + ")");
        }, () -> {
            User u = new User();
            u.setEmail(email);
            u.setRole(role);
            u.setPasswordHash(encoder.encode(rawPassword));
            users.save(u);
            System.out.println("Created dev user: " + email + " (role=" + role + ")");
        });
    }
}
