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
            createIfMissing("teacher@test.local", "teacherpass", Role.TEACHER);
            createIfMissing("student@test.local", "studentpass", Role.STUDENT);
        } catch (Exception e) {
            // swallow errors during startup seeding to avoid breaking startup in unusual envs
            System.err.println("DevUserSeeder failed: " + e.getMessage());
        }
    }

    private void createIfMissing(String email, String rawPassword, Role role) {
        if (users.existsByEmail(email)) return;
        User u = new User();
        u.setEmail(email);
        u.setRole(role);
        u.setPasswordHash(encoder.encode(rawPassword));
        users.save(u);
        System.out.println("Created dev user: " + email + " (role=" + role + ")");
    }
}
