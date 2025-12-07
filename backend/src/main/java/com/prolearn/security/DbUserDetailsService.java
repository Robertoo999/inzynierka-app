package com.prolearn.security;

import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DbUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public DbUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User u = users.findByEmailIgnoreCase(username)
            .orElseThrow(() -> new UsernameNotFoundException("Nie znaleziono użytkownika: " + username));

        List<GrantedAuthority> auth = List.of(
                new SimpleGrantedAuthority("ROLE_" + u.getRole().name())
        );

        return org.springframework.security.core.userdetails.User
                .withUsername(u.getEmail())
                .password(u.getPasswordHash()) // CZYSTY BCrypt (bez {bcrypt})
                .authorities(auth)
                .accountExpired(false).accountLocked(false)
                .credentialsExpired(false).disabled(false)
                .build();
    }
}
