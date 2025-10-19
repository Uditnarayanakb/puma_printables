package com.pumaprintables.platform.service;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;
import com.pumaprintables.platform.security.JwtService;
import com.pumaprintables.platform.service.exception.UserAlreadyExistsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public String authenticate(String username, String rawPassword) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, rawPassword));

        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));

        Map<String, Object> claims = Map.of("role", user.getRole().name());
        return jwtService.generateToken(user.getUsername(), claims);
    }

    @Transactional
    public User register(String username, String password, String email, UserRole role) {
        userRepository.findByUsername(username)
            .ifPresent(existing -> {
                throw new UserAlreadyExistsException(username);
            });

        User user = User.builder()
            .username(username)
            .password(passwordEncoder.encode(password))
            .email(email)
            .role(role)
            .build();
        return userRepository.save(user);
    }
}
